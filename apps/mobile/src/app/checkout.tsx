import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import {
  DELIVERY_OPTIONS, calcTotals, fetchAddresses, formatNaira, startCheckout, verifyPayment,
  type Address, type DeliveryMethod, type PaymentMethod,
} from "@belkas/shared";
import { AddressForm } from "@/components/AddressForm";
import { Button, Display, Muted, Skeleton } from "@/components/ui";
import { useApp, useCart } from "@/lib/app";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";

const SITE = process.env.EXPO_PUBLIC_SITE_URL ?? "";

export default function Checkout() {
  const { session } = useApp();
  const { lines, loading } = useCart();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryMethod>("home_delivery");
  const [payment, setPayment] = useState<PaymentMethod>("paystack");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return void router.replace("/login");
    fetchAddresses(supabase).then((list) => {
      setAddresses(list);
      setAddressId(list[0]?.id ?? null);
      setAdding(list.length === 0);
    });
  }, [session]);

  const address = addresses?.find((a) => a.id === addressId) ?? null;
  const totals = useMemo(() => calcTotals(lines, delivery, address?.state), [lines, delivery, address]);
  const needsAddress = delivery === "home_delivery" && !address;

  async function placeOrder() {
    setError(null);
    setBusy("Placing order…");
    try {
      const res = await startCheckout(supabase, {
        address_id: addressId,
        delivery_method: delivery,
        payment_method: payment,
        callback_url: SITE ? `${SITE}/checkout/return?app=1` : undefined,
      });
      if (!res.authorization_url) return router.replace({ pathname: "/orders/[id]", params: { id: res.order_id, placed: "1" } });

      // Paystack hosted checkout (card, transfer, USSD). It returns via belkas://checkout-return,
      // or the customer closes the browser; either way the SERVER verifies the payment with Paystack.
      setBusy("Waiting for payment…");
      await WebBrowser.openAuthSessionAsync(res.authorization_url, "belkas://checkout-return");
      setBusy("Confirming payment…");
      for (let i = 0; i < 6; i++) {
        const v = await verifyPayment(supabase, res.reference!).catch(() => null);
        if (v?.status === "paid") return router.replace({ pathname: "/orders/[id]", params: { id: res.order_id, placed: "1" } });
        if (v?.status === "failed") break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      setError("Payment not completed. You haven't been charged and your cart is saved. If you did pay, the order will appear in Orders shortly.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  if (!loading && lines.length === 0 && !busy) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.paper }}>
        <Display>Your cart is empty</Display>
        <Button title="Shop the collection" onPress={() => router.navigate("/shop")} style={{ marginTop: 20, paddingHorizontal: 24 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ padding: S.gutter, paddingBottom: 220 }} keyboardShouldPersistTaps="handled">
        <Step n={1} title="Delivery method" />
        {DELIVERY_OPTIONS.map((o) => (
          <Option key={o.value} on={delivery === o.value} title={o.label} note={o.note} onPress={() => setDelivery(o.value)} />
        ))}

        <Step n={2} title={delivery === "home_delivery" ? "Delivery address" : "Contact details"} />
        {addresses === null ? (
          <Skeleton style={{ height: 90 }} />
        ) : (
          <>
            {addresses.map((a) => (
              <Option key={a.id} on={addressId === a.id} title={`${a.full_name} · ${a.phone}`} note={`${a.street}${a.landmark ? `, near ${a.landmark}` : ""}, ${a.city}, ${a.state}`} onPress={() => setAddressId(a.id)} />
            ))}
            {adding ? (
              <View style={{ borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 8 }}>
                <AddressForm
                  defaultName={(session?.user.user_metadata?.full_name as string) ?? ""}
                  makeDefault={addresses.length === 0}
                  onSaved={(a) => { setAddresses([a, ...addresses]); setAddressId(a.id); setAdding(false); }}
                  onCancel={addresses.length ? () => setAdding(false) : undefined}
                />
              </View>
            ) : (
              <Pressable onPress={() => setAdding(true)} style={{ paddingVertical: 10 }}>
                <Text style={{ textDecorationLine: "underline" }}>+ Add a new address</Text>
              </Pressable>
            )}
          </>
        )}

        <Step n={3} title="Payment" />
        <Option on={payment === "paystack"} title="Pay now with Paystack" note="Card, bank transfer or USSD. Secure checkout." onPress={() => setPayment("paystack")} />
        <Option on={payment === "pay_on_delivery"} title="Pay on delivery" note="Pay cash or transfer when your shoes arrive." onPress={() => setPayment("pay_on_delivery")} />

        <Step n={4} title="Items" />
        {lines.map((l) => (
          <View key={`${l.product_id}-${l.size}`} style={{ flexDirection: "row", gap: 12, paddingVertical: 8 }}>
            <Image source={{ uri: l.product.images[0] }} style={{ width: 52, height: 64, backgroundColor: C.sand }} />
            <View style={{ flex: 1 }}>
              <Text>{l.product.name}</Text>
              <Muted style={{ fontSize: 13 }}>Size {l.size} · Qty {l.quantity}</Muted>
            </View>
            <Text>{formatNaira(l.product.price_naira * l.quantity)}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Always-visible order summary */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.sand, padding: S.gutter, paddingBottom: 30 }}>
        <Row label="Subtotal" value={formatNaira(totals.subtotal)} />
        <Row label={`Delivery${delivery === "home_delivery" && address ? ` (${address.state})` : ""}`} value={totals.deliveryFee ? formatNaira(totals.deliveryFee) : "Free"} />
        <Row label="Total" value={formatNaira(totals.total)} bold />
        {error && <Text style={{ color: C.accent, marginTop: 6 }}>{error}</Text>}
        {busy ? (
          <View style={{ height: 52, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.accent }}>
            <ActivityIndicator color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "600" }}>{busy}</Text>
          </View>
        ) : (
          <Button
            title={payment === "paystack" ? `Pay ${formatNaira(totals.total)}` : "Place order"}
            variant="accent"
            disabled={loading || lines.length === 0 || needsAddress}
            onPress={placeOrder}
            style={{ marginTop: 10 }}
          />
        )}
      </View>
    </View>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return <Text style={{ fontSize: 11, letterSpacing: 2, fontWeight: "700", marginTop: 24, marginBottom: 10 }}>{n} · {title.toUpperCase()}</Text>;
}

function Option({ on, title, note, onPress }: { on: boolean; title: string; note?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ borderWidth: 1, borderColor: on ? C.ink : C.line, padding: 14, marginBottom: 8 }}>
      <Text style={{ fontWeight: "600" }}>{title}</Text>
      {note && <Muted style={{ fontSize: 13, marginTop: 2 }}>{note}</Muted>}
    </Pressable>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: bold ? 6 : 2 }}>
      <Text style={{ fontSize: bold ? 18 : 14 }}>{label}</Text>
      <Text style={{ fontSize: bold ? 18 : 14, fontWeight: bold ? "700" : "400" }}>{value}</Text>
    </View>
  );
}
