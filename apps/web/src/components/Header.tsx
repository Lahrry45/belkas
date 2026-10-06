"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, useCart } from "./Providers";
import { BagIcon, HeartIcon, UserIcon } from "./icons";

const NAV = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?class=Loafer", label: "Loafers" },
  { href: "/shop?class=Slip-on", label: "Slip-ons" },
  { href: "/shop?class=Flip-flop", label: "Flip-flops" },
];

export function Header() {
  const { user, setDrawerOpen } = useApp();
  const { count } = useCart();
  const path = usePathname();
  if (path.startsWith("/admin")) return <AdminHeader />;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display text-xl tracking-[0.2em] sm:text-2xl">
          BELKA&apos;S
        </Link>
        <nav className="hidden gap-8 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-ink/70 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/wishlist" aria-label="Wishlist" className="icon-btn">
            <HeartIcon />
          </Link>
          <Link href={user ? "/account" : "/login"} aria-label="Account" className="icon-btn">
            <UserIcon />
          </Link>
          <button aria-label={`Cart, ${count} items`} className="icon-btn relative" onClick={() => setDrawerOpen(true)}>
            <BagIcon />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
      <nav className="no-scrollbar flex gap-6 overflow-x-auto px-4 pb-3 text-sm md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="shrink-0 text-ink/70">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function AdminHeader() {
  return (
    <header className="border-b border-line bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/admin" className="font-display tracking-[0.2em]">
          BELKA&apos;S · ADMIN
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/admin">Products</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/">View shop</Link>
        </nav>
      </div>
    </header>
  );
}
