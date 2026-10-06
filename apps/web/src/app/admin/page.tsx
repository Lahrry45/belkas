import { PRODUCT_COLUMNS, type Product } from "@belkas/shared";
import { isAdmin } from "@/lib/supabase/server";
import { ProductsAdmin } from "./ProductsAdmin";

export default async function AdminProducts() {
  const { sb } = await isAdmin();
  const { data } = await sb.from("products").select(PRODUCT_COLUMNS).order("created_at", { ascending: false });
  return <ProductsAdmin initial={(data ?? []) as Product[]} />;
}
