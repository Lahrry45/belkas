-- Cart + checkout functions. Totals are ALWAYS computed here from database prices,
-- never taken from the client. Keep delivery_fee() in sync with packages/shared/src/pricing.ts.

-- ---------- Validation: cart rows must reference an active product and a real size ----------
create or replace function public.validate_cart_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  p record;
begin
  select is_active, sizes_available into p from products where id = new.product_id;
  if not found or not p.is_active then
    raise exception 'Product is not available';
  end if;
  if not (new.size = any (p.sizes_available)) then
    raise exception 'Size % is not available for this product', new.size;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger cart_items_validate
  before insert or update on public.cart_items
  for each row execute function public.validate_cart_item();

-- ---------- Cart RPCs ----------
-- Add (or increment) one line in the caller's cart.
create or replace function public.add_to_cart(p_product_id uuid, p_size text, p_quantity integer default 1)
returns public.cart_items
language sql
security invoker
set search_path = public
as $$
  insert into cart_items (user_id, product_id, size, quantity)
  values (auth.uid(), p_product_id, p_size, greatest(p_quantity, 1))
  on conflict (user_id, product_id, size)
  do update set quantity = least(cart_items.quantity + excluded.quantity, 20)
  returning *;
$$;

-- Merge a guest (local) cart into the signed-in user's cart. Quantities are added together.
-- p_items: [{ "product_id": uuid, "size": text, "quantity": int }, ...]
create or replace function public.merge_guest_cart(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  it jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    begin
      perform add_to_cart((it->>'product_id')::uuid, it->>'size', coalesce((it->>'quantity')::int, 1));
    exception when others then
      -- Skip items that are no longer valid (removed product, missing size).
      null;
    end;
  end loop;
end $$;

-- ---------- Pricing ----------
-- Delivery fee in Naira. Store is in Lagos.
create or replace function public.delivery_fee(p_method text, p_state text)
returns integer
language sql
immutable
as $$
  select case
    when p_method = 'store_pickup' then 0
    when p_method = 'home_delivery' and lower(coalesce(p_state, '')) = 'lagos' then 3000
    when p_method = 'home_delivery' then 6000
    else null
  end;
$$;

-- ---------- Checkout ----------
-- Creates an order from the caller's cart in ONE transaction.
--  * pay_on_delivery: stock is reduced and the cart is cleared immediately.
--  * paystack: the order waits as payment_status='awaiting'; finalize_paystack_order() completes it.
create or replace function public.create_order(
  p_address_id uuid,
  p_delivery_method text,
  p_payment_method text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_email    text;
  v_addr     addresses%rowtype;
  v_snapshot jsonb;
  v_subtotal integer;
  v_fee      integer;
  v_problem  text;
  v_order    orders%rowtype;
begin
  if v_uid is null then raise exception 'Please sign in to check out'; end if;
  if p_payment_method not in ('paystack', 'pay_on_delivery') then raise exception 'Invalid payment method'; end if;
  if p_delivery_method not in ('home_delivery', 'store_pickup') then raise exception 'Invalid delivery method'; end if;

  select email into v_email from auth.users where id = v_uid;

  if p_delivery_method = 'home_delivery' then
    select * into v_addr from addresses where id = p_address_id and user_id = v_uid;
    if not found then raise exception 'Please choose a delivery address'; end if;
    v_snapshot := jsonb_build_object(
      'full_name', v_addr.full_name, 'phone', v_addr.phone, 'state', v_addr.state,
      'city', v_addr.city, 'street', v_addr.street, 'landmark', v_addr.landmark);
  else
    select * into v_addr from addresses where id = p_address_id and user_id = v_uid;
    v_snapshot := jsonb_build_object(
      'pickup', true,
      'full_name', coalesce(v_addr.full_name, (select full_name from profiles where id = v_uid)),
      'phone', v_addr.phone,
      'state', 'Lagos', 'city', 'Lagos', 'street', 'Store pickup', 'landmark', '');
  end if;

  -- Lock the products in the cart so two checkouts cannot oversell.
  perform 1 from products p join cart_items c on c.product_id = p.id
   where c.user_id = v_uid for update of p;

  select p.name into v_problem
    from cart_items c join products p on p.id = c.product_id
   where c.user_id = v_uid and (not p.is_active or p.stock < (
     select sum(c2.quantity) from cart_items c2 where c2.user_id = v_uid and c2.product_id = p.id))
   limit 1;
  if v_problem is not null then
    raise exception 'Not enough stock for %', v_problem;
  end if;

  select coalesce(sum(c.quantity * p.price_naira), 0)::int into v_subtotal
    from cart_items c join products p on p.id = c.product_id
   where c.user_id = v_uid;
  if v_subtotal = 0 then raise exception 'Your cart is empty'; end if;

  v_fee := delivery_fee(p_delivery_method, v_snapshot->>'state');

  insert into orders (user_id, order_number, email, payment_method, payment_status, delivery_method,
                      subtotal, delivery_fee, total, delivery_address)
  values (v_uid,
          'BLK-' || nextval('order_number_seq'),
          v_email, p_payment_method,
          case when p_payment_method = 'pay_on_delivery' then 'on_delivery' else 'awaiting' end,
          p_delivery_method, v_subtotal, v_fee, v_subtotal + v_fee, v_snapshot)
  returning * into v_order;

  insert into order_items (order_id, product_id, name, image, price_naira, size, quantity)
  select v_order.id, p.id, p.name, p.images[1], p.price_naira, c.size, c.quantity
    from cart_items c join products p on p.id = c.product_id
   where c.user_id = v_uid;

  if p_payment_method = 'pay_on_delivery' then
    perform commit_order_stock(v_order.id);
  end if;

  return v_order;
end $$;

-- Reduce stock and remove the ordered lines from the owner's cart (cart change syncs live to all devices).
create or replace function public.commit_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  select user_id into v_uid from orders where id = p_order_id;

  update products p set stock = greatest(p.stock - s.qty, 0)
    from (select product_id, sum(quantity) qty from order_items where order_id = p_order_id group by product_id) s
   where p.id = s.product_id;

  delete from cart_items c
   using order_items oi
   where oi.order_id = p_order_id and c.user_id = v_uid
     and c.product_id = oi.product_id and c.size = oi.size;
end $$;

-- Called by the Paystack edge functions (service role) after verifying the payment with Paystack.
-- Idempotent: returns the order only the FIRST time it is marked paid, otherwise null.
create or replace function public.finalize_paystack_order(p_reference text, p_amount_kobo bigint)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders where payment_reference = p_reference for update;
  if not found then raise exception 'Unknown payment reference %', p_reference; end if;
  if v_order.payment_status = 'paid' then return null; end if;
  if p_amount_kobo <> v_order.total::bigint * 100 then
    update orders set payment_status = 'failed', updated_at = now() where id = v_order.id;
    raise exception 'Amount mismatch for %', p_reference;
  end if;

  update orders
     set payment_status = 'paid', status = 'paid', paid_at = now(), updated_at = now()
   where id = v_order.id
  returning * into v_order;

  perform commit_order_stock(v_order.id);
  return v_order;
end $$;

-- Lock down who can call what.
revoke all on function public.create_order(uuid, text, text) from public, anon;
grant execute on function public.create_order(uuid, text, text) to authenticated;
revoke all on function public.commit_order_stock(uuid) from public, anon, authenticated;
revoke all on function public.finalize_paystack_order(text, bigint) from public, anon, authenticated;
grant execute on function public.commit_order_stock(uuid) to service_role;
grant execute on function public.finalize_paystack_order(text, bigint) to service_role;
revoke all on function public.merge_guest_cart(jsonb) from public, anon;
grant execute on function public.merge_guest_cart(jsonb) to authenticated;
revoke all on function public.add_to_cart(uuid, text, integer) from public, anon;
grant execute on function public.add_to_cart(uuid, text, integer) to authenticated;

-- Keep orders.updated_at fresh when an admin changes status.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
