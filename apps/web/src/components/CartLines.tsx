"use client";

import Image from "next/image";
import Link from "next/link";
import { formatNaira, keyOf, type CartLine } from "@belkas/shared";
import { useCart } from "./Providers";

export function CartLines({ lines, onNavigate }: { lines: CartLine[]; onNavigate?: () => void }) {
  const { store } = useCart();
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => {
        const key = keyOf(l);
        const atStock = l.quantity >= l.product.stock;
        return (
          <li key={key} className="flex gap-4 py-5">
            <Link href={`/product/${l.product.slug}`} onClick={onNavigate} className="relative h-28 w-24 shrink-0 bg-sand">
              {l.product.images[0] && (
                <Image src={l.product.images[0]} alt={l.product.name} fill sizes="96px" quality={60} className="object-cover" />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <Link href={`/product/${l.product.slug}`} onClick={onNavigate} className="text-[15px] leading-snug">
                  {l.product.name}
                </Link>
                <p className="shrink-0 text-[15px] font-medium">{formatNaira(l.product.price_naira * l.quantity)}</p>
              </div>
              <p className="mt-1 text-sm text-muted">
                Size {l.size} · {formatNaira(l.product.price_naira)} each
              </p>
              <div className="mt-auto flex items-center justify-between pt-3">
                <div className="flex h-9 items-center border border-line">
                  <button
                    aria-label={`Decrease quantity of ${l.product.name}`}
                    className="h-full w-9 text-lg"
                    onClick={() => store.setQuantity(key, l.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                    {l.quantity}
                  </span>
                  <button
                    aria-label={`Increase quantity of ${l.product.name}`}
                    className="h-full w-9 text-lg disabled:opacity-30"
                    disabled={atStock}
                    onClick={() => store.setQuantity(key, l.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button className="text-xs uppercase tracking-wider text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => store.remove(key)}>
                  Remove
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
