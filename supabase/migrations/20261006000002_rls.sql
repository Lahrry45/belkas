-- Row Level Security: every table is locked down; users only see their own rows.

alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.addresses   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlist    enable row level security;

-- Admin check. SECURITY DEFINER so policies can call it without recursing into profiles RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- profiles ----------
create policy "profile: read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profile: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Users may only edit these columns (never is_admin / welcome_sent_at).
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- ---------- products ----------
create policy "products: public read" on public.products
  for select using (is_active or public.is_admin());
create policy "products: admin insert" on public.products
  for insert with check (public.is_admin());
create policy "products: admin update" on public.products
  for update using (public.is_admin()) with check (public.is_admin());
create policy "products: admin delete" on public.products
  for delete using (public.is_admin());

-- ---------- cart_items ----------
create policy "cart: read own"   on public.cart_items for select using (user_id = auth.uid());
create policy "cart: insert own" on public.cart_items for insert with check (user_id = auth.uid());
create policy "cart: update own" on public.cart_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart: delete own" on public.cart_items for delete using (user_id = auth.uid());

-- ---------- addresses ----------
create policy "addresses: read own"   on public.addresses for select using (user_id = auth.uid());
create policy "addresses: insert own" on public.addresses for insert with check (user_id = auth.uid());
create policy "addresses: update own" on public.addresses for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses: delete own" on public.addresses for delete using (user_id = auth.uid());

-- ---------- orders (writes only through SECURITY DEFINER functions / service role) ----------
create policy "orders: read own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "orders: admin update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
revoke update on public.orders from authenticated;
grant update (status, updated_at) on public.orders to authenticated; -- still gated by the admin policy

create policy "order_items: read own" on public.order_items
  for select using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---------- wishlist ----------
create policy "wishlist: read own"   on public.wishlist for select using (user_id = auth.uid());
create policy "wishlist: insert own" on public.wishlist for insert with check (user_id = auth.uid());
create policy "wishlist: delete own" on public.wishlist for delete using (user_id = auth.uid());

-- ---------- Storage: public product images, admin-only writes ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product images: public read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "product images: admin insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images: admin update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
create policy "product images: admin delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
