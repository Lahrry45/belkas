import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { CartLine, CartProduct } from "../types";
import { addLine, keyOf, lineKey, removeLine, setLineQuantity } from "./logic";

interface CartRow {
  id?: string;
  product_id?: string;
  size?: string;
  quantity?: number;
}
interface RemoteChange {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: CartRow;
  old: CartRow;
}

/** Minimal async key/value storage: window.localStorage or AsyncStorage both fit. */
export interface KeyValueStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface CartState {
  lines: CartLine[];
  userId: string | null;
  /** true until the first load for the current user/guest finishes */
  loading: boolean;
  error: string | null;
}

const GUEST_KEY = "belkas.guest-cart.v1";
const SELECT = "id, product_id, size, quantity, product:products(id, slug, name, price_naira, images, stock, sizes_available)";

/**
 * One cart for the whole app.
 *  - Signed in: rows live in public.cart_items; Realtime keeps every device in sync.
 *  - Guest: lines live in local storage and are merged into the account on sign-in.
 * All mutations are optimistic and roll back if the database rejects them.
 */
export class CartStore {
  private state: CartState = { lines: [], userId: null, loading: true, error: null };
  private listeners = new Set<() => void>();
  private channel: RealtimeChannel | null = null;
  private pending = 0;
  private staleWhilePending = false;
  private generation = 0;

  constructor(private sb: SupabaseClient, private storage: KeyValueStorage) {}

  // ----- subscription (useSyncExternalStore-compatible) -----
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.state;

  private set(patch: Partial<CartState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  // ----- identity -----
  /** Call on startup and whenever the auth user changes. */
  async setUser(userId: string | null) {
    if (userId === this.state.userId && !this.state.loading) return;
    const gen = ++this.generation;
    this.teardown();
    this.set({ userId, loading: true, error: null, lines: userId ? [] : this.state.lines });

    if (!userId) {
      const guest = await this.readGuest();
      if (gen === this.generation) this.set({ lines: guest, loading: false });
      return;
    }

    // Merge whatever the guest had into the account cart, then forget the local copy.
    const guest = await this.readGuest();
    if (guest.length > 0) {
      const { error } = await this.sb.rpc("merge_guest_cart", {
        p_items: guest.map((l) => ({ product_id: l.product_id, size: l.size, quantity: l.quantity })),
      });
      if (!error) await this.storage.removeItem(GUEST_KEY);
    }
    if (gen !== this.generation) return;

    this.channel = this.sb
      .channel(`cart:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${userId}` },
        (payload) => this.onRemoteChange(payload as unknown as RemoteChange),
      )
      .subscribe((status) => {
        // Covers changes made while the socket was down (app in background, flaky network).
        if (status === "SUBSCRIBED") void this.refresh();
      });
    await this.refresh();
  }

  /** Re-read the cart from the database (also call when the app returns to the foreground). */
  async refresh() {
    const userId = this.state.userId;
    if (!userId) return;
    const gen = this.generation;
    const { data, error } = await this.sb
      .from("cart_items")
      .select(SELECT)
      .eq("user_id", userId)
      .order("updated_at", { ascending: true });
    if (gen !== this.generation) return;
    if (this.pending > 0) {
      // A local write is in flight; its own result will trigger another refresh.
      this.staleWhilePending = true;
      return;
    }
    if (error) return this.set({ loading: false, error: error.message });
    const lines = ((data ?? []) as unknown as CartLine[]).filter((l) => l.product);
    // Keep any error from a rolled-back write visible; the UI dismisses it with clearError().
    this.set({ lines, loading: false });
  }

  /**
   * Apply a Realtime change straight away (no extra round trip), then confirm with a refresh.
   * Inserts for products we have never seen need product details, so those just refresh.
   */
  private onRemoteChange(change: RemoteChange) {
    if (this.pending > 0) {
      this.staleWhilePending = true;
      return;
    }
    if (change.eventType === "DELETE") {
      // With RLS on, Realtime only sends the primary key of a deleted row, so match on id.
      const old = change.old ?? {};
      const line = this.state.lines.find(
        (l) => (old.id && l.id === old.id) || (old.product_id && old.size && keyOf(l) === lineKey(old.product_id, old.size)),
      );
      if (line) this.set({ lines: removeLine(this.state.lines, keyOf(line)) });
      this.scheduleRefresh();
      return;
    }
    const row = change.new;
    if (row?.product_id && row.size) {
      const key = lineKey(row.product_id, row.size);
      const exists = this.state.lines.some((l) => keyOf(l) === key);
      if (exists && typeof row.quantity === "number") {
        this.set({
          lines: setLineQuantity(this.state.lines, key, row.quantity).map((l) => (keyOf(l) === key && row.id ? { ...l, id: row.id } : l)),
        });
      } else {
        const product = this.knownProduct(row.product_id);
        if (product && typeof row.quantity === "number") {
          this.set({ lines: [...this.state.lines, { id: row.id, product_id: row.product_id, size: row.size, quantity: row.quantity, product }] });
        }
      }
    }
    this.scheduleRefresh();
  }

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  /** Debounced consistency check after remote changes. */
  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 400);
  }

  private products = new Map<string, CartProduct>();
  private knownProduct(id: string) {
    return this.products.get(id) ?? this.state.lines.find((l) => l.product_id === id)?.product;
  }
  /** Let the store know about products on screen so remote inserts render instantly. */
  rememberProducts(list: CartProduct[]) {
    for (const p of list) this.products.set(p.id, p);
  }

  // ----- mutations -----
  add(product: CartProduct, size: string, quantity = 1) {
    this.products.set(product.id, product);
    return this.mutate(addLine(this.state.lines, product, size, quantity), async () =>
      this.sb.rpc("add_to_cart", { p_product_id: product.id, p_size: size, p_quantity: quantity }),
    );
  }

  setQuantity(key: string, quantity: number) {
    const line = this.state.lines.find((l) => keyOf(l) === key);
    if (!line) return Promise.resolve();
    if (quantity <= 0) return this.remove(key);
    return this.mutate(setLineQuantity(this.state.lines, key, quantity), async () =>
      this.sb
        .from("cart_items")
        .update({ quantity })
        .eq("user_id", this.state.userId!)
        .eq("product_id", line.product_id)
        .eq("size", line.size),
    );
  }

  remove(key: string) {
    const line = this.state.lines.find((l) => keyOf(l) === key);
    if (!line) return Promise.resolve();
    return this.mutate(removeLine(this.state.lines, key), async () =>
      this.sb
        .from("cart_items")
        .delete()
        .eq("user_id", this.state.userId!)
        .eq("product_id", line.product_id)
        .eq("size", line.size),
    );
  }

  /** Local-only clear (e.g. after an order on a guest device). Signed-in carts are cleared by the server. */
  async clearLocal() {
    this.set({ lines: [] });
    if (!this.state.userId) await this.storage.removeItem(GUEST_KEY);
  }

  clearError() {
    this.set({ error: null });
  }

  private async mutate(next: CartLine[], remote: () => PromiseLike<{ error: { message: string } | null }>) {
    const prev = this.state.lines;
    this.set({ lines: next, error: null });

    if (!this.state.userId) {
      await this.storage.setItem(GUEST_KEY, JSON.stringify(next));
      return;
    }

    this.pending++;
    let failed: string | null = null;
    try {
      const { error } = await remote();
      if (error) failed = error.message;
    } catch (e) {
      failed = e instanceof Error ? e.message : "Network error";
    } finally {
      this.pending--;
    }

    if (failed) {
      // Roll back the optimistic change, then resync from the server.
      this.set({ lines: prev, error: failed });
      this.staleWhilePending = true;
    }
    if (this.pending === 0 && this.staleWhilePending) {
      this.staleWhilePending = false;
      await this.refresh();
    }
  }

  // ----- guest storage -----
  private async readGuest(): Promise<CartLine[]> {
    try {
      const raw = await this.storage.getItem(GUEST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private teardown() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    if (this.channel) {
      void this.sb.removeChannel(this.channel);
      this.channel = null;
    }
    this.pending = 0;
    this.staleWhilePending = false;
  }

  dispose() {
    this.generation++;
    this.teardown();
    this.listeners.clear();
  }
}
