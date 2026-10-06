// Uploads supabase/seed-images/*.jpg to Storage (bucket "product-images") and upserts
// supabase/products.json into public.products. Also writes supabase/seed.sql for reference.
//
// Usage (service role key is read from env, never committed):
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-products.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

const SIZES = ["40", "41", "42", "43", "44", "45", "46"];
const STOCK = 10;
const sb = createClient(url, key, { auth: { persistSession: false } });
const products = JSON.parse(readFileSync(join(root, "supabase/products.json"), "utf8"));

const rows = [];
for (const [i, p] of products.entries()) {
  const path = `seed-images/${p.slug}.jpg`;
  const file = readFileSync(join(root, "supabase", path));
  const { error: upErr } = await sb.storage
    .from("product-images")
    .upload(path, file, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (upErr) throw upErr;
  const image = sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  // Stagger created_at so "New arrivals" follows the lookbook order.
  const created_at = new Date(Date.UTC(2026, 9, 1, 12, 0, 0) - i * 60_000).toISOString();
  rows.push({ ...p, images: [image], sizes_available: SIZES, stock: STOCK, is_active: true, created_at });
  console.log("uploaded", path);
}

const { error } = await sb.from("products").upsert(rows, { onConflict: "slug" });
if (error) throw error;
console.log(`seeded ${rows.length} products`);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => `array[${a.map(q).join(", ")}]::text[]`;
const sql = [
  "-- Product seed generated from Footwear_Collection_Belkas.pptx by scripts/seed-products.mjs",
  "insert into public.products (slug, name, category, description, price_naira, images, sizes_available, stock, is_active, is_featured, created_at) values",
  rows
    .map((r) => `  (${q(r.slug)}, ${q(r.name)}, ${q(r.category)}, ${q(r.description)}, ${r.price_naira}, ${arr(r.images)}, ${arr(r.sizes_available)}, ${r.stock}, true, ${r.is_featured}, ${q(r.created_at)})`)
    .join(",\n"),
  "on conflict (slug) do update set name = excluded.name, category = excluded.category, description = excluded.description,",
  "  price_naira = excluded.price_naira, images = excluded.images, sizes_available = excluded.sizes_available, is_featured = excluded.is_featured;",
  "",
].join("\n");
writeFileSync(join(root, "supabase/seed.sql"), sql);
console.log("wrote supabase/seed.sql");
