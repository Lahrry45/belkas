import { ProductGridSkeleton } from "@/components/ProductCard";

export default function Loading() {
  return (
    <div className="container-x py-8 sm:py-12">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton mt-3 h-12 w-64" />
      <div className="skeleton my-8 h-12 w-full" />
      <ProductGridSkeleton />
    </div>
  );
}
