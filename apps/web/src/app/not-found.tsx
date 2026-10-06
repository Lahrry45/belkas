import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-5xl">We couldn&apos;t find that page</h1>
      <Link href="/shop" className="btn-primary mt-8">Back to the shop</Link>
    </div>
  );
}
