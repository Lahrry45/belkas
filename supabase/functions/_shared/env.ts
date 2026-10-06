export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}. Set it with: supabase secrets set ${name}=...`);
  return v;
}
export const optionalEnv = (name: string, fallback = "") => Deno.env.get(name) ?? fallback;
