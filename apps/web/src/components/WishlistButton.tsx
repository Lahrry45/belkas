"use client";

import { fetchWishlistIds, toggleWishlist } from "@belkas/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { HeartIcon } from "./icons";
import { useApp } from "./Providers";

// Tiny shared store so every heart on the page agrees.
let ids = new Set<string>();
let loadedFor: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => (subs.add(f), () => subs.delete(f));

export function WishlistButton({ productId, compact = false }: { productId: string; compact?: boolean }) {
  const { user } = useApp();
  const router = useRouter();
  const sb = supabaseBrowser();
  const set = useSyncExternalStore(subscribe, () => ids, () => ids);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      ids = new Set();
      loadedFor = null;
      emit();
      return;
    }
    if (loadedFor === user.id) return;
    loadedFor = user.id;
    fetchWishlistIds(sb).then((list) => {
      ids = new Set(list);
      emit();
    });
  }, [user, sb]);

  const on = set.has(productId);
  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    setBusy(true);
    const prev = ids;
    const next = new Set(ids);
    if (on) next.delete(productId);
    else next.add(productId);
    ids = next;
    emit();
    try {
      await toggleWishlist(sb, productId, !on);
      if (!on) toast("Saved to your wishlist");
    } catch {
      ids = prev;
      emit();
      toast("Couldn't update your wishlist", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
      className={
        compact
          ? "grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur transition hover:bg-white"
          : "btn-outline w-full"
      }
    >
      <HeartIcon filled={on} className={`h-[18px] w-[18px] ${on ? "text-accent" : ""}`} />
      {!compact && (on ? "Saved" : "Save to wishlist")}
    </button>
  );
}
