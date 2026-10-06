"use client";

import { SIZE_GUIDE, type Product } from "@belkas/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/lib/toast";
import { useApp, useCart } from "./Providers";
import { WishlistButton } from "./WishlistButton";
import { CloseIcon } from "./icons";

export function ProductActions({ product }: { product: Product }) {
  const [size, setSize] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [needSize, setNeedSize] = useState(false);
  const { store } = useCart();
  const { user, setDrawerOpen } = useApp();
  const router = useRouter();
  const soldOut = product.stock <= 0;

  function add(buyNow: boolean) {
    if (!size) {
      setNeedSize(true);
      return;
    }
    void store.add(product, size, 1);
    if (buyNow) router.push(user ? "/checkout" : "/login?next=/checkout");
    else {
      toast(`Added ${product.name} (size ${size})`, "success");
      setDrawerOpen(true);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <p className="label mb-0">Select size (EU)</p>
        <button className="text-xs underline underline-offset-4" onClick={() => setGuide(true)}>Size guide</button>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7" role="radiogroup" aria-label="Size">
        {product.sizes_available.map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={size === s}
            disabled={soldOut}
            onClick={() => {
              setSize(s);
              setNeedSize(false);
            }}
            className={`h-12 border text-sm transition disabled:opacity-40 ${size === s ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {needSize && <p className="mt-2 text-sm text-accent" role="alert">Please choose a size.</p>}

      <p className={`mt-4 text-sm ${product.stock <= 3 ? "text-accent" : "text-muted"}`}>
        {soldOut ? "Sold out. Check back soon." : product.stock <= 3 ? `Only ${product.stock} left in stock` : "In stock, ready to ship"}
      </p>

      <div className="mt-6 grid gap-3">
        <button className="btn-primary w-full" disabled={soldOut} onClick={() => add(false)}>Add to cart</button>
        <button className="btn-accent w-full" disabled={soldOut} onClick={() => add(true)}>Buy now</button>
        <WishlistButton productId={product.id} />
      </div>

      {guide && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setGuide(false)}>
          <div role="dialog" aria-label="Size guide" className="w-full max-w-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-display text-3xl">Size guide</p>
              <button className="icon-btn" aria-label="Close" onClick={() => setGuide(false)}><CloseIcon /></button>
            </div>
            <p className="mt-2 text-sm text-muted">Measure your foot from heel to longest toe and pick the closest length.</p>
            <table className="mt-5 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2">EU</th><th>UK</th><th>US</th><th>Foot (cm)</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE.filter((r) => product.sizes_available.includes(r.eu)).map((r) => (
                  <tr key={r.eu} className="border-b border-line/60">
                    <td className="py-2 font-medium">{r.eu}</td><td>{r.uk}</td><td>{r.us}</td><td>{r.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-muted">Between sizes? Go up one for loafers and lace-ups.</p>
          </div>
        </div>
      )}
    </div>
  );
}
