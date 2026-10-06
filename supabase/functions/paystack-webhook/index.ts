// Paystack → this URL (set in Paystack Dashboard → Settings → API Keys & Webhooks).
// Deployed with --no-verify-jwt; authenticity is checked with the x-paystack-signature HMAC.
import { isValidSignature } from "../_shared/paystack.ts";
import { confirmPaystackReference } from "../_shared/finalize.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  if (!(await isValidSignature(raw, req.headers.get("x-paystack-signature")))) {
    return new Response("invalid signature", { status: 401 });
  }
  try {
    const event = JSON.parse(raw);
    if (event.event === "charge.success" && event.data?.reference) {
      await confirmPaystackReference(event.data.reference);
    }
  } catch (e) {
    console.error("webhook error", e);
    return new Response("error", { status: 500 }); // Paystack retries
  }
  return new Response("ok");
});
