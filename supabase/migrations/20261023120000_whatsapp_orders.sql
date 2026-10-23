-- WhatsApp click-to-order requests are real orders, but they do not reserve stock
-- until an authorized admin confirms them. No WhatsApp API or external service is used.
begin;

alter table public.orders
  add column if not exists order_source text not null default 'website',
  add column if not exists whatsapp_status text,
  add column if not exists whatsapp_message text,
  add column if not exists whatsapp_number_snapshot text,
  add column if not exists whatsapp_request_key uuid,
  add column if not exists stock_committed_at timestamptz;

alter table public.orders
  drop constraint if exists orders_order_source_check,
  drop constraint if exists orders_whatsapp_status_check;

alter table public.orders
  add constraint orders_order_source_check check (order_source in ('website', 'whatsapp')),
  add constraint orders_whatsapp_status_check check (whatsapp_status is null or whatsapp_status in ('awaiting_whatsapp_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));

create unique index if not exists orders_whatsapp_request_key_idx
  on public.orders(whatsapp_request_key)
  where whatsapp_request_key is not null;
create index if not exists orders_source_status_created_idx
  on public.orders(order_source, whatsapp_status, created_at desc);

-- Existing authenticated customers may see the source/status for their own orders through RLS.
grant select (order_source, whatsapp_status, stock_committed_at) on public.orders to authenticated;

create or replace function public.create_whatsapp_order_request(
  p_order_number text,
  p_user_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_coupon_code text default null,
  p_request_key uuid default null
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  item jsonb;
  existing_order public.orders%rowtype;
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
begin
  if p_request_key is null then raise exception 'INVALID_REQUEST_KEY'; end if;
  select * into existing_order from public.orders where whatsapp_request_key = p_request_key for update;
  if found then
    return jsonb_build_object('id', existing_order.id, 'order_number', existing_order.order_number, 'subtotal', existing_order.subtotal, 'discount_total', existing_order.discount_total, 'shipping_total', existing_order.shipping_total, 'total', existing_order.total, 'whatsapp_status', existing_order.whatsapp_status, 'placed_at', existing_order.placed_at, 'idempotent', true);
  end if;

  if p_order_number is null or p_order_number !~ '^[A-Z0-9-]{12,40}$' then raise exception 'INVALID_ORDER_NUMBER'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 40 then raise exception 'INVALID_ITEMS'; end if;
  if length(trim(coalesce(p_customer->>'name',''))) not between 2 and 120
     or length(trim(coalesce(p_customer->>'email',''))) not between 5 and 254
     or trim(coalesce(p_customer->>'email','')) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or trim(coalesce(p_customer->>'phone','')) !~ '^[+0-9 ()-]{8,20}$'
     or length(trim(coalesce(p_customer->'address'->>'address_line',''))) not between 2 and 240
     or length(trim(coalesce(p_customer->'address'->>'area',''))) not between 2 and 160
     or length(trim(coalesce(p_customer->'address'->>'city',''))) not between 2 and 120
     or length(trim(coalesce(p_customer->'address'->>'state',''))) not between 2 and 120
     or coalesce(p_customer->'address'->>'pincode','') !~ '^[0-9]{6}$' then raise exception 'INVALID_CUSTOMER'; end if;

  select value into setting_value from public.site_settings where setting_key = 'store' limit 1;
  if setting_value is not null then
    shipping_fee_value := coalesce(nullif(setting_value->>'shipping_fee','')::bigint, 9900);
    free_shipping_value := coalesce(nullif(setting_value->>'free_shipping_minimum','')::bigint, 199900);
    if coalesce((setting_value->>'whatsapp_enabled')::boolean, false) = false then raise exception 'WHATSAPP_DISABLED'; end if;
  else
    raise exception 'WHATSAPP_DISABLED';
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
    if item_stock_status <> 'continue_selling' and item_stock < quantity_value then raise exception 'OUT_OF_STOCK'; end if;
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

  insert into public.orders(order_number,user_id,customer_name,customer_email,customer_phone,shipping_address,order_notes,shipping_method,order_status,whatsapp_status,payment_status,payment_method,order_source,whatsapp_request_key,coupon_id,coupon_code,subtotal,discount_total,shipping_total,total)
  values(p_order_number,p_user_id,trim(p_customer->>'name'),lower(trim(p_customer->>'email')),trim(p_customer->>'phone'),p_customer->'address',coalesce(p_customer->>'notes',''),coalesce(p_customer->>'shipping_method','standard'),'new','awaiting_whatsapp_confirmation','pending','cod','whatsapp',p_request_key,coupon_id_value,coupon_code_value,subtotal_value,discount_value,shipping_value,total_value)
  returning id into order_id_value;

  for item in select value from jsonb_array_elements(snapshots) loop
    insert into public.order_items(order_id,product_id,variant_id,product_title_snapshot,sku_snapshot,variant_snapshot,unit_price,discount,quantity,image_url_snapshot,line_total)
    values(order_id_value,(item->>'product_id')::uuid,nullif(item->>'variant_id','')::uuid,item->>'title',coalesce(item->>'sku',''),coalesce(item->'variant','{}'::jsonb) || jsonb_build_object('stock_status',item->>'stock_status'),(item->>'price')::bigint,0,(item->>'quantity')::integer,item->>'image',(item->>'line_total')::bigint);
  end loop;
  insert into public.order_status_history(order_id,previous_status,next_status,note) values(order_id_value,null,'new','WhatsApp order request created; awaiting customer confirmation');
  return jsonb_build_object('id',order_id_value,'order_number',p_order_number,'subtotal',subtotal_value,'discount_total',discount_value,'shipping_total',shipping_value,'total',total_value,'whatsapp_status','awaiting_whatsapp_confirmation','placed_at',now(),'idempotent',false);
end;
$$;
revoke all on function public.create_whatsapp_order_request(text, uuid, jsonb, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.create_whatsapp_order_request(text, uuid, jsonb, jsonb, text, uuid) to service_role;

create or replace function public.confirm_whatsapp_order(p_order_id uuid, p_admin_user_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  order_row public.orders%rowtype;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  coupon_row public.coupons%rowtype;
  line_row record;
  item_stock integer;
  item_stock_status text;
  previous_status public.order_status;
begin
  select * into order_row from public.orders where id = p_order_id and order_source = 'whatsapp' for update;
  if not found then raise exception 'WHATSAPP_ORDER_NOT_FOUND'; end if;
  if order_row.stock_committed_at is not null then
    return jsonb_build_object('id', order_row.id, 'order_number', order_row.order_number, 'order_status', order_row.order_status, 'whatsapp_status', order_row.whatsapp_status, 'stock_committed_at', order_row.stock_committed_at, 'idempotent', true);
  end if;
  if order_row.whatsapp_status = 'cancelled' then raise exception 'WHATSAPP_ORDER_CANCELLED'; end if;
  if coalesce(order_row.whatsapp_status, '') <> 'awaiting_whatsapp_confirmation' then raise exception 'WHATSAPP_ORDER_NOT_AWAITING_CONFIRMATION'; end if;

  for line_row in select product_id,variant_id,quantity from public.order_items where order_id = order_row.id loop
    if line_row.product_id is null then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    select * into product_row from public.products where id = line_row.product_id for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if line_row.variant_id is not null then
      select * into variant_row from public.product_variants where id = line_row.variant_id and product_id = line_row.product_id for update;
      if not found then raise exception 'VARIANT_UNAVAILABLE'; end if;
      item_stock := variant_row.stock_quantity;
      item_stock_status := variant_row.stock_status;
      if item_stock_status <> 'continue_selling' then
        update public.product_variants set stock_quantity = stock_quantity - line_row.quantity where id = line_row.variant_id and stock_quantity >= line_row.quantity;
        if not found then raise exception 'OUT_OF_STOCK'; end if;
        update public.products set stock_quantity = coalesce((select sum(stock_quantity)::integer from public.product_variants where product_id = line_row.product_id),0) where id = line_row.product_id;
      end if;
    else
      item_stock := product_row.stock_quantity;
      item_stock_status := case when product_row.continue_selling then 'continue_selling' when product_row.stock_quantity > 0 then 'in_stock' else 'out_of_stock' end;
      if item_stock_status <> 'continue_selling' then
        update public.products set stock_quantity = stock_quantity - line_row.quantity where id = line_row.product_id and stock_quantity >= line_row.quantity;
        if not found then raise exception 'OUT_OF_STOCK'; end if;
      end if;
    end if;
  end loop;

  if order_row.coupon_id is not null then
    select * into coupon_row from public.coupons where id = order_row.coupon_id for update;
    if not found or not coupon_row.is_active or (coupon_row.starts_at is not null and coupon_row.starts_at > now()) or (coupon_row.ends_at is not null and coupon_row.ends_at <= now()) then raise exception 'INVALID_COUPON'; end if;
    if coupon_row.usage_limit is not null and coupon_row.usage_count >= coupon_row.usage_limit then raise exception 'COUPON_EXHAUSTED'; end if;
    update public.coupons set usage_count = usage_count + 1 where id = coupon_row.id;
    insert into public.coupon_usages(coupon_id,order_id,user_id,customer_email) values(coupon_row.id,order_row.id,order_row.user_id,order_row.customer_email);
  end if;

  previous_status := order_row.order_status;
  update public.orders set stock_committed_at = now(), order_status = 'confirmed', whatsapp_status = 'confirmed' where id = order_row.id and stock_committed_at is null;
  insert into public.order_status_history(order_id,previous_status,next_status,note,changed_by) values(order_row.id,previous_status,'confirmed','WhatsApp order confirmed; inventory reduced atomically',p_admin_user_id);
  return jsonb_build_object('id', order_row.id, 'order_number', order_row.order_number, 'order_status', 'confirmed', 'whatsapp_status', 'confirmed', 'stock_committed_at', now(), 'idempotent', false);
end;
$$;
revoke all on function public.confirm_whatsapp_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.confirm_whatsapp_order(uuid, uuid) to service_role;

commit;
