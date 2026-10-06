"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  if (usePathname().startsWith("/admin")) return null;
  return (
    <footer className="mt-24 border-t border-line bg-sand">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl tracking-[0.2em]">BELKA&apos;S</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Considered footwear from Lagos. Delivery across Nigeria, pay online with Paystack or on delivery.
          </p>
        </div>
        <div className="text-sm">
          <p className="label">Shop</p>
          <ul className="space-y-2">
            {["Loafer", "Slip-on", "Sandal", "Mule", "Lace-up", "Flip-flop", "Sneaker"].map((c) => (
              <li key={c}>
                <Link href={`/shop?class=${encodeURIComponent(c)}`} className="hover:text-accent">
                  {c}s
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm">
          <p className="label">Help</p>
          <ul className="space-y-2">
            <li><Link href="/orders" className="hover:text-accent">Track an order</Link></li>
            <li><Link href="/account" className="hover:text-accent">Your account</Link></li>
            <li><Link href="/wishlist" className="hover:text-accent">Wishlist</Link></li>
            <li><Link href="/privacy" className="hover:text-accent">Privacy policy</Link></li>
          </ul>
        </div>
      </div>
      <p className="container-x border-t border-line py-6 text-xs text-muted">© {new Date().getFullYear()} BELKA&apos;S ENTERPRISE</p>
    </footer>
  );
}
