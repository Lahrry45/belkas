import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle } from "react-native";
import { formatNaira, type Product } from "@belkas/shared";
import { C, F, S } from "@/lib/theme";
import { useApp } from "@/lib/app";

export const Display = ({ style, ...p }: TextProps) => <Text {...p} style={[styles.display, style]} />;
export const Eyebrow = ({ style, ...p }: TextProps) => <Text {...p} style={[styles.eyebrow, style]} />;
export const Body = ({ style, ...p }: TextProps) => <Text {...p} style={[styles.body, style]} />;
export const Muted = ({ style, ...p }: TextProps) => <Text {...p} style={[styles.body, { color: C.muted }, style]} />;

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "accent" | "outline";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg = variant === "primary" ? C.ink : variant === "accent" ? C.accent : "transparent";
  const fg = variant === "outline" ? C.ink : "#fff";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: C.ink, borderWidth: variant === "outline" ? 1 : 0, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Skeleton({ style }: { style?: ViewStyle }) {
  const [o] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={[{ backgroundColor: C.sand, opacity: o }, style]} />;
}

export function Heart({ productId, size = 18 }: { productId: string; size?: number }) {
  const { session, wishlist, toggleWish } = useApp();
  const on = wishlist.has(productId);
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={on ? "Remove from wishlist" : "Save to wishlist"}
      onPress={() => (session ? toggleWish(productId) : router.push("/login"))}
      style={styles.heart}
    >
      <Text style={{ fontSize: size, color: on ? C.accent : C.ink }}>{on ? "♥" : "♡"}</Text>
    </Pressable>
  );
}

export function ProductCard({ product, width }: { product: Product; width: number }) {
  return (
    <Pressable onPress={() => router.push(`/product/${product.slug}`)} style={{ width }} accessibilityRole="link" accessibilityLabel={product.name}>
      <View>
        <Image
          source={{ uri: product.images[0] }}
          style={{ width, height: width * 1.25, backgroundColor: C.sand }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={product.id}
        />
        <View style={{ position: "absolute", top: 8, right: 8 }}>
          <Heart productId={product.id} />
        </View>
        {product.stock <= 0 && <Text style={styles.soldOut}>SOLD OUT</Text>}
      </View>
      <Text style={styles.cardClass}>{product.category.toUpperCase()}</Text>
      <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
      <Text style={styles.cardPrice}>{formatNaira(product.price_naira)}</Text>
    </Pressable>
  );
}

export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width }}>
      <Skeleton style={{ width, height: width * 1.25 }} />
      <Skeleton style={{ width: 60, height: 10, marginTop: 10 }} />
      <Skeleton style={{ width: width * 0.8, height: 14, marginTop: 6 }} />
    </View>
  );
}

export function Empty({ title, note, action, onAction }: { title: string; note?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 64, paddingHorizontal: S.gutter }}>
      <Display style={{ fontSize: 28, textAlign: "center" }}>{title}</Display>
      {note && <Muted style={{ marginTop: 8, textAlign: "center" }}>{note}</Muted>}
      {action && <Button title={action} onPress={onAction} style={{ marginTop: 24, paddingHorizontal: 28 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: F.display, fontSize: 34, color: C.ink, letterSpacing: -0.3 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2.5, color: C.accent },
  body: { fontSize: 15, color: C.ink, lineHeight: 22 },
  btn: { height: 52, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { fontSize: 15, fontWeight: "600", letterSpacing: 0.3 },
  heart: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  soldOut: { position: "absolute", left: 8, top: 8, backgroundColor: "#fff", paddingHorizontal: 6, paddingVertical: 3, fontSize: 10, letterSpacing: 1 },
  cardClass: { marginTop: 10, fontSize: 10, letterSpacing: 1.6, color: C.muted },
  cardName: { marginTop: 3, fontSize: 14, color: C.ink },
  cardPrice: { marginTop: 2, fontSize: 14, fontWeight: "600", color: C.ink },
});
