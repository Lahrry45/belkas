import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button, Display, Eyebrow, Muted } from "@/components/ui";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const done = () => (router.canGoBack() ? router.back() : router.replace("/"));

  async function google() {
    setBusy("google");
    setError(null);
    try {
      if (await signInWithGoogle()) done();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy("email");
    setError(null);
    setInfo(null);
    const res =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name } } });
    setBusy(null);
    if (res.error) return setError(res.error.message);
    if (res.data.session) done();
    else setInfo("Check your inbox to confirm your email, then sign in.");
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <Eyebrow>WELCOME</Eyebrow>
        <Display style={{ marginTop: 8 }}>Sign in</Display>
        <Muted style={{ marginTop: 6 }}>One account for the app and the website. Your cart follows you.</Muted>

        <Button title="Continue with Google" variant="outline" onPress={google} loading={busy === "google"} style={{ marginTop: 28 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
          <Text style={{ color: C.muted, fontSize: 12 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        </View>

        {mode === "signup" && <TextInput placeholder="Full name" value={name} onChangeText={setName} style={input} autoComplete="name" />}
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextInput placeholder="Password (8+ characters)" value={password} onChangeText={setPassword} style={input} secureTextEntry autoComplete={mode === "signin" ? "current-password" : "new-password"} />
        {error && <Text style={{ color: C.accent, marginTop: 6 }}>{error}</Text>}
        {info && <Text style={{ marginTop: 6 }}>{info}</Text>}
        <Button title={mode === "signin" ? "Sign in" : "Create account"} onPress={submit} loading={busy === "email"} disabled={!email || password.length < 8} style={{ marginTop: 12 }} />

        <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} style={{ marginTop: 20, alignItems: "center" }}>
          <Text style={{ color: C.muted }}>
            {mode === "signin" ? "New here? " : "Already have an account? "}
            <Text style={{ color: C.ink, textDecorationLine: "underline" }}>{mode === "signin" ? "Create an account" : "Sign in"}</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const input = { height: 50, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, fontSize: 15, color: C.ink, marginBottom: 10 };
