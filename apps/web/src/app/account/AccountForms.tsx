"use client";

import type { Address, Profile } from "@belkas/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddressForm } from "@/components/AddressForm";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

export function AccountForms({ profile, addresses }: { profile: Profile | null; addresses: Address[] }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [adding, setAdding] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await sb.from("profiles").update({ full_name: name, phone }).eq("id", profile!.id);
    toast(error ? error.message : "Profile saved", error ? "error" : "success");
    router.refresh();
  }

  async function remove(id: string) {
    const { error } = await sb.from("addresses").delete().eq("id", id);
    if (error) toast(error.message, "error");
    router.refresh();
  }

  return (
    <>
      <section className="mt-12">
        <h2 className="font-display text-3xl">Profile</h2>
        <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pname">Full name</label>
            <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pphone">Phone</label>
            <input id="pphone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0803 000 0000" />
          </div>
          <div><button className="btn-primary">Save profile</button></div>
        </form>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl">Addresses</h2>
          {!adding && <button className="text-sm underline underline-offset-4" onClick={() => setAdding(true)}>Add address</button>}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="border border-line p-4 text-sm leading-relaxed">
              {a.is_default && <p className="eyebrow mb-2">Default</p>}
              <p className="font-medium">{a.full_name}</p>
              <p>{a.street}{a.landmark ? `, near ${a.landmark}` : ""}</p>
              <p>{a.city}, {a.state}</p>
              <p className="text-muted">{a.phone}</p>
              <button className="mt-3 text-xs uppercase tracking-wider text-muted hover:text-ink" onClick={() => remove(a.id)}>Delete</button>
            </div>
          ))}
          {addresses.length === 0 && !adding && <p className="text-sm text-muted">No saved addresses yet.</p>}
        </div>
        {adding && (
          <div className="mt-6 border border-line p-5">
            <AddressForm
              defaultName={name}
              defaultPhone={phone}
              onSaved={() => {
                setAdding(false);
                router.refresh();
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </section>
    </>
  );
}
