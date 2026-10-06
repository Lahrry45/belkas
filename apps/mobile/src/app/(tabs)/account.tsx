import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Address, Profile } from "@belkas/shared";
import { AddressForm } from "@/components/AddressForm";
import { Button, Display, Empty, Eyebrow, Muted } from "@/components/ui";
import { useApp } from "@/lib/app";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { C, S } from "@/lib/theme";

export default function Account() {
  const { session } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setProfile(p as Profile);
    setName(p?.full_name ?? "");
    setPhone(p?.phone ?? "");
    setAddresses((a ?? []) as Address[]);
  }, [session]);
  useFocusEffect(useCallback(() => void load(), [load]));

  if (!session) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.paper }}>
        <Empty title="Your account" note="Sign in once and your cart, orders and wishlist follow you on the app and the website." action="Sign in" onAction={() => router.push("/login")} />
      </SafeAreaView>
    );
  }

  async function saveProfile() {
    const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", session!.user.id);
    Alert.alert(error ? "Couldn't save" : "Saved", error?.message ?? "Your profile is up to date.");
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ padding: S.gutter, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Eyebrow>ACCOUNT</Eyebrow>
        <Display style={{ marginTop: 6 }}>Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</Display>
        <Muted>{session.user.email}</Muted>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <Button title="Your orders" variant="outline" onPress={() => router.push("/orders")} style={{ flex: 1 }} />
          <Button title="Wishlist" variant="outline" onPress={() => router.push("/wishlist")} style={{ flex: 1 }} />
        </View>

        <Display style={{ fontSize: 24, marginTop: 36 }}>Profile</Display>
        <Text style={lbl}>FULL NAME</Text>
        <TextInput value={name} onChangeText={setName} style={input} autoComplete="name" />
        <Text style={lbl}>PHONE</Text>
        <TextInput value={phone} onChangeText={setPhone} style={input} keyboardType="phone-pad" placeholder="0803 123 4567" autoComplete="tel" />
        <Button title="Save profile" onPress={saveProfile} style={{ marginTop: 14 }} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 36 }}>
          <Display style={{ fontSize: 24 }}>Addresses</Display>
          {!adding && (
            <Pressable onPress={() => setAdding(true)} hitSlop={8}>
              <Text style={{ textDecorationLine: "underline" }}>Add address</Text>
            </Pressable>
          )}
        </View>
        {addresses.map((a) => (
          <View key={a.id} style={{ borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 12 }}>
            {a.is_default && <Eyebrow style={{ marginBottom: 6 }}>DEFAULT</Eyebrow>}
            <Text style={{ fontWeight: "600" }}>{a.full_name}</Text>
            <Text>{a.street}{a.landmark ? `, near ${a.landmark}` : ""}</Text>
            <Text>{a.city}, {a.state}</Text>
            <Muted>{a.phone}</Muted>
            <Pressable onPress={async () => { await supabase.from("addresses").delete().eq("id", a.id); load(); }} hitSlop={8} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: C.muted, letterSpacing: 1 }}>DELETE</Text>
            </Pressable>
          </View>
        ))}
        {addresses.length === 0 && !adding && <Muted style={{ marginTop: 10 }}>No saved addresses yet.</Muted>}
        {adding && (
          <View style={{ borderWidth: 1, borderColor: C.line, padding: 14, marginTop: 12 }}>
            <AddressForm defaultName={name} defaultPhone={phone} makeDefault={addresses.length === 0} onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
          </View>
        )}

        <Pressable onPress={() => Alert.alert("Sign out?", "", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => signOut() }])} style={{ marginTop: 48 }}>
          <Text style={{ textDecorationLine: "underline" }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const lbl = { fontSize: 11, letterSpacing: 1.6, color: C.muted, marginTop: 16, marginBottom: 6, fontWeight: "600" as const };
const input = { height: 48, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, fontSize: 15, color: C.ink };
