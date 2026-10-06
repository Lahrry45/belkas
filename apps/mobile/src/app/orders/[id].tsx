import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { fetchOrder, formatNaira, type OrderWithItems } from "@belkas/shared";
import { OrderTimeline } from "@/components/OrderTimeline";
import { Button, Display, Eyebrow, Muted, Skeleton } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const [order, setOrder] = useState<OrderWithItems | null>(null);

  useEffect(() => {
    fetchOrder(supabase, id).then(setOrder);
    // Live status updates when the shop changes the order (Realtime on public.orders).
    const ch = supabase
      .channel(`order:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, () => fetchOrder(supabase, id).then(setOrder))
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [id]);

  if (!order) return <View style={{ padding: S.gutter, gap: 12 }}><Skeleton style={{ height: 40 }} /><Skeleton style={{ height: 200 }} /></View>;
  const a = order.delivery_address;

  return (
    <ScrollView style={{ backgroundColor: C.paper }} contentContainerStyle={{ padding: S.gutter, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: order.order_number, headerBackVisible: !placed, gestureEnabled: !placed }} />
      {placed ? (
        <View style={{ backgroundColor: C.sand, padding: 24, alignItems: "center", marginBottom: 24 }}>
          <Eyebrow>THANK YOU</Eyebrow>
          <Display style={{ textAlign: "center", marginTop: 8 }}>Your order is confirmed</Display>
          <Muted style={{ textAlign: "center", marginTop: 8 }}>We&apos;ve emailed a confirmation to {order.email}. Order {order.order_number}.</Muted>
          <Button title="Continue shopping" onPress={() => router.dismissTo("/")} style={{ marginTop: 18, alignSelf: "stretch" }} />
        </View>
      ) : null}

      <Text style={label}>STATUS</Text>
      <OrderTimeline order={order} />

      <Text style={label}>ITEMS</Text>
      {order.order_items.map((i) => (
        <View key={i.id} style={{ flexDirection: "row", gap: 12, paddingVertical: 8 }}>
          <Image source={{ uri: i.image ?? undefined }} style={{ width: 56, height: 70, backgroundColor: C.sand }} />
          <View style={{ flex: 1 }}>
            <Text>{i.name}</Text>
            <Muted style={{ fontSize: 13 }}>Size {i.size} · Qty {i.quantity}</Muted>
          </View>
          <Text>{formatNaira(i.price_naira * i.quantity)}</Text>
        </View>
      ))}
      <View style={{ borderTopWidth: 1, borderColor: C.line, marginTop: 10, paddingTop: 10, gap: 4 }}>
        <Row l="Subtotal" v={formatNaira(order.subtotal)} />
        <Row l="Delivery" v={order.delivery_fee ? formatNaira(order.delivery_fee) : "Free"} />
        <Row l="Total" v={formatNaira(order.total)} bold />
      </View>

      <Text style={label}>{a.pickup ? "PICKUP" : "DELIVERY ADDRESS"}</Text>
      <Text style={{ lineHeight: 22 }}>
        {a.pickup ? "Store pickup, Lagos. We'll call you when it's ready." : `${a.full_name}\n${a.street}${a.landmark ? `, near ${a.landmark}` : ""}\n${a.city}, ${a.state}\n${a.phone}`}
      </Text>
      <Text style={label}>PAYMENT</Text>
      <Text>
        {order.payment_method === "paystack" ? "Paystack" : "Pay on delivery"}
        {order.payment_status === "paid" ? " · Paid" : order.payment_status === "awaiting" ? " · Awaiting payment" : ""}
      </Text>
    </ScrollView>
  );
}

const label = { fontSize: 11, letterSpacing: 1.6, color: C.muted, fontWeight: "600" as const, marginTop: 28, marginBottom: 12 };
function Row({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: bold ? 18 : 14 }}>{l}</Text>
      <Text style={{ fontSize: bold ? 18 : 14, fontWeight: bold ? "700" : "400" }}>{v}</Text>
    </View>
  );
}
