"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { formatNaira } from "@belkas/shared";
import { useApp, useCart } from "./Providers";
import { CartLines } from "./CartLines";
import { CloseIcon } from "./icons";

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, user } = useApp();
  const { lines, count, loading } = useCart();
  const path = usePathname();
  const subtotal = lines.reduce((s, l) => s + l.product.price_naira * l.quantity, 0);
  const close = () => setDrawerOpen(false);

  useEffect(() => close(), [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
      <div onClick={close} className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`} />
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <p className="font-display text-2xl">
            Your cart <span className="font-sans text-sm text-muted">({count})</span>
          </p>
          <button className="icon-btn" aria-label="Close cart" onClick={close}>
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="space-y-5 py-5">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton h-28 w-24" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : lines.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-3xl">Your cart is empty</p>
              <p className="mt-2 text-sm text-muted">Find something you&apos;ll wear on repeat.</p>
              <Link href="/shop" className="btn-primary mt-8">
                Shop the collection
              </Link>
            </div>
          ) : (
            <CartLines lines={lines} onNavigate={close} />
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-line p-5">
            <div className="flex justify-between text-[15px]">
              <span>Subtotal</span>
              <span className="font-medium">{formatNaira(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">Delivery calculated at checkout.</p>
            <Link href={user ? "/checkout" : "/login?next=/checkout"} className="btn-accent mt-4 w-full">
              Checkout
            </Link>
            {!user && <p className="mt-3 text-center text-xs text-muted">Sign in at checkout. Your cart comes with you.</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
