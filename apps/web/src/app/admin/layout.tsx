import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

/** Server-side gate. RLS also blocks non-admin writes in the database. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await isAdmin();
  if (!admin) notFound();
  return <div className="container-x py-8">{children}</div>;
}
