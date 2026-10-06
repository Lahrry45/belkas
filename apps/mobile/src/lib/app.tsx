import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { CartStore, cartCount, fetchProducts, fetchWishlistIds, sendWelcomeIfNew, toggleWishlist, type CartState } from "@belkas/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";

interface Ctx {
  session: Session | null;
  ready: boolean;
  cart: CartStore;
  wishlist: Set<string>;
  toggleWish: (productId: string) => Promise<void>;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  // Wishlist ids, tagged with the user they belong to so a sign-out never shows stale hearts.
  const [wish, setWish] = useState<{ uid: string | null; ids: Set<string> }>({ uid: null, ids: new Set() });
  const cart = useMemo(() => new CartStore(supabase, AsyncStorage), []);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setReady(true);
      setTimeout(() => {
        void cart.setUser(s?.user.id ?? null);
        if (event === "SIGNED_IN" && s) void sendWelcomeIfNew(supabase);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [cart]);

  // Preload the (small) catalogue so items added on the website render instantly here.
  useEffect(() => {
    fetchProducts(supabase).then((ps) => cart.rememberProducts(ps)).catch(() => {});
  }, [cart]);

  // Catch up on anything that changed while the app was in the background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && void cart.refresh());
    return () => sub.remove();
  }, [cart]);

  useEffect(() => {
    if (!userId) return;
    fetchWishlistIds(supabase)
      .then((ids) => setWish({ uid: userId, ids: new Set(ids) }))
      .catch(() => {});
  }, [userId]);
  const wishlist = useMemo(() => (wish.uid === userId ? wish.ids : new Set<string>()), [wish, userId]);

  const toggleWish = useCallback(
    async (productId: string) => {
      const on = !wishlist.has(productId);
      const prev = wishlist;
      const next = new Set(wishlist);
      if (on) next.add(productId);
      else next.delete(productId);
      setWish({ uid: userId, ids: next });
      try {
        await toggleWishlist(supabase, productId, on);
      } catch {
        setWish({ uid: userId, ids: prev });
      }
    },
    [wishlist, userId],
  );

  return <AppContext.Provider value={{ session, ready, cart, wishlist, toggleWish }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}

export function useCart() {
  const { cart } = useApp();
  const state: CartState = useSyncExternalStore(cart.subscribe, cart.getSnapshot);
  return { ...state, count: cartCount(state.lines), store: cart };
}
