import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CATEGORIES, fetchProducts, type Product, type ProductFilters } from "@belkas/shared";
import { Button, Display, Muted, ProductCard, ProductCardSkeleton } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";

const SIZES = ["40", "41", "42", "43", "44", "45", "46"];
const PRICES = [
  { label: "Any price", min: null, max: null },
  { label: "Under ₦30,000", min: null, max: 29999 },
  { label: "₦30,000 – ₦35,000", min: 30000, max: 35000 },
  { label: "₦35,000 and up", min: 35000, max: null },
] as const;

export default function Shop() {
  const params = useLocalSearchParams<{ class?: string }>();
  const { width } = useWindowDimensions();
  const cardW = (width - S.gutter * 2 - 12) / 2;
  const [cls, setCls] = useState<string | null>(params.class ?? null);
  const [sizes, setSizes] = useState<string[]>([]);
  const [price, setPrice] = useState(0);
  const [sort, setSort] = useState<ProductFilters["sort"]>("newest");
  const [result, setResult] = useState<{ key: string; products: Product[] } | null>(null);
  const [open, setOpen] = useState(false);

  // Follow "Shop by class" links from Home (adjust state during render, not in an effect).
  const [lastParam, setLastParam] = useState(params.class);
  if (params.class !== lastParam) {
    setLastParam(params.class);
    if (params.class) setCls(params.class);
  }

  const key = JSON.stringify([cls, sizes, price, sort]);
  useEffect(() => {
    let alive = true;
    const p = PRICES[price];
    fetchProducts(supabase, { category: cls, sizes, minPrice: p.min, maxPrice: p.max, sort })
      .then((products) => alive && setResult({ key, products }))
      .catch(() => alive && setResult({ key, products: [] }));
    return () => {
      alive = false;
    };
  }, [key, cls, sizes, price, sort]);
  const products = result?.key === key ? result.products : null;

  const activeCount = sizes.length + (price ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.paper }}>
      <View style={{ paddingHorizontal: S.gutter, paddingTop: 8 }}>
        <Display>{cls ? `${cls}s` : "All shoes"}</Display>
      </View>
      <View style={{ borderBottomWidth: 1, borderColor: C.line, paddingVertical: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: 8 }}>
          <Chip label={activeCount ? `Filters (${activeCount})` : "Filters"} on={activeCount > 0} onPress={() => setOpen(true)} />
          {[null, ...CATEGORIES].map((c) => (
            <Chip key={c ?? "all"} label={c ? `${c}s` : "All"} on={cls === c} onPress={() => setCls(c)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={products ?? (Array.from({ length: 6 }, (_, i) => ({ id: `s${i}` })) as unknown as Product[])}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: S.gutter, rowGap: 28, paddingBottom: 48 }}
        renderItem={({ item }) => (products ? <ProductCard product={item} width={cardW} /> : <ProductCardSkeleton width={cardW} />)}
        ListEmptyComponent={<Muted style={{ textAlign: "center", marginTop: 48 }}>No shoes match these filters.</Muted>}
        initialNumToRender={6}
        windowSize={7}
      />

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <Display>Filters</Display>
          <Text style={label}>SIZE (EU)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SIZES.map((s) => (
              <Chip key={s} label={s} on={sizes.includes(s)} onPress={() => setSizes(sizes.includes(s) ? sizes.filter((x) => x !== s) : [...sizes, s])} />
            ))}
          </View>
          <Text style={label}>PRICE</Text>
          {PRICES.map((p, i) => (
            <Pressable key={p.label} onPress={() => setPrice(i)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: C.ink, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                {price === i && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent }} />}
              </View>
              <Text style={{ fontSize: 15 }}>{p.label}</Text>
            </Pressable>
          ))}
          <Text style={label}>SORT</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {([["newest", "Newest"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"]] as const).map(([v, l]) => (
              <Chip key={v} label={l} on={sort === v} onPress={() => setSort(v)} />
            ))}
          </View>
          <Button title="Show results" onPress={() => setOpen(false)} style={{ marginTop: 32 }} />
          <Button title="Clear all" variant="outline" onPress={() => { setSizes([]); setPrice(0); setSort("newest"); }} style={{ marginTop: 10 }} />
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}

const label = { fontSize: 11, letterSpacing: 1.6, color: C.muted, marginTop: 28, marginBottom: 10, fontWeight: "600" as const };

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ height: 38, minWidth: 44, paddingHorizontal: 14, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: on ? C.ink : C.line, backgroundColor: on ? C.ink : C.paper }}
    >
      <Text style={{ color: on ? "#fff" : C.ink, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
