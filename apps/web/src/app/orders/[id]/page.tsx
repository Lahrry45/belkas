import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fetchOrder, formatNaira } from "@belkas/shared";
import { OrderTimeline } from "@/components/OrderTimeline";
import { LiveOrderRefresh } from "@/components/LiveOrderRefresh";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const [{ id }, { placed }] = await Promise.all([params, searchParams]);
  const { sb, user } = await getUser();
  if (!user) redirect(`/login?next=/orders/${id}`);
  const order = await fetchOrder(sb, id);
  if (!order) notFound();
  const a = order.delivery_address;

  return (
    <div className="container-x max-w-4xl py-10">
      <LiveOrderRefresh orderId={order.id} />
      {placed && (
        <div className="mb-12 bg-sand px-6 py-10 text-center">
          <p className="eyebrow">Thank you</p>
          <h1 className="mt-3 font-display text-5xl">Your order is confirmed</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted">
            We&apos;ve emailed a confirmation to {order.email}. Order number <strong className="text-ink">{order.order_number}</strong>.
          </p>
          <Link href="/shop" className="btn-primary mt-6">Continue shopping</Link>
        </div>
      )}
      {!placed && (
        <>
          <Link href="/orders" className="text-xs uppercase tracking-wider text-muted hover:text-ink">← All orders</Link>
          <h1 className="mt-3 font-display text-5xl">{order.order_number}</h1>
        </>
      )}
      <p className="mt-2 text-sm text-muted">
        Placed {new Date(order.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
      </p>

      <div className="mt-10 grid gap-12 md:grid-cols-[1fr_280px]">
        <div>
          <ul className="divide-y divide-line border-y border-line">
            {order.order_items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <div className="relative h-24 w-20 shrink-0 bg-sand">
                  {i.image && <Image src={i.image} alt={i.name} fill sizes="80px" quality={60} className="object-cover" />}
                </div>
                <div className="flex-1">
                  <p>{i.name}</p>
                  <p className="text-sm text-muted">Size {i.size} · Qty {i.quantity}</p>
                </div>
                <p className="font-medium">{formatNaira(i.price_naira * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{order.delivery_fee ? formatNaira(order.delivery_fee) : "Free"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg"><dt>Total</dt><dd className="font-medium">{formatNaira(order.total)}</dd></div>
          </dl>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="label">{a.pickup ? "Pickup" : "Delivery address"}</p>
              <p className="text-sm leading-relaxed">
                {a.pickup ? "Store pickup, Lagos. We'll call you when it's ready." : (
                  <>
                    {a.full_name}<br />{a.street}{a.landmark ? `, near ${a.landmark}` : ""}<br />{a.city}, {a.state}<br />{a.phone}
                  </>
                )}
              </p>
            </div>
            <div>
              <p className="label">Payment</p>
              <p className="text-sm">
                {order.payment_method === "paystack" ? "Paystack" : "Pay on delivery"}
                {order.payment_status === "paid" && " · Paid"}
                {order.payment_status === "awaiting" && " · Awaiting payment"}
                {order.payment_status === "failed" && " · Payment failed"}
              </p>
            </div>
          </div>
        </div>
        <div>
          <p className="label mb-5">Status</p>
          <OrderTimeline order={order} />
        </div>
      </div>
    </div>
  );
}
