import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Google (and email-confirmation) redirects land here with ?code=… to finish sign-in. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const raw = searchParams.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }
  const err = searchParams.get("error_description") ?? "Sign-in was cancelled";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err)}`);
}
