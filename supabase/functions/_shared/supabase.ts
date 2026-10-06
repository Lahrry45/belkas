import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { env } from "./env.ts";

/** Service-role client: bypasses RLS. Server-side only, never shipped to browsers or the app. */
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client that acts as the signed-in caller (RLS + auth.uid() apply). */
export function userClient(req: Request): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request) {
  const sb = userClient(req);
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Please sign in");
  return { sb, user: data.user };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
