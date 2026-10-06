import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatNaira, keyOf } from "@belkas/shared";
import { Button, Display, Empty, Muted, Skeleton } from "@/components/ui";
import { useApp, useCart } from "@/lib/app";
import { C, S } from "@/lib/theme";

export default function Cart() {
  const { session } = useApp();
  const { lines, loading, count, error, store } = useCart();
  const subtotal = lines.reduce((s, l) => s + l.product.price_naira * l.quantity, 0);

  useEffect(() => {
    if (error) {
      Alert.alert("Cart not updated", error);
      store.clearError();
    }
  }, [error, store]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={{ paddingHorizontal: S.gutter, paddingTop: 8, paddingBottom: 4 }}>
        <Display>Your cart</Display>
        <Muted>{count} {count === 1 ? "item" : "items"}</Muted>
      </View>
      {loading ? (
        <View style={{ padding: S.gutter, gap: 16 }}>
          {[0, 1].map((i) => <Skeleton key={i} style={{ height: 112 }} />)}
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={keyOf}
          contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.line }} />}
          ListEmptyComponent={<Empty title="Your cart is empty" note="Find something you'll wear on repeat." action="Shop the collection" onAction={() => router.push("/shop")} />}
          renderItem={({ item: l }) => {
            const key = keyOf(l);
            return (
              <View style={{ flexDirection: "row", gap: 14, paddingVertical: 16 }}>
                <Pressable onPress={() => router.push(`/product/${l.product.slug}`)}>
                  <Image source={{ uri: l.product.images[0] }} style={{ width: 88, height: 108, backgroundColor: C.sand }} contentFit="cover" />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ fontSize: 15, flex: 1 }}>{l.product.name}</Text>
                    <Text style={{ fontSize: 15, fontWeight: "600" }}>{formatNaira(l.product.price_naira * l.quantity)}</Text>
                  </View>
                  <Muted style={{ fontSize: 13, marginTop: 2 }}>Size {l.size} · {formatNaira(l.product.price_naira)} each</Muted>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.line }}>
                      <QtyBtn label="−" a11y={`Decrease quantity of ${l.product.name}`} onPress={() => store.setQuantity(key, l.quantity - 1)} />
                      <Text style={{ width: 32, textAlign: "center", fontVariant: ["tabular-nums"] }}>{l.quantity}</Text>
                      <QtyBtn label="+" a11y={`Increase quantity of ${l.product.name}`} disabled={l.quantity >= l.product.stock} onPress={() => store.setQuantity(key, l.quantity + 1)} />
                    </View>
                    <Pressable hitSlop={10} onPress={() => store.remove(key)} accessibilityRole="button" accessibilityLabel={`Remove ${l.product.name}`}>
                      <Text style={{ fontSize: 12, letterSpacing: 1, color: C.muted }}>REMOVE</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
      {lines.length > 0 && (
        <View style={{ borderTopWidth: 1, borderColor: C.line, padding: S.gutter, gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16 }}>Subtotal</Text>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>{formatNaira(subtotal)}</Text>
          </View>
          <Muted style={{ fontSize: 12 }}>Delivery calculated at checkout.</Muted>
          <Button title="Checkout" variant="accent" style={{ marginTop: 10 }} onPress={() => router.push(session ? "/checkout" : "/login")} />
        </View>
      )}
    </SafeAreaView>
  );
}

function QtyBtn({ label, a11y, onPress, disabled }: { label: string; a11y: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.3 : 1 }}>
      <Text style={{ fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}
