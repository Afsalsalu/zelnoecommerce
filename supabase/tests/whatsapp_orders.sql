-- Integration coverage for the WhatsApp order lifecycle.
-- Run after the WhatsApp migration in the Supabase SQL editor as postgres/database owner.
-- The transaction rolls back, so it does not leave a test order, product, or setting behind.

begin;

do $$
declare
  customer_id uuid;
  product_id uuid;
  variant_id uuid;
  before_stock integer;
  after_request_stock integer;
  after_confirm_stock integer;
  after_duplicate_confirm_stock integer;
  actual_price bigint;
  old_store jsonb;
  request jsonb;
  duplicate_request jsonb;
  confirmed jsonb;
  duplicate_confirm jsonb;
  request_key uuid := gen_random_uuid();
  request_id uuid;
begin
  select id into customer_id from auth.users order by created_at limit 1;
  if customer_id is null then raise exception 'Create one normal Auth user before running WhatsApp integration tests.'; end if;

  select p.id, v.id, v.stock_quantity, v.price into product_id, variant_id, before_stock, actual_price
  from public.products p join public.product_variants v on v.product_id = p.id
  where p.status = 'published' and v.stock_quantity > 0 and v.stock_status <> 'continue_selling'
  order by p.created_at limit 1;
  if product_id is null then
    select p.id, null::uuid, p.stock_quantity, p.price into product_id, variant_id, before_stock, actual_price
    from public.products p
    where p.status = 'published' and p.stock_quantity > 0 and not p.continue_selling
    order by p.created_at limit 1;
  end if;
  if product_id is null then raise exception 'Need one published, finite-stock product or variant for WhatsApp integration tests.'; end if;

  select value into old_store from public.site_settings where setting_key = 'store';
  if old_store is null then
    insert into public.site_settings(setting_key, value, is_public) values ('store', jsonb_build_object('whatsapp_enabled', true, 'shipping_fee', 0, 'free_shipping_minimum', 0), true);
  else
    update public.site_settings set value = old_store || jsonb_build_object('whatsapp_enabled', true, 'shipping_fee', 0, 'free_shipping_minimum', 0) where setting_key = 'store';
  end if;

  request := public.create_whatsapp_order_request(
    'ZK-20261023-RLSTEST01', customer_id,
    jsonb_build_object('name','WhatsApp Test Customer','email','whatsapp-test@example.com','phone','+91 98765 43210','address',jsonb_build_object('address_line','1 Test Road','area','Test Area','city','Kochi','state','Kerala','pincode','682001')),
    jsonb_build_array(jsonb_build_object('productId',product_id,'variantId',variant_id,'quantity',1,'price',0)), null, request_key);

  request_id := (request->>'id')::uuid;
  if request->>'idempotent' <> 'false' then raise exception 'First WhatsApp request was not created as a new request.'; end if;
  if (select order_source from public.orders where id = request_id) <> 'whatsapp' then raise exception 'WhatsApp request did not use the WhatsApp order source.'; end if;
  if (select whatsapp_status from public.orders where id = request_id) <> 'awaiting_whatsapp_confirmation' then raise exception 'WhatsApp request did not start in awaiting status.'; end if;

  duplicate_request := public.create_whatsapp_order_request(
    'ZK-20261023-RLSTEST02', customer_id,
    jsonb_build_object('name','Changed Customer','email','changed@example.com','phone','+91 98765 43210','address',jsonb_build_object('address_line','2 Test Road','area','Test Area','city','Kochi','state','Kerala','pincode','682001')),
    jsonb_build_array(jsonb_build_object('productId',product_id,'variantId',variant_id,'quantity',1)), null, request_key);
  if duplicate_request->>'id' <> request->>'id' or duplicate_request->>'idempotent' <> 'true' then raise exception 'Duplicate WhatsApp request was not idempotent.'; end if;
  if (select count(*) from public.orders where whatsapp_request_key = request_key) <> 1 then raise exception 'Duplicate WhatsApp request created more than one order.'; end if;

  begin
    perform public.create_whatsapp_order_request(
      'ZK-20261023-RLSTEST03', customer_id,
      jsonb_build_object('name','Invalid Customer'),
      jsonb_build_array(jsonb_build_object('productId',product_id,'variantId',variant_id,'quantity',1)), null, gen_random_uuid());
    raise exception 'Expected INVALID_CUSTOMER validation failure.';
  exception when others then
    if sqlerrm <> 'INVALID_CUSTOMER' then raise; end if;
  end;

  if variant_id is not null then select stock_quantity into after_request_stock from public.product_variants where id = variant_id; else select stock_quantity into after_request_stock from public.products where id = product_id; end if;
  if after_request_stock <> before_stock then raise exception 'WhatsApp request creation reduced stock.'; end if;
  select unit_price into actual_price from public.order_items where order_id = request_id;
  if actual_price <> (select case when variant_id is not null then (select price from public.product_variants where id = variant_id) else (select price from public.products where id = product_id) end) then raise exception 'WhatsApp request did not recalculate the server price.'; end if;

  confirmed := public.confirm_whatsapp_order(request_id, null);
  if variant_id is not null then select stock_quantity into after_confirm_stock from public.product_variants where id = variant_id; else select stock_quantity into after_confirm_stock from public.products where id = product_id; end if;
  if after_confirm_stock <> before_stock - 1 then raise exception 'WhatsApp confirmation did not reduce stock exactly once.'; end if;

  duplicate_confirm := public.confirm_whatsapp_order(request_id, null);
  if variant_id is not null then select stock_quantity into after_duplicate_confirm_stock from public.product_variants where id = variant_id; else select stock_quantity into after_duplicate_confirm_stock from public.products where id = product_id; end if;
  if after_duplicate_confirm_stock <> after_confirm_stock then raise exception 'Duplicate WhatsApp confirmation reduced stock twice.'; end if;
end;
$$;

rollback;
