/** ₦12,500 — whole Naira, no decimals. */
export function formatNaira(amount: number): string {
  const n = Math.round(amount);
  const sign = n < 0 ? "-" : "";
  return `${sign}₦${Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
