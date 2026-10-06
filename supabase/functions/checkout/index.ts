// POST { address_id, delivery_method, payment_method, callback_url? }
// Creates the order from the caller's cart (totals computed in Postgres from DB prices).
//  - pay_on_delivery: order is final, cart cleared, email sent.
//  - paystack: initializes a Paystack transaction for the SERVER-computed total and returns authorization_url.
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { initializeTransaction } from "../_shared/paystack.ts";
import { sendOrderConfirmation } from "../_shared/emails.ts";
import { optionalEnv } from "../_shared/env.ts";

function safeCallback(url: unknown): string {
  const site = optionalEnv("SITE_URL", "http://localhost:3000").replace(/\/$/, "");
  const allowed = [site, "http://localhost:3000", ...optionalEnv("EXTRA_CALLBACK_ORIGINS").split(",").filter(Boolean)];
  if (typeof url === "string" && allowed.some((o) => url.startsWith(o + "/"))) return url;
  return `${site}/checkout/return`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sb, user } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const { address_id = null, delivery_method, payment_method } = body;

    const { data: order, error } = await sb.rpc("create_order", {
      p_address_id: address_id,
      p_delivery_method: delivery_method,
      p_payment_method: payment_method,
    });
    if (error) throw new HttpError(400, error.message);

    const admin = adminClient();

    if (payment_method === "pay_on_delivery") {
      await sendOrderConfirmation(admin, order.id);
      return json({ order_id: order.id, order_number: order.order_number, total: order.total });
    }

    const reference = `${order.order_number}-${crypto.randomUUID().slice(0, 8)}`;
    await admin.from("orders").update({ payment_reference: reference }).eq("id", order.id);

    try {
      const tx = await initializeTransaction({
        email: order.email ?? user.email!,
        amountKobo: order.total * 100,
        reference,
        callbackUrl: safeCallback(body.callback_url),
        metadata: { order_id: order.id, order_number: order.order_number, user_id: user.id },
      });
      return json({
        order_id: order.id,
        order_number: order.order_number,
        total: order.total,
        authorization_url: tx.authorization_url,
        reference,
      });
    } catch (e) {
      await admin.from("orders").update({ payment_status: "failed", status: "cancelled" }).eq("id", order.id);
      throw new HttpError(502, `Could not start payment: ${(e as Error).message}`);
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(e);
    return json({ error: (e as Error).message }, status);
  }
});
