import { ProductGridSkeleton } from "@/components/ProductCard";

export default function Loading() {
  return (
    <div className="container-x py-10">
      <div className="skeleton mb-8 h-10 w-56" />
      <ProductGridSkeleton />
    </div>
  );
}
