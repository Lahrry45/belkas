import type { CartLine, CartProduct } from "../types";

/** Pure cart operations used for optimistic updates (web + mobile) and the guest cart. */

export const MAX_QTY = 20;

export const lineKey = (productId: string, size: string) => `${productId}::${size}`;
export const keyOf = (l: Pick<CartLine, "product_id" | "size">) => lineKey(l.product_id, l.size);

const clampQty = (q: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(q)));

export function addLine(lines: CartLine[], product: CartProduct, size: string, quantity = 1): CartLine[] {
  const key = lineKey(product.id, size);
  const existing = lines.find((l) => keyOf(l) === key);
  if (existing) {
    return lines.map((l) => (keyOf(l) === key ? { ...l, quantity: clampQty(l.quantity + quantity) || 1 } : l));
  }
  return [...lines, { product_id: product.id, size, quantity: clampQty(quantity) || 1, product }];
}

/** Setting quantity to 0 removes the line. */
export function setLineQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  const q = clampQty(quantity);
  if (q === 0) return removeLine(lines, key);
  return lines.map((l) => (keyOf(l) === key ? { ...l, quantity: q } : l));
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((l) => keyOf(l) !== key);
}

/** Combine a guest cart into an account cart (quantities add up, capped). */
export function mergeLines(account: CartLine[], guest: CartLine[]): CartLine[] {
  return guest.reduce((acc, g) => addLine(acc, g.product, g.size, g.quantity), account);
}

export function cartCount(lines: Pick<CartLine, "quantity">[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}
