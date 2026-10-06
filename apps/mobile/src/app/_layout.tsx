import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppProvider, useApp } from "@/lib/app";
import { C, F } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

function Root() {
  const { ready } = useApp();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  return (
    <Stack
      screenOptions={{
        headerTintColor: C.ink,
        headerTitleStyle: { fontFamily: F.display, fontSize: 20 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: C.paper },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[slug]" options={{ title: "" }} />
      <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
      <Stack.Screen name="orders/index" options={{ title: "Your orders" }} />
      <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
      <Stack.Screen name="login" options={{ title: "Sign in", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Root />
    </AppProvider>
  );
}
