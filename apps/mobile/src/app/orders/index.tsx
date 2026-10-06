import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { fetchOrders, formatNaira, type OrderWithItems } from "@belkas/shared";
import { Empty, Muted, Skeleton } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";
import { STATUS_LABEL } from "@/components/OrderTimeline";

export default function Orders() {
  const [orders, setOrders] = useState<OrderWithItems[] | null>(null);
  useFocusEffect(useCallback(() => void fetchOrders(supabase).then(setOrders).catch(() => setOrders([])), []));

  if (!orders) return <View style={{ padding: S.gutter, gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 80 }} />)}</View>;
  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      style={{ backgroundColor: C.paper }}
      contentContainerStyle={{ padding: S.gutter }}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.line }} />}
      ListEmptyComponent={<Empty title="No orders yet" action="Start shopping" onAction={() => router.navigate("/shop")} />}
      renderItem={({ item: o }) => (
        <Pressable onPress={() => router.push(`/orders/${o.id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
          <Image source={{ uri: o.order_items[0]?.image ?? undefined }} style={{ width: 52, height: 64, backgroundColor: C.sand }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "600" }}>{o.order_number}</Text>
            <Muted style={{ fontSize: 13 }}>{new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · {o.order_items.reduce((n, i) => n + i.quantity, 0)} items</Muted>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontWeight: "600" }}>{formatNaira(o.total)}</Text>
            <Text style={{ fontSize: 11, color: C.accent, letterSpacing: 1 }}>{STATUS_LABEL[o.status].toUpperCase()}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
