"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DELIVERY_OPTIONS,
  calcTotals,
  fetchAddresses,
  formatNaira,
  startCheckout,
  type Address,
  type DeliveryMethod,
  type PaymentMethod,
} from "@belkas/shared";
import { AddressForm } from "@/components/AddressForm";
import { useApp, useCart } from "@/components/Providers";
import { supabaseBrowser } from "@/lib/supabase/client";

export function CheckoutClient() {
  const sb = supabaseBrowser();
  const router = useRouter();
  const { user } = useApp();
  const { lines, loading } = useCart();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryMethod>("home_delivery");
  const [payment, setPayment] = useState<PaymentMethod>("paystack");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses(sb).then((list) => {
      setAddresses(list);
      setAddressId(list[0]?.id ?? null);
      setAdding(list.length === 0);
    });
  }, [sb]);

  const address = addresses?.find((a) => a.id === addressId) ?? null;
  const totals = useMemo(() => calcTotals(lines, delivery, address?.state), [lines, delivery, address]);
  const needsAddress = delivery === "home_delivery" && !address;

  async function placeOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await startCheckout(sb, {
        address_id: addressId,
        delivery_method: delivery,
        payment_method: payment,
        callback_url: `${location.origin}/checkout/return`,
      });
      if (res.authorization_url) {
        window.location.href = res.authorization_url; // Paystack hosted page (card, transfer, USSD)
        return;
      }
      router.replace(`/orders/${res.order_id}?placed=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (!loading && lines.length === 0 && !busy) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-4xl">Your cart is empty</h1>
        <Link href="/shop" className="btn-primary mt-6">Shop the collection</Link>
      </div>
    );
  }

  return (
    <div className="container-x py-8 sm:py-12">
      <h1 className="font-display text-5xl">Checkout</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="space-y-12">
          {/* 1. Delivery method */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">1 · Delivery method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {DELIVERY_OPTIONS.map((o) => (
                <label key={o.value} className={`cursor-pointer border p-4 transition ${delivery === o.value ? "border-ink" : "border-line hover:border-muted"}`}>
                  <input type="radio" name="delivery" className="sr-only" checked={delivery === o.value} onChange={() => setDelivery(o.value)} />
                  <p className="font-medium">{o.label}</p>
                  <p className="mt-1 text-sm text-muted">{o.note}</p>
                </label>
              ))}
            </div>
          </section>

          {/* 2. Address */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">
              2 · {delivery === "home_delivery" ? "Delivery address" : "Contact details"}
            </h2>
            {addresses === null ? (
              <div className="skeleton h-28" />
            ) : (
              <div className="space-y-3">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer gap-3 border p-4 text-sm transition ${addressId === a.id ? "border-ink" : "border-line hover:border-muted"}`}>
                    <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[var(--color-accent)]" />
                    <span className="leading-relaxed">
                      <span className="font-medium">{a.full_name}</span> · {a.phone}
                      <br />
                      {a.street}{a.landmark ? `, near ${a.landmark}` : ""}, {a.city}, {a.state}
                    </span>
                  </label>
                ))}
                {adding ? (
                  <div className="border border-line p-5">
                    <AddressForm
                      defaultName={(user?.user_metadata?.full_name as string) ?? ""}
                      makeDefault={addresses.length === 0}
                      onSaved={(a) => {
                        setAddresses([a, ...addresses]);
                        setAddressId(a.id);
                        setAdding(false);
                      }}
                      onCancel={addresses.length ? () => setAdding(false) : undefined}
                    />
                  </div>
                ) : (
                  <button className="text-sm underline underline-offset-4" onClick={() => setAdding(true)}>+ Add a new address</button>
                )}
              </div>
            )}
          </section>

          {/* 3. Payment */}
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">3 · Payment</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["paystack", "Pay now with Paystack", "Card, bank transfer or USSD. Secure checkout."],
                  ["pay_on_delivery", "Pay on delivery", "Pay cash or transfer when your shoes arrive."],
                ] as const
              ).map(([v, t, d]) => (
                <label key={v} className={`cursor-pointer border p-4 transition ${payment === v ? "border-ink" : "border-line hover:border-muted"}`}>
                  <input type="radio" name="payment" className="sr-only" checked={payment === v} onChange={() => setPayment(v)} />
                  <p className="font-medium">{t}</p>
                  <p className="mt-1 text-sm text-muted">{d}</p>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Order summary: sticky on desktop, always visible */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-sand p-6">
            <h2 className="font-display text-3xl">Order summary</h2>
            <ul className="mt-5 space-y-4">
              {lines.map((l) => (
                <li key={`${l.product_id}-${l.size}`} className="flex gap-3 text-sm">
                  <div className="relative h-16 w-14 shrink-0 bg-white">
                    {l.product.images[0] && <Image src={l.product.images[0]} alt="" fill sizes="56px" quality={60} className="object-cover" />}
                    <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] text-white">{l.quantity}</span>
                  </div>
                  <div className="flex-1">
                    <p>{l.product.name}</p>
                    <p className="text-muted">Size {l.size}</p>
                  </div>
                  <p>{formatNaira(l.product.price_naira * l.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatNaira(totals.subtotal)}</dd></div>
              <div className="flex justify-between">
                <dt>Delivery{delivery === "home_delivery" && address ? ` (${address.state})` : ""}</dt>
                <dd>{totals.deliveryFee ? formatNaira(totals.deliveryFee) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-lg">
                <dt>Total</dt>
                <dd className="font-medium">{formatNaira(totals.total)}</dd>
              </div>
            </dl>
            {error && <p className="mt-4 text-sm text-accent" role="alert">{error}</p>}
            <button className="btn-accent mt-6 w-full" disabled={busy || loading || lines.length === 0 || needsAddress} onClick={placeOrder}>
              {busy ? "Placing order…" : payment === "paystack" ? `Pay ${formatNaira(totals.total)}` : "Place order"}
            </button>
            {needsAddress && <p className="mt-2 text-center text-xs text-muted">Add a delivery address to continue.</p>}
            <p className="mt-3 text-center text-xs text-muted">Totals are confirmed by our server before you pay.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
