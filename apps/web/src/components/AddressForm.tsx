"use client";

import { NIGERIAN_STATES, saveAddress, type Address } from "@belkas/shared";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function AddressForm({
  defaultName = "",
  defaultPhone = "",
  makeDefault = false,
  onSaved,
  onCancel,
}: {
  defaultName?: string;
  defaultPhone?: string;
  makeDefault?: boolean;
  onSaved: (a: Address) => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState({
    full_name: defaultName,
    phone: defaultPhone,
    state: "Lagos",
    city: "",
    street: "",
    landmark: "",
    is_default: makeDefault,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^(\+?234|0)[789][01]\d{8}$/.test(f.phone.replace(/\s|-/g, ""))) {
      setError("Enter a valid Nigerian phone number, e.g. 0803 123 4567");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveAddress(supabaseBrowser(), f));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="a-name">Full name</label>
        <input id="a-name" className="input" required value={f.full_name} onChange={set("full_name")} autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="a-phone">Phone</label>
        <input id="a-phone" className="input" required value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" />
      </div>
      <div>
        <label className="label" htmlFor="a-state">State</label>
        <select id="a-state" className="input" value={f.state} onChange={set("state")}>
          {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="a-city">City / area</label>
        <input id="a-city" className="input" required value={f.city} onChange={set("city")} placeholder="e.g. Lekki Phase 1" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="a-street">Street address</label>
        <input id="a-street" className="input" required value={f.street} onChange={set("street")} autoComplete="street-address" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="a-landmark">Nearest landmark (optional)</label>
        <input id="a-landmark" className="input" value={f.landmark} onChange={set("landmark")} placeholder="e.g. opposite Shoprite" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={f.is_default} onChange={set("is_default")} className="accent-[var(--color-accent)]" /> Make this my default address
      </label>
      {error && <p className="text-sm text-accent sm:col-span-2" role="alert">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
        {onCancel && <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
