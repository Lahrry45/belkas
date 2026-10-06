import { createClient } from "@supabase/supabase-js";

/** Cookie-free anon client for public catalogue reads, so pages can be cached (ISR). */
export const supabasePublic = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
