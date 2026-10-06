-- BELKA'S ENTERPRISE: core tables.
-- Prices are whole Naira (integer). Paystack amounts are computed server-side as naira * 100 (kobo).

create extension if not exists pgcrypto;

-- ---------- Profiles (1:1 with auth.users) ----------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  full_name        text,
  phone            text,
  avatar_url       text,
  is_admin         boolean not null default false,
  welcome_sent_at  timestamptz,
  created_at       timestamptz not null default now()
);

-- Create a profile automatically for every new auth user (Google or email sign-up).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Products ----------
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  category         text not null,
  description      text not null default '',
  price_naira      integer not null check (price_naira >= 0),
  images           text[] not null default '{}',
  sizes_available  text[] not null default '{}',
  stock            integer not null default 0 check (stock >= 0),
  is_active        boolean not null default true,
  is_featured      boolean not null default false,
  created_at       timestamptz not null default now()
);
create index products_category_idx on public.products (category) where is_active;

-- ---------- Cart ----------
create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  size        text not null,
  quantity    integer not null check (quantity > 0 and quantity <= 20),
  updated_at  timestamptz not null default now(),
  unique (user_id, product_id, size)
);
create index cart_items_user_idx on public.cart_items (user_id);

-- Realtime: send the full old row on DELETE so user_id filters also match deletes.
alter table public.cart_items replica identity full;

-- ---------- Addresses ----------
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text not null,
  state       text not null,
  city        text not null,
  street      text not null,
  landmark    text not null default '',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default on public.addresses (user_id) where is_default;

-- ---------- Orders ----------
create type public.order_status as enum ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');

create sequence public.order_number_seq start 1001;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  order_number       text unique not null,
  email              text,
  status             public.order_status not null default 'pending',
  payment_method     text not null check (payment_method in ('paystack', 'pay_on_delivery')),
  -- awaiting = Paystack started but not confirmed; paid = Paystack confirmed; on_delivery = cash/transfer on delivery
  payment_status     text not null default 'awaiting' check (payment_status in ('awaiting', 'paid', 'on_delivery', 'failed')),
  payment_reference  text unique,
  delivery_method    text not null check (delivery_method in ('home_delivery', 'store_pickup')),
  subtotal           integer not null check (subtotal >= 0),
  delivery_fee       integer not null check (delivery_fee >= 0),
  total              integer not null check (total >= 0),
  delivery_address   jsonb not null,
  paid_at            timestamptz,
  confirmation_sent_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);

create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  name         text not null,
  image        text,
  price_naira  integer not null,
  size         text not null,
  quantity     integer not null check (quantity > 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------- Wishlist ----------
create table public.wishlist (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.cart_items;
alter publication supabase_realtime add table public.orders;
