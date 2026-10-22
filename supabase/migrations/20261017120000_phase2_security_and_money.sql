-- Phase 2 hardening for the existing ZELNO Kitchen schema.
-- This migration is additive/compatibility-focused and intentionally does not edit 0001.
-- Monetary columns below are integer paise. Percentage coupons are integer basis points (100 = 1%).

begin;

-- Convert the existing rupee numeric columns without deleting or resetting data.
alter table public.products
  drop constraint if exists products_price_check,
  drop constraint if exists products_compare_at_price_check,
  drop constraint if exists products_stock_quantity_check;
alter table public.product_variants
  drop constraint if exists product_variants_price_check,
  drop constraint if exists product_variants_compare_at_price_check,
  drop constraint if exists product_variants_stock_quantity_check;
alter table public.coupons
  drop constraint if exists coupons_minimum_order_amount_check,
  drop constraint if exists coupons_discount_value_check,
  drop constraint if exists coupons_percentage_check;
alter table public.orders
  drop constraint if exists orders_subtotal_check,
  drop constraint if exists orders_discount_total_check,
  drop constraint if exists orders_shipping_total_check,
  drop constraint if exists orders_total_check;
alter table public.order_items
  drop constraint if exists order_items_unit_price_check,
  drop constraint if exists order_items_discount_check,
  drop constraint if exists order_items_quantity_check,
  drop constraint if exists order_items_line_total_check;

alter table public.products
  alter column price type bigint using round(price * 100)::bigint,
  alter column compare_at_price type bigint using case when compare_at_price is null then null else round(compare_at_price * 100)::bigint end;
alter table public.product_variants
  alter column price type bigint using round(price * 100)::bigint,
  alter column compare_at_price type bigint using case when compare_at_price is null then null else round(compare_at_price * 100)::bigint end;
alter table public.coupons
  alter column discount_value type bigint using round(discount_value * 100)::bigint,
  alter column minimum_order_amount type bigint using round(minimum_order_amount * 100)::bigint;
alter table public.orders
  alter column subtotal type bigint using round(subtotal * 100)::bigint,
  alter column discount_total type bigint using round(discount_total * 100)::bigint,
  alter column shipping_total type bigint using round(shipping_total * 100)::bigint,
  alter column total type bigint using round(total * 100)::bigint;
alter table public.order_items
  alter column unit_price type bigint using round(unit_price * 100)::bigint,
  alter column discount type bigint using round(discount * 100)::bigint,
  alter column line_total type bigint using round(line_total * 100)::bigint;

-- The store settings JSON is also part of the money boundary.
update public.site_settings
set value = jsonb_set(value, '{shipping_fee}', to_jsonb(round((value->>'shipping_fee')::numeric * 100)::bigint), true)
where setting_key = 'store' and jsonb_typeof(value->'shipping_fee') = 'number';
update public.site_settings
set value = jsonb_set(value, '{free_shipping_minimum}', to_jsonb(round((value->>'free_shipping_minimum')::numeric * 100)::bigint), true)
where setting_key = 'store' and jsonb_typeof(value->'free_shipping_minimum') = 'number';

alter table public.products
  add constraint products_price_paise_check check (price >= 0),
  add constraint products_compare_at_price_paise_check check (compare_at_price is null or compare_at_price >= price),
  add constraint products_stock_quantity_nonnegative_check check (stock_quantity >= 0);
alter table public.product_variants
  add constraint product_variants_price_paise_check check (price >= 0),
  add constraint product_variants_compare_at_price_paise_check check (compare_at_price is null or compare_at_price >= price),
  add constraint product_variants_stock_quantity_nonnegative_check check (stock_quantity >= 0);
alter table public.coupons
  add constraint coupons_discount_value_integer_check check (discount_value >= 0),
  add constraint coupons_percentage_basis_points_check check (discount_type <> 'percentage' or discount_value <= 10000),
  add constraint coupons_minimum_order_amount_paise_check check (minimum_order_amount >= 0);
alter table public.orders
  add constraint orders_subtotal_paise_check check (subtotal >= 0),
  add constraint orders_discount_total_paise_check check (discount_total >= 0),
  add constraint orders_shipping_total_paise_check check (shipping_total >= 0),
  add constraint orders_total_paise_check check (total >= 0);
alter table public.order_items
  add constraint order_items_unit_price_paise_check check (unit_price >= 0),
  add constraint order_items_discount_paise_check check (discount >= 0),
  add constraint order_items_quantity_positive_check check (quantity > 0),
  add constraint order_items_line_total_paise_check check (line_total >= 0);

-- Public catalog/admin order query indexes.
create index if not exists products_status_price_idx on public.products(status, price);
create index if not exists products_published_category_created_idx on public.products(category_id, published_at desc, created_at desc) where status = 'published';
create index if not exists orders_status_created_idx on public.orders(order_status, created_at desc);
create index if not exists orders_payment_status_created_idx on public.orders(payment_status, created_at desc);
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists order_status_history_order_created_idx on public.order_status_history(order_id, created_at desc);
create index if not exists coupon_usages_user_idx on public.coupon_usages(user_id, created_at desc);

-- Role checks are server-owned helpers. user_roles is never client-writable.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer'::public.app_role)
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

-- Recreate the trigger only if the original installation was incomplete.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Replace the initial policies so stale permissive policies cannot remain alongside the hardened rules.
drop policy if exists profiles_read_own_or_admin on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;
drop policy if exists roles_read_own_or_admin on public.user_roles;
drop policy if exists categories_public_active on public.categories;
drop policy if exists categories_admin_all on public.categories;
drop policy if exists products_public_published on public.products;
drop policy if exists products_admin_all on public.products;
drop policy if exists product_images_public_published on public.product_images;
drop policy if exists product_images_admin_all on public.product_images;
drop policy if exists variants_public_published on public.product_variants;
drop policy if exists variants_admin_all on public.product_variants;
drop policy if exists blocks_public_visible_published on public.product_content_blocks;
drop policy if exists blocks_admin_all on public.product_content_blocks;
drop policy if exists tags_public_read on public.tags;
drop policy if exists tags_admin_all on public.tags;
drop policy if exists tag_map_public_published on public.product_tag_map;
drop policy if exists tag_map_admin_all on public.product_tag_map;
drop policy if exists sections_public_visible on public.homepage_sections;
drop policy if exists sections_admin_all on public.homepage_sections;
drop policy if exists banners_public_active on public.homepage_banners;
drop policy if exists banners_admin_all on public.homepage_banners;
drop policy if exists testimonials_public_approved on public.testimonials;
drop policy if exists testimonials_admin_all on public.testimonials;
drop policy if exists faqs_public_published on public.faqs;
drop policy if exists faqs_admin_all on public.faqs;
drop policy if exists pages_public_published on public.site_pages;
drop policy if exists pages_admin_all on public.site_pages;
drop policy if exists settings_public_read on public.site_settings;
drop policy if exists settings_admin_all on public.site_settings;
drop policy if exists addresses_owner_or_admin on public.addresses;
drop policy if exists carts_owner on public.carts;
drop policy if exists cart_items_owner on public.cart_items;
drop policy if exists coupons_active_public_read on public.coupons;
drop policy if exists coupons_admin_all on public.coupons;
drop policy if exists orders_owner_or_admin_read on public.orders;
drop policy if exists orders_admin_all on public.orders;
drop policy if exists order_items_owner_or_admin_read on public.order_items;
drop policy if exists order_items_admin_all on public.order_items;
drop policy if exists order_history_owner_or_admin_read on public.order_status_history;
drop policy if exists order_history_admin_all on public.order_status_history;
drop policy if exists coupon_usage_owner_or_admin_read on public.coupon_usages;
drop policy if exists coupon_usage_admin_all on public.coupon_usages;
drop policy if exists reviews_public_approved on public.reviews;
drop policy if exists reviews_customer_pending_insert on public.reviews;
drop policy if exists reviews_admin_all on public.reviews;
drop policy if exists enquiries_public_insert on public.contact_enquiries;
drop policy if exists enquiries_admin_all on public.contact_enquiries;
drop policy if exists newsletter_public_subscribe on public.newsletter_subscribers;
drop policy if exists newsletter_admin_read on public.newsletter_subscribers;

do $$ declare table_name text; begin
  foreach table_name in array array[
    'profiles','user_roles','categories','products','product_images','product_variants','product_content_blocks',
    'tags','product_tag_map','homepage_sections','homepage_banners','testimonials','faqs','site_pages','site_settings',
    'addresses','carts','cart_items','coupons','orders','order_items','order_status_history','coupon_usages','reviews',
    'contact_enquiries','newsletter_subscribers'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy profiles_select_own_or_admin on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own_or_admin on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy roles_select_own_or_admin on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy categories_public_active on public.categories for select to anon, authenticated using (is_active or public.is_admin());
create policy products_public_published on public.products for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy product_images_public_published on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_admin())));
create policy variants_public_published on public.product_variants for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_admin())));
create policy blocks_public_visible_published on public.product_content_blocks for select to anon, authenticated using (is_visible and exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_admin())));
create policy tags_public_published on public.tags for select to anon, authenticated using (exists (select 1 from public.product_tag_map m join public.products p on p.id = m.product_id where m.tag_id = id and p.status = 'published') or public.is_admin());
create policy tag_map_public_published on public.product_tag_map for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_admin())));
create policy sections_public_visible on public.homepage_sections for select to anon, authenticated using (is_visible or public.is_admin());
create policy banners_public_active on public.homepage_banners for select to anon, authenticated using (is_active or public.is_admin());
create policy testimonials_public_approved on public.testimonials for select to anon, authenticated using (is_approved or public.is_admin());
create policy faqs_public_published on public.faqs for select to anon, authenticated using (is_published or public.is_admin());
create policy pages_public_published on public.site_pages for select to anon, authenticated using (is_published or public.is_admin());
create policy settings_public_read on public.site_settings for select to anon, authenticated using (is_public or public.is_admin());

create policy addresses_select_own_or_admin on public.addresses for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy addresses_insert_own on public.addresses for insert to authenticated with check (user_id = auth.uid());
create policy addresses_update_own on public.addresses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_delete_own on public.addresses for delete to authenticated using (user_id = auth.uid());
create policy carts_owner_all on public.carts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_owner_select on public.cart_items for select to authenticated using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy cart_items_owner_insert on public.cart_items for insert to authenticated with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()) and exists (select 1 from public.products p where p.id = product_id and p.status = 'published') and (variant_id is null or exists (select 1 from public.product_variants v where v.id = variant_id and v.product_id = product_id)));
create policy cart_items_owner_update on public.cart_items for update to authenticated using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())) with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy cart_items_owner_delete on public.cart_items for delete to authenticated using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- Coupon codes are server-validated; they are not a public catalogue surface.
create policy coupons_admin_select on public.coupons for select to authenticated using (public.is_admin());
create policy orders_owner_select on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy order_items_owner_select on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_history_owner_select on public.order_status_history for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy coupon_usage_admin_select on public.coupon_usages for select to authenticated using (public.is_admin());
create policy reviews_public_approved on public.reviews for select to anon, authenticated using (is_approved or user_id = auth.uid() or public.is_admin());
create policy reviews_customer_pending_insert on public.reviews for insert to authenticated with check (user_id = auth.uid() and is_approved = false and exists (select 1 from public.orders o join public.order_items oi on oi.order_id = o.id where o.id = order_id and o.user_id = auth.uid() and o.order_status = 'delivered' and oi.product_id = product_id));
create policy enquiries_public_insert on public.contact_enquiries for insert to anon, authenticated with check (status = 'new' and length(trim(name)) between 1 and 120 and length(message) between 10 and 5000);
create policy enquiries_admin_select on public.contact_enquiries for select to authenticated using (public.is_admin());
create policy newsletter_public_subscribe on public.newsletter_subscribers for insert to anon, authenticated with check (email = lower(email));
create policy newsletter_admin_select on public.newsletter_subscribers for select to authenticated using (public.is_admin());

-- These tables are server-managed. Admins use authenticated, role-checked API routes backed by service_role.
revoke all on public.profiles, public.user_roles, public.categories, public.products, public.product_images, public.product_variants,
  public.product_content_blocks, public.tags, public.product_tag_map, public.homepage_sections, public.homepage_banners,
  public.testimonials, public.faqs, public.site_pages, public.site_settings, public.addresses, public.carts, public.cart_items,
  public.coupons, public.orders, public.order_items, public.order_status_history, public.coupon_usages, public.reviews,
  public.contact_enquiries, public.newsletter_subscribers from anon, authenticated;

grant select on public.categories, public.products, public.product_images, public.product_variants, public.product_content_blocks,
  public.tags, public.product_tag_map, public.homepage_sections, public.homepage_banners, public.testimonials, public.faqs,
  public.site_pages, public.site_settings, public.reviews to anon, authenticated;
grant select on public.profiles, public.user_roles, public.addresses, public.carts, public.cart_items, public.coupons,
  public.order_items, public.newsletter_subscribers to authenticated;
grant select (id, order_number, user_id, customer_name, order_status, payment_status, payment_method, subtotal, discount_total, shipping_total, total, shipping_method, shipping_address, tracking_courier, tracking_number, placed_at, created_at, updated_at) on public.orders to authenticated;
grant select (id, order_id, next_status, created_at) on public.order_status_history to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses, public.carts, public.cart_items to authenticated;
grant insert on public.reviews, public.contact_enquiries, public.newsletter_subscribers to authenticated;
grant insert on public.contact_enquiries, public.newsletter_subscribers to anon;
grant all privileges on all tables in schema public to service_role;

-- A customer-safe history projection omits internal actor ids and any admin-only fields.
create or replace view public.customer_order_status_history
with (security_invoker = true)
as
select id, order_id, next_status, created_at
from public.order_status_history;
grant select on public.customer_order_status_history to authenticated, service_role;

-- The checkout function is service-role-only and recomputes all amounts from locked database rows.
create or replace function public.create_checkout_order(
  p_order_number text,
  p_user_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_coupon_code text default null,
  p_payment_method text default 'cod'
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  coupon_row public.coupons%rowtype;
  product_id_value uuid;
  variant_id_value uuid;
  quantity_value integer;
  item_price bigint;
  item_sku text;
  item_variant jsonb;
  item_image text;
  item_stock integer;
  item_stock_status text;
  order_id_value uuid;
  coupon_id_value uuid;
  coupon_code_value text;
  subtotal_value bigint := 0;
  discount_value bigint := 0;
  shipping_value bigint := 0;
  total_value bigint := 0;
  shipping_fee_value bigint := 9900;
  free_shipping_value bigint := 199900;
  setting_value jsonb;
  snapshots jsonb := '[]'::jsonb;
  updated_stock integer;
begin
  if p_payment_method not in ('cod','razorpay') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_order_number is null or p_order_number !~ '^[A-Z0-9-]{12,40}$' then raise exception 'INVALID_ORDER_NUMBER'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 40 then raise exception 'INVALID_ITEMS'; end if;
  if length(trim(coalesce(p_customer->>'name',''))) not between 2 and 120
     or length(trim(coalesce(p_customer->>'email',''))) not between 5 and 254
     or trim(coalesce(p_customer->>'email','')) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or trim(coalesce(p_customer->>'phone','')) !~ '^[+0-9 ()-]{8,20}$'
     or coalesce(p_customer->'address'->>'pincode','') !~ '^[0-9]{6}$' then raise exception 'INVALID_CUSTOMER'; end if;

  select value into setting_value from public.site_settings where setting_key = 'store' limit 1;
  if setting_value is not null then
    shipping_fee_value := coalesce(nullif(setting_value->>'shipping_fee','')::bigint, 9900);
    free_shipping_value := coalesce(nullif(setting_value->>'free_shipping_minimum','')::bigint, 199900);
    if coalesce((setting_value->>'cod_enabled')::boolean, true) = false and p_payment_method = 'cod' then raise exception 'COD_DISABLED'; end if;
  end if;
  if shipping_fee_value < 0 or free_shipping_value < 0 then raise exception 'INVALID_STORE_SETTINGS'; end if;

  for item in select value from jsonb_array_elements(p_items) loop
    begin
      product_id_value := (item->>'productId')::uuid;
      quantity_value := (item->>'quantity')::integer;
      variant_id_value := nullif(item->>'variantId','')::uuid;
    exception when others then raise exception 'INVALID_ITEMS'; end;
    if quantity_value < 1 or quantity_value > 99 then raise exception 'INVALID_QUANTITY'; end if;
    select * into product_row from public.products where id = product_id_value and status = 'published' for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    item_variant := '{}'::jsonb;
    if variant_id_value is not null then
      select * into variant_row from public.product_variants where id = variant_id_value and product_id = product_id_value for update;
      if not found then raise exception 'VARIANT_UNAVAILABLE'; end if;
      item_price := variant_row.price;
      item_sku := coalesce(variant_row.sku, product_row.sku, '');
      item_variant := jsonb_build_object('name', variant_row.name, 'options', variant_row.option_values, 'stock_status', variant_row.stock_status);
      item_stock := variant_row.stock_quantity;
      item_stock_status := variant_row.stock_status;
    else
      item_price := product_row.price;
      item_sku := coalesce(product_row.sku, '');
      item_variant := jsonb_build_object('name','Standard','options','{}'::jsonb,'stock_status',case when product_row.continue_selling then 'continue_selling' when product_row.stock_quantity > 0 then 'in_stock' else 'out_of_stock' end);
      item_stock := product_row.stock_quantity;
      item_stock_status := case when product_row.continue_selling then 'continue_selling' when product_row.stock_quantity > 0 then 'in_stock' else 'out_of_stock' end;
    end if;
    if item_stock_status <> 'continue_selling' then
      if item_stock < quantity_value then raise exception 'OUT_OF_STOCK'; end if;
      if variant_id_value is not null then
        update public.product_variants set stock_quantity = stock_quantity - quantity_value where id = variant_id_value and stock_quantity >= quantity_value returning stock_quantity into updated_stock;
        if not found then raise exception 'OUT_OF_STOCK'; end if;
        update public.products set stock_quantity = coalesce((select sum(stock_quantity)::integer from public.product_variants where product_id = product_id_value),0) where id = product_id_value;
      else
        update public.products set stock_quantity = stock_quantity - quantity_value where id = product_id_value and stock_quantity >= quantity_value returning stock_quantity into updated_stock;
        if not found then raise exception 'OUT_OF_STOCK'; end if;
      end if;
    end if;
    select url into item_image from public.product_images where product_id = product_id_value order by sort_order limit 1;
    subtotal_value := subtotal_value + item_price * quantity_value;
    snapshots := snapshots || jsonb_build_array(jsonb_build_object('product_id',product_id_value,'variant_id',variant_id_value,'title',product_row.title,'sku',item_sku,'variant',item_variant,'price',item_price,'image',item_image,'quantity',quantity_value,'line_total',item_price * quantity_value,'stock_status',item_stock_status));
  end loop;

  if nullif(trim(coalesce(p_coupon_code,'')),'') is not null then
    select * into coupon_row from public.coupons where code = upper(trim(p_coupon_code)) and is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()) for update;
    if not found then raise exception 'INVALID_COUPON'; end if;
    if subtotal_value < coupon_row.minimum_order_amount then raise exception 'COUPON_MINIMUM_NOT_MET'; end if;
    if coupon_row.usage_limit is not null and coupon_row.usage_count >= coupon_row.usage_limit then raise exception 'COUPON_EXHAUSTED'; end if;
    if coupon_row.one_time_per_customer and exists (select 1 from public.coupon_usages where coupon_id = coupon_row.id and lower(customer_email) = lower(p_customer->>'email')) then raise exception 'COUPON_ALREADY_USED'; end if;
    coupon_id_value := coupon_row.id;
    coupon_code_value := coupon_row.code;
    discount_value := case when coupon_row.discount_type = 'percentage' then round((subtotal_value::numeric * coupon_row.discount_value) / 10000)::bigint else coupon_row.discount_value end;
    discount_value := least(discount_value, subtotal_value);
  end if;
  if subtotal_value - discount_value < free_shipping_value then shipping_value := shipping_fee_value; end if;
  total_value := greatest(0::bigint, subtotal_value - discount_value + shipping_value);

  insert into public.orders(order_number,user_id,customer_name,customer_email,customer_phone,shipping_address,order_notes,shipping_method,order_status,payment_status,payment_method,coupon_id,coupon_code,subtotal,discount_total,shipping_total,total)
  values(p_order_number,p_user_id,trim(p_customer->>'name'),lower(trim(p_customer->>'email')),trim(p_customer->>'phone'),p_customer->'address',coalesce(p_customer->>'notes',''),coalesce(p_customer->>'shipping_method','standard'),'new',case when p_payment_method='cod' then 'pending'::public.payment_status else 'payment_pending'::public.payment_status end,p_payment_method,coupon_id_value,coupon_code_value,subtotal_value,discount_value,shipping_value,total_value)
  returning id into order_id_value;

  for item in select value from jsonb_array_elements(snapshots) loop
    insert into public.order_items(order_id,product_id,variant_id,product_title_snapshot,sku_snapshot,variant_snapshot,unit_price,discount,quantity,image_url_snapshot,line_total)
    values(order_id_value,(item->>'product_id')::uuid,nullif(item->>'variant_id','')::uuid,item->>'title',coalesce(item->>'sku',''),coalesce(item->'variant','{}'::jsonb) || jsonb_build_object('stock_status',item->>'stock_status'),(item->>'price')::bigint,0,(item->>'quantity')::integer,item->>'image',(item->>'line_total')::bigint);
  end loop;
  insert into public.order_status_history(order_id,previous_status,next_status,note) values(order_id_value,null,'new','Order placed');
  if coupon_id_value is not null then
    update public.coupons set usage_count = usage_count + 1 where id = coupon_id_value;
    insert into public.coupon_usages(coupon_id,order_id,user_id,customer_email) values(coupon_id_value,order_id_value,p_user_id,lower(trim(p_customer->>'email')));
  end if;
  return jsonb_build_object('id',order_id_value,'order_number',p_order_number,'subtotal',subtotal_value,'discount_total',discount_value,'shipping_total',shipping_value,'total',total_value,'payment_status',case when p_payment_method='cod' then 'pending' else 'payment_pending' end);
end;
$$;
revoke all on function public.create_checkout_order(text, uuid, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.create_checkout_order(text, uuid, jsonb, jsonb, text, text) to service_role;

create or replace function public.release_failed_payment_stock(p_gateway_order_id text) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare order_row public.orders%rowtype; line_row record;
begin
  select * into order_row from public.orders where payment_reference = p_gateway_order_id for update;
  if not found or order_row.payment_status = 'paid' or order_row.stock_released_at is not null then return false; end if;
  for line_row in select product_id,variant_id,quantity,variant_snapshot from public.order_items where order_id = order_row.id loop
    if coalesce(line_row.variant_snapshot->>'stock_status','in_stock') <> 'continue_selling' then
      if line_row.variant_id is not null then
        update public.product_variants set stock_quantity = stock_quantity + line_row.quantity where id = line_row.variant_id;
        update public.products set stock_quantity = coalesce((select sum(stock_quantity)::integer from public.product_variants where product_id = line_row.product_id),0) where id = line_row.product_id;
      elsif line_row.product_id is not null then
        update public.products set stock_quantity = stock_quantity + line_row.quantity where id = line_row.product_id;
      end if;
    end if;
  end loop;
  update public.orders set stock_released_at = now(),payment_status='failed',order_status=case when order_status in ('new','confirmed') then 'cancelled'::public.order_status else order_status end where id = order_row.id;
  insert into public.order_status_history(order_id,previous_status,next_status,note) values(order_row.id,order_row.order_status,case when order_row.order_status in ('new','confirmed') then 'cancelled'::public.order_status else order_row.order_status end,'Online payment failed; inventory reservation released');
  return true;
end;
$$;
revoke all on function public.release_failed_payment_stock(text) from public, anon, authenticated;
grant execute on function public.release_failed_payment_stock(text) to service_role;

commit;
