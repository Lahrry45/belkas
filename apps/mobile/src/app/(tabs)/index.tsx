import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CATEGORIES, fetchProducts, type Product } from "@belkas/shared";
import { Body, Button, Display, Eyebrow, Muted, ProductCard, ProductCardSkeleton } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";

export default function Home() {
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const cardW = (width - S.gutter * 2 - 12) / 2;

  const load = useCallback(
    () =>
      fetchProducts(supabase)
        .then(setProducts)
        .catch(() => setProducts((p) => p ?? [])),
    [],
  );
  useEffect(() => {
    fetchProducts(supabase)
      .then(setProducts)
      .catch(() => setProducts((p) => p ?? []));
  }, []);

  const hero = products?.find((p) => p.slug === "black-patent-loafer") ?? products?.[0];
  const covers = CATEGORIES.map((c) => ({ c, p: products?.find((p) => p.category === c) })).filter((x) => x.p);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={{ paddingHorizontal: S.gutter, paddingVertical: 12 }}>
          <Text style={{ fontSize: 20, letterSpacing: 5, color: C.ink, fontFamily: "serif" }}>BELKA&apos;S</Text>
        </View>

        {hero ? (
          <Pressable onPress={() => router.push(`/product/${hero.slug}`)}>
            <Image source={{ uri: hero.images[0] }} style={{ width, height: width * 0.95, backgroundColor: C.sand }} contentFit="cover" priority="high" />
          </Pressable>
        ) : (
          <View style={{ width, height: width * 0.95, backgroundColor: C.sand }} />
        )}

        <View style={{ padding: S.gutter, paddingTop: 24 }}>
          <Eyebrow>NEW SEASON · LAGOS</Eyebrow>
          <Display style={{ fontSize: 44, lineHeight: 46, marginTop: 10 }}>
            Shoes that <Text style={{ color: C.accent, fontStyle: "italic" }}>carry</Text> the day.
          </Display>
          <Muted style={{ marginTop: 12 }}>Delivered anywhere in Nigeria. Pay with Paystack or on delivery.</Muted>
          <Button title="Shop the collection" onPress={() => router.push("/shop")} style={{ marginTop: 20 }} />
        </View>

        <Section title="Shop by class" onAll={() => router.push("/shop")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: 12 }}>
          {covers.map(({ c, p }) => (
            <Pressable key={c} onPress={() => router.push({ pathname: "/shop", params: { class: c } })} style={{ width: 120 }}>
              <Image source={{ uri: p!.images[0] }} style={{ width: 120, height: 120, backgroundColor: C.sand }} contentFit="cover" />
              <Body style={{ marginTop: 8, fontWeight: "600", fontSize: 14 }}>{c}s</Body>
            </Pressable>
          ))}
        </ScrollView>

        <Section title="New arrivals" onAll={() => router.push("/shop")} />
        <Grid products={products?.slice(0, 4) ?? null} cardW={cardW} />

        <View style={{ backgroundColor: C.ink, padding: 24, marginTop: 40 }}>
          {[
            ["Delivery nationwide", "Lagos in 1–2 days, other states in 2–5 working days."],
            ["Pay your way", "Card, transfer or USSD with Paystack, or pay on delivery."],
          ].map(([t, d]) => (
            <View key={t} style={{ marginVertical: 10 }}>
              <Display style={{ color: "#fff", fontSize: 24 }}>{t}</Display>
              <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{d}</Text>
            </View>
          ))}
        </View>

        <Section title="Best sellers" onAll={() => router.push("/shop")} />
        <Grid products={products?.filter((p) => p.is_featured).slice(0, 4) ?? null} cardW={cardW} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, onAll }: { title: string; onAll: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: S.gutter, marginTop: 36, marginBottom: 16 }}>
      <Display style={{ fontSize: 28 }}>{title}</Display>
      <Pressable onPress={onAll} hitSlop={10}>
        <Text style={{ textDecorationLine: "underline", color: C.ink }}>View all</Text>
      </Pressable>
    </View>
  );
}

function Grid({ products, cardW }: { products: Product[] | null; cardW: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, rowGap: 28, paddingHorizontal: S.gutter }}>
      {products === null
        ? [0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} width={cardW} />)
        : products.map((p) => <ProductCard key={p.id} product={p} width={cardW} />)}
    </View>
  );
}
