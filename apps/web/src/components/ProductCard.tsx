import Image from "next/image";
import Link from "next/link";
import { formatNaira, type Product } from "@belkas/shared";
import { WishlistButton } from "./WishlistButton";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const soldOut = product.stock <= 0;
  return (
    <div className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-sand">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              loading={(priority) ? "eager" : "lazy"} fetchPriority={(priority) ? "high" : "auto"}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              quality={60}
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          )}
          {soldOut && <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[11px] uppercase tracking-wider">Sold out</span>}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{product.category}</p>
            <h3 className="mt-1 text-[15px] leading-snug">{product.name}</h3>
          </div>
          <p className="shrink-0 text-[15px] font-medium">{formatNaira(product.price_naira)}</p>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <WishlistButton productId={product.id} compact />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5]" />
      <div className="skeleton mt-3 h-3 w-16" />
      <div className="skeleton mt-2 h-4 w-3/4" />
    </div>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
