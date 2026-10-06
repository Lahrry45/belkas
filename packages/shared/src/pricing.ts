import type { DeliveryMethod } from "./types";

/**
 * Delivery fees in Naira. MUST match public.delivery_fee() in
 * supabase/migrations/20261006000003_functions.sql — the server is the source of truth.
 */
export const STORE_STATE = "Lagos";
export const DELIVERY_FEES = {
  store_pickup: 0,
  home_delivery_lagos: 3000,
  home_delivery_other: 6000,
} as const;

export const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string; note: string }[] = [
  { value: "home_delivery", label: "Home delivery", note: "Lagos ₦3,000 · other states ₦6,000 · 1–5 working days" },
  { value: "store_pickup", label: "Store pickup", note: "Free · pick up at our Lagos store" },
];

export function deliveryFee(method: DeliveryMethod, state: string | null | undefined): number {
  if (method === "store_pickup") return DELIVERY_FEES.store_pickup;
  return (state ?? "").trim().toLowerCase() === STORE_STATE.toLowerCase()
    ? DELIVERY_FEES.home_delivery_lagos
    : DELIVERY_FEES.home_delivery_other;
}

export interface PricedLine {
  quantity: number;
  product: { price_naira: number };
}

export interface Totals {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

/** Display totals. The server recomputes these from database prices at checkout. */
export function calcTotals(lines: PricedLine[], method: DeliveryMethod, state?: string | null): Totals {
  const subtotal = lines.reduce((sum, l) => sum + l.product.price_naira * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const fee = itemCount === 0 ? 0 : deliveryFee(method, state);
  return { itemCount, subtotal, deliveryFee: fee, total: subtotal + fee };
}

/** Paystack works in kobo. */
export const toKobo = (naira: number) => Math.round(naira * 100);
