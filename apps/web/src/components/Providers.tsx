"use client";

import type { User } from "@supabase/supabase-js";
import { CartStore, type CartState, cartCount } from "@belkas/shared";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchProducts, sendWelcomeIfNew } from "@belkas/shared";

interface Ctx {
  user: User | null;
  authReady: boolean;
  cart: CartStore;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const AppContext = createContext<Ctx | null>(null);

const browserStorage = {
  getItem: (k: string) => (typeof window === "undefined" ? null : window.localStorage.getItem(k)),
  setItem: (k: string, v: string) => window.localStorage.setItem(k, v),
  removeItem: (k: string) => window.localStorage.removeItem(k),
};

export function Providers({ initialUser, children }: { initialUser: User | null; children: React.ReactNode }) {
  const sb = supabaseBrowser();
  const [user, setUser] = useState<User | null>(initialUser);
  const [authReady, setAuthReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cart = useMemo(() => new CartStore(sb, browserStorage), [sb]);

  useEffect(() => {
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      const next = session?.user ?? null;
      setUser(next);
      setAuthReady(true);
      // Defer out of the auth callback (supabase-js deadlocks if we await other calls inside it).
      setTimeout(() => {
        void cart.setUser(next?.id ?? null);
        if (event === "SIGNED_IN" && next) void sendWelcomeIfNew(sb);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [sb, cart]);

  // Dev-only debugging handle (stripped from production behaviour).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __belkas: unknown }).__belkas = { sb, cart };
  }, [sb, cart]);

  // Small catalogue: preload it so items added on another device render instantly.
  useEffect(() => {
    fetchProducts(sb).then((ps) => cart.rememberProducts(ps)).catch(() => {});
  }, [sb, cart]);

  // Catch up on changes missed while the tab was hidden or offline.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void cart.refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [cart]);

  return (
    <AppContext.Provider value={{ user, authReady, cart, drawerOpen, setDrawerOpen }}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}

const EMPTY: CartState = { lines: [], userId: null, loading: true, error: null };

export function useCart() {
  const { cart } = useApp();
  const state = useSyncExternalStore(cart.subscribe, cart.getSnapshot, () => EMPTY);
  return { ...state, count: cartCount(state.lines), store: cart };
}
