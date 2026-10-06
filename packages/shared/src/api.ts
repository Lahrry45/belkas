import type { SupabaseClient } from "@supabase/supabase-js";
import type { Address, AddressInput, DeliveryMethod, OrderWithItems, PaymentMethod, Product } from "./types";

export const PRODUCT_COLUMNS =
  "id, slug, name, category, description, price_naira, images, sizes_available, stock, is_active, is_featured, created_at";

export interface ProductFilters {
  category?: string | null;
  sizes?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: "newest" | "price_asc" | "price_desc";
}

export async function fetchProducts(sb: SupabaseClient, f: ProductFilters = {}): Promise<Product[]> {
  let q = sb.from("products").select(PRODUCT_COLUMNS).eq("is_active", true);
  if (f.category) q = q.eq("category", f.category);
  if (f.sizes && f.sizes.length) q = q.overlaps("sizes_available", f.sizes);
  if (f.minPrice != null) q = q.gte("price_naira", f.minPrice);
  if (f.maxPrice != null) q = q.lte("price_naira", f.maxPrice);
  if (f.sort === "price_asc") q = q.order("price_naira", { ascending: true });
  else if (f.sort === "price_desc") q = q.order("price_naira", { ascending: false });
  else q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function fetchProduct(sb: SupabaseClient, slug: string): Promise<Product | null> {
  const { data, error } = await sb.from("products").select(PRODUCT_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

/** Category names in display order with a cover image each. */
export const CATEGORIES = ["Loafer", "Sandal", "Mule", "Lace-up", "Slip-on", "Flip-flop", "Sneaker"] as const;

export async function fetchAddresses(sb: SupabaseClient): Promise<Address[]> {
  const { data, error } = await sb
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Address[];
}

export async function saveAddress(sb: SupabaseClient, input: AddressInput): Promise<Address> {
  if (input.is_default) {
    const { data: u } = await sb.auth.getUser();
    if (u.user) await sb.from("addresses").update({ is_default: false }).eq("user_id", u.user.id).eq("is_default", true);
  }
  const { data, error } = await sb.from("addresses").insert(input).select("*").single();
  if (error) throw error;
  return data as Address;
}

export async function fetchOrders(sb: SupabaseClient): Promise<OrderWithItems[]> {
  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*)")
    .neq("payment_status", "awaiting")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrderWithItems[];
}

export async function fetchOrder(sb: SupabaseClient, id: string): Promise<OrderWithItems | null> {
  const { data, error } = await sb.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as OrderWithItems | null;
}

export async function fetchWishlistIds(sb: SupabaseClient): Promise<string[]> {
  const { data, error } = await sb.from("wishlist").select("product_id");
  if (error) throw error;
  return (data ?? []).map((r: { product_id: string }) => r.product_id);
}

export async function toggleWishlist(sb: SupabaseClient, productId: string, on: boolean) {
  const { error } = on
    ? await sb.from("wishlist").insert({ product_id: productId })
    : await sb.from("wishlist").delete().eq("product_id", productId);
  if (error && error.code !== "23505") throw error;
}

export interface CheckoutRequest {
  address_id: string | null;
  delivery_method: DeliveryMethod;
  payment_method: PaymentMethod;
  /** Where Paystack sends the browser after payment. */
  callback_url?: string;
}

export interface CheckoutResponse {
  order_id: string;
  order_number: string;
  total: number;
  /** Present for Paystack: open this URL to pay. */
  authorization_url?: string;
  reference?: string;
}

/** Calls the `checkout` Edge Function (shared by web and mobile). */
export async function startCheckout(sb: SupabaseClient, req: CheckoutRequest): Promise<CheckoutResponse> {
  const { data, error } = await sb.functions.invoke<CheckoutResponse & { error?: string }>("checkout", { body: req });
  if (error) {
    let msg = error.message;
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  if (!data || data.error) throw new Error(data?.error ?? "Checkout failed");
  return data;
}

export async function verifyPayment(sb: SupabaseClient, reference: string): Promise<{ status: string; order_id?: string }> {
  const { data, error } = await sb.functions.invoke("paystack-verify", { body: { reference } });
  if (error) throw error;
  return data;
}

/** Fire-and-forget; the function is idempotent (sends once per account). */
export async function sendWelcomeIfNew(sb: SupabaseClient) {
  try {
    await sb.functions.invoke("welcome", { body: {} });
  } catch {}
}

export const ORDER_STEPS: { status: string; label: string }[] = [
  { status: "pending", label: "Order placed" },
  { status: "paid", label: "Payment confirmed" },
  { status: "processing", label: "Processing" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];
