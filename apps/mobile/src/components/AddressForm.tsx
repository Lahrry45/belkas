import { NIGERIAN_STATES, saveAddress, type Address } from "@belkas/shared";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Button, Display } from "./ui";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

export function AddressForm({ defaultName = "", defaultPhone = "", makeDefault = false, onSaved, onCancel }: {
  defaultName?: string; defaultPhone?: string; makeDefault?: boolean; onSaved: (a: Address) => void; onCancel?: () => void;
}) {
  const [f, setF] = useState({ full_name: defaultName, phone: defaultPhone, state: "Lagos", city: "", street: "", landmark: "", is_default: makeDefault });
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!f.full_name || !f.city || !f.street) return setError("Please fill in name, city and street.");
    if (!/^(\+?234|0)[789][01]\d{8}$/.test(f.phone.replace(/\s|-/g, ""))) return setError("Enter a valid Nigerian phone number, e.g. 0803 123 4567");
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveAddress(supabase, f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof f, label: string, props: object = {}) => (
    <View style={{ marginTop: 12 }}>
      <Text style={lbl}>{label}</Text>
      <TextInput value={String(f[key])} onChangeText={(v) => setF({ ...f, [key]: v })} style={input} {...props} />
    </View>
  );

  return (
    <View>
      {field("full_name", "FULL NAME", { autoComplete: "name" })}
      {field("phone", "PHONE", { keyboardType: "phone-pad", placeholder: "0803 123 4567", autoComplete: "tel" })}
      <View style={{ marginTop: 12 }}>
        <Text style={lbl}>STATE</Text>
        <Pressable onPress={() => setPicking(true)} style={[input, { justifyContent: "center" }]} accessibilityRole="button" accessibilityLabel={`State, ${f.state}`}>
          <Text style={{ fontSize: 15 }}>{f.state}  ▾</Text>
        </Pressable>
      </View>
      {field("city", "CITY / AREA", { placeholder: "e.g. Lekki Phase 1" })}
      {field("street", "STREET ADDRESS", { autoComplete: "street-address" })}
      {field("landmark", "NEAREST LANDMARK (OPTIONAL)", { placeholder: "e.g. opposite Shoprite" })}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <Text>Make this my default address</Text>
        <Switch value={f.is_default} onValueChange={(v) => setF({ ...f, is_default: v })} trackColor={{ true: C.accent }} />
      </View>
      {error && <Text style={{ color: C.accent, marginTop: 10 }}>{error}</Text>}
      <Button title="Save address" onPress={submit} loading={busy} style={{ marginTop: 16 }} />
      {onCancel && <Button title="Cancel" variant="outline" onPress={onCancel} style={{ marginTop: 8 }} />}

      <Modal visible={picking} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicking(false)}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          <Display style={{ marginBottom: 12 }}>Choose state</Display>
          {NIGERIAN_STATES.map((s) => (
            <Pressable key={s} onPress={() => { setF({ ...f, state: s }); setPicking(false); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line }}>
              <Text style={{ fontSize: 16, color: s === f.state ? C.accent : C.ink }}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
}

const lbl = { fontSize: 11, letterSpacing: 1.6, color: C.muted, marginBottom: 6, fontWeight: "600" as const };
const input = { height: 48, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, fontSize: 15, color: C.ink };
