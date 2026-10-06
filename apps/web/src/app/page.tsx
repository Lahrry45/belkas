import Image from "next/image";
import Link from "next/link";
import { CATEGORIES, fetchProducts } from "@belkas/shared";
import { ProductGrid } from "@/components/ProductCard";
import { supabasePublic } from "@/lib/supabase/public";

export const revalidate = 300;

export default async function Home() {
  const sb = supabasePublic();
  const products = await fetchProducts(sb);
  const hero = products.find((p) => p.slug === "black-patent-loafer") ?? products[0];
  const newArrivals = products.slice(0, 4);
  const bestSellers = products.filter((p) => p.is_featured).slice(0, 4);
  const covers = CATEGORIES.map((c) => ({ name: c, product: products.find((p) => p.category === c) })).filter((c) => c.product);

  return (
    <>
      {/* Hero */}
      <section className="container-x grid items-center gap-8 pt-6 pb-16 md:grid-cols-2 md:gap-12 md:pt-12">
        <div className="order-2 md:order-1">
          <p className="eyebrow">New season · Lagos</p>
          <h1 className="mt-4 font-display text-[3.4rem] leading-[0.95] sm:text-7xl lg:text-8xl">
            Shoes that
            <br />
            <em className="text-accent">carry</em> the day.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
            Patent loafers, woven sandals, clean slip-ons and easy flip-flops. Delivered anywhere in Nigeria. Pay online or on delivery.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">Shop the collection</Link>
            <Link href="/shop?class=Loafer" className="btn-outline">Loafers</Link>
          </div>
        </div>
        {hero && (
          <Link href={`/product/${hero.slug}`} className="relative order-1 aspect-[5/4] overflow-hidden bg-sand md:order-2 md:aspect-[4/5]">
            <Image src={hero.images[0]} alt={hero.name} fill loading="eager" fetchPriority="high" sizes="(min-width: 768px) 50vw, 100vw" quality={75} className="object-cover" />
          </Link>
        )}
      </section>

      {/* Shop by class */}
      <section className="container-x py-12">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-4xl sm:text-5xl">Shop by class</h2>
          <Link href="/shop" className="text-sm underline underline-offset-4">View all</Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-7">
          {covers.map(({ name, product }) => (
            <Link key={name} href={`/shop?class=${encodeURIComponent(name)}`} className="group w-36 shrink-0 snap-start sm:w-auto">
              <div className="relative aspect-square overflow-hidden bg-sand">
                <Image src={product!.images[0]} alt="" fill sizes="(min-width: 1024px) 14vw, 160px" quality={60} className="object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <p className="mt-3 text-sm font-medium">{name}s</p>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="container-x py-12">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-4xl sm:text-5xl">New arrivals</h2>
          <Link href="/shop?sort=newest" className="text-sm underline underline-offset-4">View all</Link>
        </div>
        <ProductGrid products={newArrivals} />
      </section>

      {/* Editorial band */}
      <section className="my-12 bg-ink py-20 text-white">
        <div className="container-x grid gap-6 md:grid-cols-3">
          {[
            ["Delivery nationwide", "Lagos in 1–2 days, other states in 2–5 working days."],
            ["Pay your way", "Card, bank transfer or USSD with Paystack, or pay on delivery."],
            ["Easy exchanges", "Wrong size? Message us on WhatsApp within 7 days."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-display text-3xl">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      <section className="container-x py-12">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-4xl sm:text-5xl">Best sellers</h2>
          <Link href="/shop" className="text-sm underline underline-offset-4">View all</Link>
        </div>
        <ProductGrid products={bestSellers} />
      </section>
    </>
  );
}
