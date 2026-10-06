"use client";

import { useRouter } from "next/navigation";
import { formatNaira, type OrderStatus, type OrderWithItems } from "@belkas/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

const STATUSES: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

export function OrdersAdmin({ orders }: { orders: OrderWithItems[] }) {
  const sb = supabaseBrowser();
  const router = useRouter();

  async function setStatus(id: string, status: OrderStatus) {
    const { error } = await sb.from("orders").update({ status }).eq("id", id);
    toast(error ? error.message : `Status changed to ${status}`, error ? "error" : "success");
    router.refresh();
  }

  return (
    <div>
      <h1 className="font-display text-5xl">Orders</h1>
      <div className="mt-8 space-y-4">
        {orders.length === 0 && <p className="text-muted">No orders yet.</p>}
        {orders.map((o) => (
          <div key={o.id} className="border border-line p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{o.order_number} · {formatNaira(o.total)}</p>
                <p className="text-muted">
                  {new Date(o.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {o.email} ·{" "}
                  {o.payment_method === "paystack" ? `Paystack (${o.payment_status})` : "Pay on delivery"} · {o.delivery_method === "store_pickup" ? "Pickup" : "Delivery"}
                </p>
              </div>
              <select className="input h-10 w-44" value={o.status} onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)} aria-label={`Status of ${o.order_number}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="mt-2">{o.order_items.map((i) => `${i.name} (${i.size}) ×${i.quantity}`).join(", ")}</p>
            {!o.delivery_address.pickup && (
              <p className="mt-1 text-muted">
                {o.delivery_address.full_name}, {o.delivery_address.phone} · {o.delivery_address.street}, {o.delivery_address.city}, {o.delivery_address.state}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
