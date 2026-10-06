import type { Metadata } from "next";
import { CATEGORIES, fetchProducts, type ProductFilters } from "@belkas/shared";
import { ProductGrid } from "@/components/ProductCard";
import { ShopFilters } from "@/components/ShopFilters";
import { supabasePublic } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Shop" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const category = one(sp.class);
  const sizes = (one(sp.sizes) ?? "").split(",").filter(Boolean);
  const min = one(sp.min);
  const max = one(sp.max);
  const sort = (one(sp.sort) as ProductFilters["sort"]) ?? "newest";

  const sb = supabasePublic();
  const products = await fetchProducts(sb, {
    category: category && (CATEGORIES as readonly string[]).includes(category) ? category : null,
    sizes,
    minPrice: min ? Number(min) : null,
    maxPrice: max ? Number(max) : null,
    sort,
  });

  return (
    <div className="container-x py-8 sm:py-12">
      <p className="eyebrow">{category ? "Class" : "Collection"}</p>
      <h1 className="mt-2 font-display text-5xl sm:text-6xl">{category ? `${category}s` : "All shoes"}</h1>
      <ShopFilters />
      <p className="mb-6 text-sm text-muted">
        {products.length} {products.length === 1 ? "style" : "styles"}
      </p>
      {products.length ? (
        <ProductGrid products={products} priorityCount={4} />
      ) : (
        <div className="py-24 text-center">
          <p className="font-display text-3xl">No shoes match these filters</p>
          <p className="mt-2 text-sm text-muted">Try another size or a wider price range.</p>
        </div>
      )}
    </div>
  );
}
