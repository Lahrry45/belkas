import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PRODUCT_COLUMNS, type Product } from "@belkas/shared";
import { Display, Empty, ProductCard, ProductCardSkeleton } from "@/components/ui";
import { useApp } from "@/lib/app";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";

export default function Wishlist() {
  const { session, wishlist } = useApp();
  const { width } = useWindowDimensions();
  const cardW = (width - S.gutter * 2 - 12) / 2;
  const [products, setProducts] = useState<Product[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from("wishlist")
        .select(`created_at, product:products(${PRODUCT_COLUMNS})`)
        .order("created_at", { ascending: false })
        .then(({ data }) => setProducts(((data ?? []) as unknown as { product: Product | null }[]).map((r) => r.product).filter((p): p is Product => !!p)));
    }, [session]),
  );

  const visible = products?.filter((p) => wishlist.has(p.id)) ?? null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={{ paddingHorizontal: S.gutter, paddingTop: 8 }}>
        <Display>Wishlist</Display>
      </View>
      {!session ? (
        <Empty title="Save shoes you love" note="Sign in to keep a wishlist on the app and the website." action="Sign in" onAction={() => router.push("/login")} />
      ) : (
        <FlatList
          data={visible ?? (Array.from({ length: 4 }, (_, i) => ({ id: `s${i}` })) as unknown as Product[])}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: S.gutter, rowGap: 28 }}
          renderItem={({ item }) => (visible ? <ProductCard product={item} width={cardW} /> : <ProductCardSkeleton width={cardW} />)}
          ListEmptyComponent={<Empty title="No saved shoes yet" note="Tap the heart on any shoe to save it here." action="Browse the shop" onAction={() => router.push("/shop")} />}
        />
      )}
    </SafeAreaView>
  );
}
