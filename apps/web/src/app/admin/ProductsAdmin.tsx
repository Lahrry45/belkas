"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, SHOE_SIZES, formatNaira, slugify, type Product } from "@belkas/shared";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

/** Unique storage path for an uploaded image (kept outside the component: it is impure). */
function uploadPath(fileName: string) {
  const ext = fileName.split(".").pop();
  return `uploads/${Date.now()}-${slugify(fileName.replace(/\.[^.]+$/, ""))}.${ext}`;
}

type Draft = Omit<Product, "id" | "created_at"> & { id?: string };

const blank: Draft = {
  slug: "", name: "", category: "Loafer", description: "", price_naira: 0, images: [],
  sizes_available: ["40", "41", "42", "43", "44", "45", "46"], stock: 10, is_active: true, is_featured: false,
};

export function ProductsAdmin({ initial }: { initial: Product[] }) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  async function quickStock(p: Product, stock: number) {
    const { error } = await sb.from("products").update({ stock: Math.max(0, stock) }).eq("id", p.id);
    if (error) toast(error.message, "error");
    router.refresh();
  }

  async function upload(files: FileList | null) {
    if (!files || !editing) return;
    setBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = uploadPath(file.name);
      const { error } = await sb.storage.from("product-images").upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (error) {
        toast(error.message, "error");
        continue;
      }
      urls.push(sb.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    setEditing({ ...editing, images: [...editing.images, ...urls] });
    setBusy(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const { id, ...row } = { ...editing, slug: editing.slug || slugify(editing.name) };
    const { error } = id ? await sb.from("products").update(row).eq("id", id) : await sb.from("products").insert(row);
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast("Product saved", "success");
    setEditing(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="font-display text-5xl">Products</h1>
        <button className="btn-primary" onClick={() => setEditing({ ...blank })}>Add product</button>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-3">Product</th><th>Class</th><th>Price</th><th>Stock</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {initial.map((p) => (
              <tr key={p.id} className="border-b border-line/70">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-10 bg-sand">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover" />}</div>
                    {p.name}
                  </div>
                </td>
                <td>{p.category}</td>
                <td>{formatNaira(p.price_naira)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="h-7 w-7 border border-line" onClick={() => quickStock(p, p.stock - 1)} aria-label="Decrease stock">−</button>
                    <span className={`w-6 text-center tabular-nums ${p.stock <= 3 ? "text-accent" : ""}`}>{p.stock}</span>
                    <button className="h-7 w-7 border border-line" onClick={() => quickStock(p, p.stock + 1)} aria-label="Increase stock">+</button>
                  </div>
                </td>
                <td>{p.is_active ? "Live" : "Hidden"}{p.is_featured ? " · Best seller" : ""}</td>
                <td className="text-right"><button className="underline underline-offset-4" onClick={() => setEditing({ ...p })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onClick={() => setEditing(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="mx-auto my-8 grid max-w-2xl gap-4 bg-white p-6 sm:grid-cols-2">
            <h2 className="font-display text-3xl sm:col-span-2">{editing.id ? "Edit product" : "New product"}</h2>
            <div className="sm:col-span-2">
              <label className="label">Name</label>
              <input className="input" required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Class</label>
              <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Price (₦)</label>
              <input className="input" type="number" min={0} required value={editing.price_naira} onChange={(e) => setEditing({ ...editing, price_naira: Number(e.target.value) })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input h-24 py-3" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Sizes</label>
              <div className="flex flex-wrap gap-2">
                {SHOE_SIZES.map((s) => {
                  const on = editing.sizes_available.includes(s);
                  return (
                    <button type="button" key={s} onClick={() => setEditing({ ...editing, sizes_available: on ? editing.sizes_available.filter((x) => x !== s) : [...editing.sizes_available, s].sort() })}
                      className={`h-10 w-12 border ${on ? "border-ink bg-ink text-white" : "border-line"}`}>{s}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Stock</label>
              <input className="input" type="number" min={0} value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col justify-end gap-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Visible in shop</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> Best seller</label>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Images</label>
              <div className="flex flex-wrap gap-3">
                {editing.images.map((src, i) => (
                  <div key={src} className="relative h-24 w-20 bg-sand">
                    <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                    <button type="button" className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white text-xs" onClick={() => setEditing({ ...editing, images: editing.images.filter((_, j) => j !== i) })} aria-label="Remove image">✕</button>
                  </div>
                ))}
                <label className="grid h-24 w-20 cursor-pointer place-items-center border border-dashed border-muted text-xs text-muted">
                  {busy ? "…" : "+ Upload"}
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
                </label>
              </div>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <button className="btn-primary" disabled={busy}>Save</button>
              <button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
