import type { OrderWithItems } from "@belkas/shared";
import { isAdmin } from "@/lib/supabase/server";
import { OrdersAdmin } from "./OrdersAdmin";

export default async function AdminOrders() {
  const { sb } = await isAdmin();
  const { data } = await sb.from("orders").select("*, order_items(*)").neq("payment_status", "awaiting").order("created_at", { ascending: false }).limit(200);
  return <OrdersAdmin orders={(data ?? []) as OrderWithItems[]} />;
}
