"use client";

import { CATEGORIES } from "@belkas/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const SIZES = ["40", "41", "42", "43", "44", "45", "46"];
const PRICES: { label: string; min?: number; max?: number }[] = [
  { label: "Any price" },
  { label: "Under ₦30,000", max: 29999 },
  { label: "₦30,000 – ₦35,000", min: 30000, max: 35000 },
  { label: "₦35,000 and up", min: 35000 },
];

export function ShopFilters() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const current = {
    cls: sp.get("class") ?? "",
    sizes: (sp.get("sizes") ?? "").split(",").filter(Boolean),
    min: sp.get("min") ?? "",
    max: sp.get("max") ?? "",
    sort: sp.get("sort") ?? "newest",
  };

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.replace(`${path}?${next.toString()}`, { scroll: false }));
  }

  const toggleSize = (s: string) => {
    const set = new Set(current.sizes);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    update({ sizes: [...set].sort().join(",") || null });
  };

  const activeCount = (current.cls ? 1 : 0) + current.sizes.length + (current.min || current.max ? 1 : 0);

  return (
    <div className={`my-8 border-y border-line py-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {["", ...CATEGORIES].map((c) => (
            <button
              key={c || "all"}
              onClick={() => update({ class: c || null })}
              className={`h-9 shrink-0 border px-4 text-sm transition ${current.cls === c ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
            >
              {c ? `${c}s` : "All"}
            </button>
          ))}
        </div>
        <button onClick={() => setOpen((o) => !o)} className="h-9 shrink-0 border border-line px-4 text-sm hover:border-ink" aria-expanded={open}>
          Filters{activeCount ? ` (${activeCount})` : ""}
        </button>
      </div>

      {open && (
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="label">Size (EU)</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  aria-pressed={current.sizes.includes(s)}
                  className={`h-10 w-12 border text-sm ${current.sizes.includes(s) ? "border-ink bg-ink text-white" : "border-line hover:border-ink"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Price</p>
            <div className="flex flex-col gap-2">
              {PRICES.map((p) => {
                const on = (current.min || "") === String(p.min ?? "") && (current.max || "") === String(p.max ?? "");
                return (
                  <label key={p.label} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="price"
                      checked={on}
                      onChange={() => update({ min: p.min ? String(p.min) : null, max: p.max ? String(p.max) : null })}
                      className="accent-[var(--color-accent)]"
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <p className="label">Sort</p>
            <select className="input h-10" value={current.sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
            {activeCount > 0 && (
              <button className="mt-3 text-sm underline underline-offset-4" onClick={() => update({ class: null, sizes: null, min: null, max: null })}>
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
