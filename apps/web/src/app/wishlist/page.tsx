"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PRODUCT_COLUMNS, type Product } from "@belkas/shared";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductCard";
import { useApp } from "@/components/Providers";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function WishlistPage() {
  const { user, authReady } = useApp();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const sb = supabaseBrowser();
    sb.from("wishlist")
      .select(`created_at, product:products(${PRODUCT_COLUMNS})`)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts(((data ?? []) as unknown as { product: Product | null }[]).map((r) => r.product).filter((p): p is Product => !!p)));
  }, [user]);

  return (
    <div className="container-x py-10">
      <h1 className="font-display text-5xl">Wishlist</h1>
      {!user && authReady ? (
        <div className="py-20 text-center">
          <p className="text-muted">Sign in to save shoes you love, on the web and in the app.</p>
          <Link href="/login?next=/wishlist" className="btn-primary mt-6">Sign in</Link>
        </div>
      ) : products === null ? (
        <div className="mt-8"><ProductGridSkeleton count={4} /></div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-3xl">No saved shoes yet</p>
          <p className="mt-2 text-sm text-muted">Tap the heart on any shoe to save it here.</p>
          <Link href="/shop" className="btn-primary mt-6">Browse the shop</Link>
        </div>
      ) : (
        <div className="mt-8"><ProductGrid products={products} /></div>
      )}
    </div>
  );
}
