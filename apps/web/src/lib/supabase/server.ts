import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server client acting as the signed-in visitor (RLS applies). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

export async function getUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user };
}

export async function isAdmin() {
  const { sb, user } = await getUser();
  if (!user) return { sb, user, admin: false };
  const { data } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return { sb, user, admin: !!data?.is_admin };
}
