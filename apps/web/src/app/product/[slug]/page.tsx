import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProduct, fetchProducts, formatNaira } from "@belkas/shared";
import { Gallery } from "@/components/Gallery";
import { ProductActions } from "@/components/ProductActions";
import { ProductGrid } from "@/components/ProductCard";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 60;

export async function generateStaticParams() {
  const products = await fetchProducts(supabasePublic());
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await fetchProduct(supabasePublic(), slug);
  return p ? { title: p.name, description: p.description, openGraph: { images: p.images.slice(0, 1) } } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = supabasePublic();
  const product = await fetchProduct(sb, slug);
  if (!product || !product.is_active) notFound();
  const related = (await fetchProducts(sb, { category: product.category })).filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="container-x py-6 sm:py-10">
      <nav className="mb-6 text-xs uppercase tracking-wider text-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link> /{" "}
        <Link href={`/shop?class=${encodeURIComponent(product.category)}`} className="hover:text-ink">{product.category}s</Link>
      </nav>
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:gap-14">
        <Gallery images={product.images} alt={product.name} />
        <div className="md:sticky md:top-24 md:self-start">
          <p className="eyebrow">{product.category}</p>
          <h1 className="mt-3 font-display text-5xl leading-none">{product.name}</h1>
          <p className="mt-4 text-2xl">{formatNaira(product.price_naira)}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-muted">{product.description}</p>
          <ProductActions product={product} />
          <ul className="mt-10 space-y-3 border-t border-line pt-6 text-sm text-muted">
            <li>Lagos delivery ₦3,000 · other states ₦6,000 · free store pickup</li>
            <li>Pay online with Paystack (card, transfer, USSD) or pay on delivery</li>
            <li>Exchanges within 7 days. Message us on WhatsApp</li>
          </ul>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 font-display text-4xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
