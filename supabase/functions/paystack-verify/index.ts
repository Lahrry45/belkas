// POST { reference } — called by web/mobile after returning from Paystack.
// Confirms with Paystack's API (server-to-server), never trusting the client.
import { corsHeaders, json } from "../_shared/cors.ts";
import { HttpError, requireUser } from "../_shared/supabase.ts";
import { confirmPaystackReference } from "../_shared/finalize.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sb } = await requireUser(req);
    const { reference } = await req.json().catch(() => ({}));
    if (typeof reference !== "string" || !reference) throw new HttpError(400, "Missing reference");

    // RLS: the caller can only see their own order.
    const { data: own } = await sb.from("orders").select("id").eq("payment_reference", reference).maybeSingle();
    if (!own) throw new HttpError(404, "Order not found");

    return json(await confirmPaystackReference(reference));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(e);
    return json({ error: (e as Error).message }, status);
  }
});
