import { describe, expect, it } from "vitest";
import { calcTotals, deliveryFee, formatNaira, toKobo } from "../src";

const line = (price: number, quantity: number) => ({ quantity, product: { price_naira: price } });

describe("checkout totals", () => {
  it("sums subtotal from price × quantity", () => {
    const t = calcTotals([line(30000, 1), line(25000, 2)], "store_pickup");
    expect(t.subtotal).toBe(80000);
    expect(t.itemCount).toBe(3);
  });

  it("charges no delivery for store pickup", () => {
    expect(calcTotals([line(40000, 1)], "store_pickup").total).toBe(40000);
  });

  it("charges ₦3,000 for Lagos home delivery and ₦6,000 elsewhere", () => {
    expect(calcTotals([line(40000, 1)], "home_delivery", "Lagos").total).toBe(43000);
    expect(calcTotals([line(40000, 1)], "home_delivery", " lagos ").deliveryFee).toBe(3000);
    expect(calcTotals([line(40000, 1)], "home_delivery", "Rivers").total).toBe(46000);
    expect(deliveryFee("home_delivery", null)).toBe(6000);
  });

  it("charges no delivery on an empty cart", () => {
    expect(calcTotals([], "home_delivery", "Kano")).toEqual({ itemCount: 0, subtotal: 0, deliveryFee: 0, total: 0 });
  });

  it("converts to kobo for Paystack", () => {
    expect(toKobo(43000)).toBe(4300000);
  });

  it("formats Naira with thousands separators", () => {
    expect(formatNaira(12500)).toBe("₦12,500");
    expect(formatNaira(1250000)).toBe("₦1,250,000");
    expect(formatNaira(0)).toBe("₦0");
  });
});
