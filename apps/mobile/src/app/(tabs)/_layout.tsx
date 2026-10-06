import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useCart } from "@/lib/app";
import { C } from "@/lib/theme";

/** Persistent bottom tab bar. The Cart badge updates live as the cart syncs. */
export default function TabsLayout() {
  const { count } = useCart();
  return (
    <NativeTabs tintColor={C.accent} labelStyle={{ selected: { color: C.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shop">
        <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "bag", selected: "bag.fill" }} md="shopping_bag" />
        {count > 0 && <NativeTabs.Trigger.Badge>{count > 99 ? "99+" : String(count)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wishlist">
        <NativeTabs.Trigger.Label>Wishlist</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "heart", selected: "heart.fill" }} md="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
