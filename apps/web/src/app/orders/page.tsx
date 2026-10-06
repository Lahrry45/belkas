import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchOrders, formatNaira } from "@belkas/shared";
import { STATUS_LABEL } from "@/components/OrderTimeline";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const { sb, user } = await getUser();
  if (!user) redirect("/login?next=/orders");
  const orders = await fetchOrders(sb);

  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="font-display text-5xl">Your orders</h1>
      {orders.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-muted">You haven&apos;t placed an order yet.</p>
          <Link href="/shop" className="btn-primary mt-6">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center gap-4 py-5 hover:bg-sand/50">
                <div className="flex -space-x-4">
                  {o.order_items.slice(0, 3).map((i) => (
                    <div key={i.id} className="relative h-16 w-14 border-2 border-white bg-sand">
                      {i.image && <Image src={i.image} alt="" fill sizes="56px" quality={60} className="object-cover" />}
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-sm text-muted">
                    {new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {o.order_items.reduce((n, i) => n + i.quantity, 0)} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatNaira(o.total)}</p>
                  <p className="text-xs uppercase tracking-wider text-accent">{STATUS_LABEL[o.status]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
