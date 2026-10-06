import { describe, expect, it, vi } from "vitest";
import { addLine, cartCount, lineKey, mergeLines, removeLine, setLineQuantity, MAX_QTY } from "../src/cart/logic";
import { CartStore, type KeyValueStorage } from "../src/cart/store";
import type { CartLine, CartProduct } from "../src/types";

const shoe = (id: string, price = 25000): CartProduct => ({
  id, slug: id, name: id, price_naira: price, images: [], stock: 10, sizes_available: ["40", "41", "42"],
});

describe("cart logic", () => {
  it("adds a new line and increments an existing line of the same size", () => {
    let lines: CartLine[] = [];
    lines = addLine(lines, shoe("a"), "41");
    lines = addLine(lines, shoe("a"), "41", 2);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it("keeps different sizes of the same product as separate lines", () => {
    const lines = addLine(addLine([], shoe("a"), "41"), shoe("a"), "42");
    expect(lines.map((l) => l.size)).toEqual(["41", "42"]);
  });

  it("caps quantity at MAX_QTY", () => {
    const lines = addLine(addLine([], shoe("a"), "41", MAX_QTY), shoe("a"), "41", 5);
    expect(lines[0].quantity).toBe(MAX_QTY);
  });

  it("sets quantity, and removes the line at 0", () => {
    const lines = addLine([], shoe("a"), "41");
    expect(setLineQuantity(lines, lineKey("a", "41"), 4)[0].quantity).toBe(4);
    expect(setLineQuantity(lines, lineKey("a", "41"), 0)).toEqual([]);
  });

  it("removes only the matching line", () => {
    const lines = addLine(addLine([], shoe("a"), "41"), shoe("b"), "41");
    expect(removeLine(lines, lineKey("a", "41")).map((l) => l.product_id)).toEqual(["b"]);
  });

  it("does not mutate the input array", () => {
    const lines = addLine([], shoe("a"), "41");
    const copy = structuredClone(lines);
    addLine(lines, shoe("a"), "41");
    setLineQuantity(lines, lineKey("a", "41"), 9);
    removeLine(lines, lineKey("a", "41"));
    expect(lines).toEqual(copy);
  });

  it("merges a guest cart into an account cart by adding quantities", () => {
    const account = addLine([], shoe("a"), "41", 1);
    const guest = addLine(addLine([], shoe("a"), "41", 2), shoe("b"), "40", 1);
    const merged = mergeLines(account, guest);
    expect(merged.find((l) => l.product_id === "a")!.quantity).toBe(3);
    expect(merged.find((l) => l.product_id === "b")!.quantity).toBe(1);
    expect(cartCount(merged)).toBe(4);
  });
});

// ---------- CartStore with a fake Supabase client ----------
function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function fakeSupabase(opts: { rows?: CartLine[]; failWrites?: boolean } = {}) {
  let rows = opts.rows ?? [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (opts.failWrites) return { error: { message: "boom" } };
    if (name === "add_to_cart") {
      rows = addLine(rows, shoe(args.p_product_id as string), args.p_size as string, args.p_quantity as number);
    }
    if (name === "merge_guest_cart") {
      for (const it of args.p_items as { product_id: string; size: string; quantity: number }[]) {
        rows = addLine(rows, shoe(it.product_id), it.size, it.quantity);
      }
    }
    return { error: null };
  });
  const builder = () => {
    const b: Record<string, unknown> = {};
    const chain = () => b;
    Object.assign(b, {
      select: chain, eq: chain, order: async () => ({ data: rows, error: null }),
      update: chain, delete: chain,
      then: (res: (v: unknown) => void) => res(opts.failWrites ? { error: { message: "boom" } } : { error: null }),
    });
    return b;
  };
  let handler: ((p: unknown) => void) | null = null;
  const channel = {
    on: (_t: string, _f: unknown, cb: (p: unknown) => void) => ((handler = cb), channel),
    subscribe: () => channel,
  };
  return {
    rpc,
    from: vi.fn(builder),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
    get rows() { return rows; },
    set rows(v: CartLine[]) { rows = v; },
    emit: (p: unknown) => handler?.(p),
  };
}

describe("CartStore", () => {
  it("keeps a guest cart in local storage", async () => {
    const storage = memoryStorage();
    const store = new CartStore(fakeSupabase() as never, storage);
    await store.setUser(null);
    await store.add(shoe("a"), "41", 2);
    expect(store.getSnapshot().lines[0].quantity).toBe(2);
    expect(JSON.parse(storage.getItem("belkas.guest-cart.v1") as string)).toHaveLength(1);
  });

  it("merges the guest cart into the account on sign-in and clears local storage", async () => {
    const storage = memoryStorage();
    const sb = fakeSupabase({ rows: addLine([], shoe("a"), "41", 1) });
    const store = new CartStore(sb as never, storage);
    await store.setUser(null);
    await store.add(shoe("a"), "41", 2);
    await store.add(shoe("b"), "40", 1);

    await store.setUser("user-1");

    expect(sb.rpc).toHaveBeenCalledWith("merge_guest_cart", expect.anything());
    expect(storage.getItem("belkas.guest-cart.v1")).toBeNull();
    const lines = store.getSnapshot().lines;
    expect(lines.find((l) => l.product_id === "a")!.quantity).toBe(3);
    expect(lines.find((l) => l.product_id === "b")!.quantity).toBe(1);
  });

  it("applies changes optimistically before the server responds", async () => {
    const sb = fakeSupabase();
    const store = new CartStore(sb as never, memoryStorage());
    await store.setUser("user-1");
    const p = store.add(shoe("a"), "41");
    expect(store.getSnapshot().lines).toHaveLength(1); // visible immediately
    await p;
    expect(sb.rows).toHaveLength(1);
  });

  it("rolls back and reports an error when the server rejects a change", async () => {
    const start = addLine([], shoe("a"), "41", 2);
    const sb = fakeSupabase({ rows: start, failWrites: true });
    const store = new CartStore(sb as never, memoryStorage());
    await store.setUser("user-1");
    await store.setQuantity(lineKey("a", "41"), 5);
    expect(store.getSnapshot().lines[0].quantity).toBe(2);
    expect(store.getSnapshot().error).toBe("boom");
  });

  it("applies remote changes from another device immediately", async () => {
    const sb = fakeSupabase({ rows: addLine([], shoe("a"), "41", 1) });
    const store = new CartStore(sb as never, memoryStorage());
    await store.setUser("user-1");
    store.rememberProducts([shoe("b")]);

    sb.emit({ eventType: "UPDATE", new: { product_id: "a", size: "41", quantity: 4 }, old: {} });
    expect(store.getSnapshot().lines[0].quantity).toBe(4);

    sb.emit({ eventType: "INSERT", new: { product_id: "b", size: "40", quantity: 2 }, old: {} });
    expect(store.getSnapshot().lines.map((l) => l.product_id)).toEqual(["a", "b"]);

    sb.emit({ eventType: "DELETE", new: {}, old: { product_id: "a", size: "41" } });
    expect(store.getSnapshot().lines.map((l) => l.product_id)).toEqual(["b"]);

    // Real Supabase (RLS on) sends only the primary key for deletes.
    sb.emit({ eventType: "UPDATE", new: { id: "row-b", product_id: "b", size: "40", quantity: 2 }, old: {} });
    sb.emit({ eventType: "DELETE", new: {}, old: { id: "row-b" } });
    expect(store.getSnapshot().lines).toEqual([]);
    store.dispose();
  });
});
