import { adminClient } from "./supabase.ts";
import { verifyTransaction } from "./paystack.ts";
import { sendOrderConfirmation } from "./emails.ts";

/**
 * Ask Paystack (never the client) whether a reference was paid, then mark the order paid,
 * reduce stock, clear the cart and send the email. Safe to call many times.
 */
export async function confirmPaystackReference(reference: string) {
  const admin = adminClient();
  const tx = await verifyTransaction(reference);

  const { data: order } = await admin.from("orders").select("id, payment_status").eq("payment_reference", reference).maybeSingle();
  if (!order) return { status: "unknown" as const };

  if (tx.status !== "success" || tx.currency !== "NGN") {
    return { status: (tx.status === "failed" ? "failed" : "pending") as "failed" | "pending", order_id: order.id };
  }

  if (order.payment_status !== "paid") {
    const { error } = await admin.rpc("finalize_paystack_order", { p_reference: reference, p_amount_kobo: tx.amount });
    if (error) throw new Error(error.message);
  }
  await sendOrderConfirmation(admin, order.id);
  return { status: "paid" as const, order_id: order.id };
}
