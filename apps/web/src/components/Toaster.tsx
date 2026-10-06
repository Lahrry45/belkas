"use client";

import { useEffect, useState } from "react";
import { useCart } from "./Providers";
import type { ToastKind } from "@/lib/toast";

interface Item { id: number; message: string; kind: ToastKind }

export function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  const { store } = useCart();

  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { id, message, kind }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3500);
    };
    window.addEventListener("belkas:toast", onToast);
    return () => window.removeEventListener("belkas:toast", onToast);
  }, []);

  // Surface cart sync failures (the change has already been rolled back).
  useEffect(
    () =>
      store.subscribe(() => {
        const error = store.getSnapshot().error;
        if (!error) return;
        const id = Date.now();
        setItems((xs) => [...xs, { id, message: `Couldn't update your cart: ${error}`, kind: "error" }]);
        store.clearError();
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4500);
      }),
    [store],
  );

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-md px-5 py-3 text-sm shadow-lg ${
            t.kind === "error" ? "bg-accent text-white" : "bg-ink text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
