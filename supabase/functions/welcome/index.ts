// POST {} — called by web/mobile after sign-in. Sends the welcome email once per account.
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, HttpError, requireUser } from "../_shared/supabase.ts";
import { sendWelcome } from "../_shared/emails.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user } = await requireUser(req);
    const admin = adminClient();
    const { data: claimed } = await admin
      .from("profiles")
      .update({ welcome_sent_at: new Date().toISOString() })
      .eq("id", user.id)
      .is("welcome_sent_at", null)
      .select("email, full_name")
      .maybeSingle();
    if (!claimed?.email) return json({ sent: false });
    try {
      await sendWelcome(claimed.email, claimed.full_name);
    } catch (e) {
      await admin.from("profiles").update({ welcome_sent_at: null }).eq("id", user.id);
      throw e;
    }
    return json({ sent: true });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(e);
    return json({ error: (e as Error).message }, status);
  }
});
