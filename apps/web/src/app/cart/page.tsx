"use client";

import Link from "next/link";
import { formatNaira } from "@belkas/shared";
import { CartLines } from "@/components/CartLines";
import { useApp, useCart } from "@/components/Providers";

export default function CartPage() {
  const { lines, loading, count } = useCart();
  const { user } = useApp();
  const subtotal = lines.reduce((s, l) => s + l.product.price_naira * l.quantity, 0);

  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="font-display text-5xl">Your cart</h1>
      <p className="mt-2 text-sm text-muted">{count} {count === 1 ? "item" : "items"}</p>
      {loading ? (
        <div className="skeleton mt-8 h-40" />
      ) : lines.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-3xl">Nothing here yet</p>
          <Link href="/shop" className="btn-primary mt-6">Shop the collection</Link>
        </div>
      ) : (
        <>
          <div className="mt-6"><CartLines lines={lines} /></div>
          <div className="mt-6 border-t border-line pt-6">
            <div className="flex justify-between text-lg"><span>Subtotal</span><span>{formatNaira(subtotal)}</span></div>
            <Link href={user ? "/checkout" : "/login?next=/checkout"} className="btn-accent mt-6 w-full">Checkout</Link>
          </div>
        </>
      )}
    </div>
  );
}
