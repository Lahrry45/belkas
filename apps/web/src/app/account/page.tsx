import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { AccountForms } from "./AccountForms";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { sb, user } = await getUser();
  if (!user) redirect("/login?next=/account");
  const [{ data: profile }, { data: addresses }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).single(),
    sb.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="container-x max-w-3xl py-10">
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-display text-5xl">Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
      <p className="mt-2 text-sm text-muted">{user.email}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/orders" className="btn-outline">Your orders</Link>
        <Link href="/wishlist" className="btn-outline">Wishlist</Link>
        {profile?.is_admin && <Link href="/admin" className="btn-outline">Admin</Link>}
      </div>
      <AccountForms profile={profile} addresses={addresses ?? []} />
      <form action="/auth/signout" method="post" className="mt-14 border-t border-line pt-8">
        <button className="text-sm underline underline-offset-4">Sign out</button>
      </form>
    </div>
  );
}
