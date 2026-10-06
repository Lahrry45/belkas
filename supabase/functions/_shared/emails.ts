import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendMail } from "./mailgun.ts";
import { optionalEnv } from "./env.ts";

const ACCENT = "#B4471F";
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f4f1;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff">
<tr><td style="padding:28px 32px;border-bottom:1px solid #eee">
  <div style="font-size:20px;letter-spacing:4px;font-weight:700">BELKA'S <span style="color:${ACCENT}">ENTERPRISE</span></div>
  <div style="font-size:12px;color:#777;letter-spacing:2px;margin-top:4px">FOOTWEAR · LAGOS</div>
</td></tr>
<tr><td style="padding:28px 32px">
  <h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
  ${body}
</td></tr>
<tr><td style="padding:20px 32px;background:#1a1a1a;color:#bbb;font-size:12px">
  Questions? Reply to this email or chat with us on WhatsApp.<br>© BELKA'S ENTERPRISE
</td></tr></table></td></tr></table></body></html>`;
}

const PAYMENT_LABEL: Record<string, string> = {
  paystack: "Paid online (Paystack)",
  pay_on_delivery: "Pay on delivery",
};

/**
 * Sends the order confirmation once. The confirmation_sent_at column is claimed first,
 * so retries/webhooks never send duplicates.
 */
export async function sendOrderConfirmation(admin: SupabaseClient, orderId: string) {
  const { data: order } = await admin
    .from("orders")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("confirmation_sent_at", null)
    .select("*, order_items(*)")
    .maybeSingle();
  if (!order || !order.email) return false;

  const site = optionalEnv("SITE_URL", "");
  const a = order.delivery_address ?? {};
  const rows = (order.order_items ?? [])
    .map(
      (i: { image: string | null; name: string; size: string; quantity: number; price_naira: number }) => `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;width:72px">
    ${i.image ? `<img src="${esc(i.image)}" width="64" height="64" alt="" style="display:block;object-fit:cover;background:#f3f3f3">` : ""}
  </td>
  <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">
    <strong>${esc(i.name)}</strong><br><span style="color:#777">Size ${esc(i.size)} · Qty ${i.quantity}</span>
  </td>
  <td align="right" style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px">${naira(i.price_naira * i.quantity)}</td>
</tr>`,
    )
    .join("");

  const address = a.pickup
    ? "Store pickup — Lagos store. We'll call you when it's ready."
    : [a.full_name, a.street, a.landmark && `Near ${a.landmark}`, `${a.city}, ${a.state}`, a.phone]
        .filter(Boolean)
        .map(esc)
        .join("<br>");

  const body = `
<p style="font-size:15px;line-height:1.5;margin:0 0 20px">Thank you for your order. We're getting it ready.</p>
<p style="font-size:14px;margin:0 0 20px"><strong>Order number:</strong> ${esc(order.order_number)}<br>
<strong>Payment:</strong> ${esc(PAYMENT_LABEL[order.payment_method] ?? order.payment_method)}</p>
<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px">
  <tr><td>Subtotal</td><td align="right">${naira(order.subtotal)}</td></tr>
  <tr><td>Delivery</td><td align="right">${order.delivery_fee ? naira(order.delivery_fee) : "Free"}</td></tr>
  <tr><td style="padding-top:8px;font-size:17px"><strong>Total</strong></td>
      <td align="right" style="padding-top:8px;font-size:17px;color:${ACCENT}"><strong>${naira(order.total)}</strong></td></tr>
</table>
<h2 style="font-size:15px;margin:28px 0 8px">${a.pickup ? "Pickup" : "Delivery address"}</h2>
<p style="font-size:14px;line-height:1.5;margin:0">${address}</p>
${site ? `<p style="margin:28px 0 0"><a href="${esc(site)}/orders/${order.id}" style="background:${ACCENT};color:#fff;text-decoration:none;padding:12px 22px;display:inline-block;font-size:14px">Track your order</a></p>` : ""}`;

  const text = [
    `BELKA'S ENTERPRISE — order ${order.order_number}`,
    ...(order.order_items ?? []).map(
      (i: { name: string; size: string; quantity: number; price_naira: number }) =>
        `${i.name} (size ${i.size}) x${i.quantity} — ${naira(i.price_naira * i.quantity)}`,
    ),
    `Delivery: ${order.delivery_fee ? naira(order.delivery_fee) : "Free"}`,
    `Total: ${naira(order.total)}`,
    `Payment: ${PAYMENT_LABEL[order.payment_method] ?? order.payment_method}`,
  ].join("\n");

  try {
    await sendMail({
      to: order.email,
      subject: `Order ${order.order_number} confirmed — BELKA'S ENTERPRISE`,
      html: layout(`Order ${order.order_number} confirmed`, body),
      text,
    });
    return true;
  } catch (e) {
    // Release the claim so a later retry can send it.
    await admin.from("orders").update({ confirmation_sent_at: null }).eq("id", orderId);
    console.error("order email failed", e);
    return false;
  }
}

export async function sendWelcome(to: string, name: string | null) {
  const site = optionalEnv("SITE_URL", "");
  const first = (name ?? "").split(" ")[0];
  const body = `
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hi${first ? " " + esc(first) : ""}, welcome to BELKA'S ENTERPRISE.</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Your account works on our website and our app, and your cart follows you on both.
Browse loafers, sandals, mules, slip-ons, sneakers and more, with delivery anywhere in Nigeria.</p>
${site ? `<p style="margin:24px 0 0"><a href="${esc(site)}" style="background:${ACCENT};color:#fff;text-decoration:none;padding:12px 22px;display:inline-block;font-size:14px">Start shopping</a></p>` : ""}`;
  await sendMail({
    to,
    subject: "Welcome to BELKA'S ENTERPRISE",
    html: layout("Welcome", body),
    text: `Hi${first ? " " + first : ""}, welcome to BELKA'S ENTERPRISE. Your account works on our website and app. ${site}`,
  });
}
