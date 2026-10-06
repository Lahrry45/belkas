import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

/**
 * SecureStore (Keychain / Android Keystore) only holds ~2 KB per key, and a Supabase session is bigger,
 * so the session is split into chunks. Sessions survive app restarts and stay encrypted at rest.
 */
const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string) {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    if (!count) return SecureStore.getItemAsync(key);
    const parts = await Promise.all(Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    await secureStorage.removeItem(key);
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK) parts.push(value.slice(i, i + CHUNK));
    if (parts.length === 0) parts.push("");
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const count = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(`${key}.n`),
      ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
    ]);
  },
};

// Only the public anon key ships in the app. Secret keys live in Supabase Edge Function secrets.
export const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
