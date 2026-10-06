import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SIZE_GUIDE, fetchProduct, formatNaira, type Product } from "@belkas/shared";
import { Button, Display, Eyebrow, Heart, Muted, Skeleton } from "@/components/ui";
import { useApp } from "@/lib/app";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const { cart, session } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [guide, setGuide] = useState(false);
  const [needSize, setNeedSize] = useState(false);

  useEffect(() => {
    fetchProduct(supabase, slug).then(setProduct).catch(() => Alert.alert("Couldn't load this shoe", "Check your connection and try again."));
  }, [slug]);

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: C.paper }}>
        <Skeleton style={{ width, height: width }} />
        <View style={{ padding: S.gutter, gap: 10 }}>
          <Skeleton style={{ width: 80, height: 10 }} />
          <Skeleton style={{ width: "70%", height: 30 }} />
          <Skeleton style={{ width: 100, height: 20 }} />
        </View>
      </View>
    );
  }

  const soldOut = product.stock <= 0;
  function add(buyNow: boolean) {
    if (!size) return setNeedSize(true);
    void cart.add(product!, size, 1);
    if (buyNow) router.push(session ? "/checkout" : "/login");
    else Alert.alert("Added to cart", `${product!.name}, size ${size}`, [
      { text: "Keep shopping", style: "cancel" },
      { text: "View cart", onPress: () => router.navigate("/cart") },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <Stack.Screen options={{ title: "", headerRight: () => <Heart productId={product.id} /> }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Swipeable gallery */}
        <FlatList
          data={product.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u) => u}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <Image source={{ uri: item }} style={{ width, height: width, backgroundColor: C.sand }} contentFit="cover" priority={i === 0 ? "high" : "normal"} accessibilityLabel={`${product.name}, photo ${i + 1}`} />
          )}
        />
        {product.images.length > 1 && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
            {product.images.map((_, i) => (
              <View key={i} style={{ height: 6, width: i === index ? 18 : 6, borderRadius: 3, backgroundColor: i === index ? C.ink : C.line }} />
            ))}
          </View>
        )}

        <View style={{ padding: S.gutter, paddingTop: 20 }}>
          <Eyebrow>{product.category.toUpperCase()}</Eyebrow>
          <Display style={{ marginTop: 8, fontSize: 36 }}>{product.name}</Display>
          <Text style={{ fontSize: 22, marginTop: 8 }}>{formatNaira(product.price_naira)}</Text>
          <Muted style={{ marginTop: 14 }}>{product.description}</Muted>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 28, marginBottom: 10 }}>
            <Text style={{ fontSize: 11, letterSpacing: 1.6, color: C.muted, fontWeight: "600" }}>SELECT SIZE (EU)</Text>
            <Pressable onPress={() => setGuide(true)} hitSlop={8}>
              <Text style={{ fontSize: 13, textDecorationLine: "underline" }}>Size guide</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
            {product.sizes_available.map((s) => (
              <Pressable
                key={s}
                disabled={soldOut}
                onPress={() => { setSize(s); setNeedSize(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: size === s }}
                style={{ width: (width - S.gutter * 2 - 8 * 4) / 5, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: size === s ? C.ink : C.line, backgroundColor: size === s ? C.ink : C.paper, opacity: soldOut ? 0.4 : 1 }}
              >
                <Text style={{ color: size === s ? "#fff" : C.ink, fontSize: 15 }}>{s}</Text>
              </Pressable>
            ))}
          </View>
          {needSize && <Text style={{ color: C.accent, marginTop: 8 }}>Please choose a size.</Text>}
          <Text style={{ marginTop: 14, color: product.stock <= 3 ? C.accent : C.muted }}>
            {soldOut ? "Sold out. Check back soon." : product.stock <= 3 ? `Only ${product.stock} left in stock` : "In stock, ready to ship"}
          </Text>
          <Muted style={{ marginTop: 20, fontSize: 13 }}>Lagos delivery ₦3,000 · other states ₦6,000 · free store pickup</Muted>
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.paper, borderTopWidth: 1, borderColor: C.line, padding: S.gutter, paddingBottom: 28, flexDirection: "row", gap: 10 }}>
        <Button title="Add to cart" disabled={soldOut} onPress={() => add(false)} style={{ flex: 1 }} />
        <Button title="Buy now" variant="accent" disabled={soldOut} onPress={() => add(true)} style={{ flex: 1 }} />
      </View>

      <Modal visible={guide} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGuide(false)}>
        <View style={{ padding: 20 }}>
          <Display>Size guide</Display>
          <Muted style={{ marginTop: 6 }}>Measure your foot from heel to longest toe and pick the closest length.</Muted>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: C.line, paddingVertical: 8, marginTop: 16 }}>
            {["EU", "UK", "US", "Foot (cm)"].map((h) => <Text key={h} style={{ flex: 1, fontSize: 12, color: C.muted }}>{h}</Text>)}
          </View>
          {SIZE_GUIDE.filter((r) => product.sizes_available.includes(r.eu)).map((r) => (
            <View key={r.eu} style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: C.line, paddingVertical: 10 }}>
              {[r.eu, r.uk, r.us, r.cm].map((v, i) => <Text key={i} style={{ flex: 1, fontWeight: i === 0 ? "600" : "400" }}>{v}</Text>)}
            </View>
          ))}
          <Button title="Close" variant="outline" onPress={() => setGuide(false)} style={{ marginTop: 24 }} />
        </View>
      </Modal>
    </View>
  );
}
