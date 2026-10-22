-- Repeatable RLS smoke tests for the Phase 2 schema.
-- Run in the Supabase SQL editor as a database owner/postgres role.
-- Requirements: two normal Auth users and one user with the admin role.
-- Every row created by this script is inside the transaction and is rolled back.

begin;

do $$
declare
  user_a uuid;
  user_b uuid;
  admin_user uuid;
begin
  select id into user_a from auth.users order by created_at limit 1;
  select id into user_b from auth.users where id <> user_a order by created_at limit 1;
  select user_id into admin_user from public.user_roles where role = 'admin' limit 1;
  if user_a is null or user_b is null then raise exception 'Create at least two normal Auth users before running RLS tests.'; end if;
  if admin_user is null then raise exception 'Bootstrap one admin user before running RLS tests.'; end if;
  perform set_config('rls_test.user_a', user_a::text, true);
  perform set_config('rls_test.user_b', user_b::text, true);
  perform set_config('rls_test.admin_user', admin_user::text, true);
end;
$$;

-- Anonymous visitors can read the published catalog and cannot read drafts.
set local role anon;
select count(*) as anonymous_published_products from public.products where status = 'published';
do $$ begin
  if exists (select 1 from public.products where status <> 'published') then
    raise exception 'Anonymous catalog policy leaked a non-published product.';
  end if;
end $$;

-- Customer A cannot see Customer B's profile, address, cart, order, or order items.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('rls_test.user_a'))::text, true);
do $$ begin
  if exists (select 1 from public.profiles where id = current_setting('rls_test.user_b')::uuid) then raise exception 'Profile isolation failed.'; end if;
  if exists (select 1 from public.addresses where user_id = current_setting('rls_test.user_b')::uuid) then raise exception 'Address isolation failed.'; end if;
  if exists (select 1 from public.carts where user_id = current_setting('rls_test.user_b')::uuid) then raise exception 'Cart isolation failed.'; end if;
  if exists (select 1 from public.orders where user_id = current_setting('rls_test.user_b')::uuid) then raise exception 'Order isolation failed.'; end if;
  if exists (select 1 from public.order_items oi join public.orders o on o.id = oi.order_id where o.user_id = current_setting('rls_test.user_b')::uuid) then raise exception 'Order item isolation failed.'; end if;
end $$;

-- A customer cannot self-grant admin, write catalog data, or mutate order/payment status.
do $$ begin
  begin
    insert into public.user_roles (user_id, role) values (current_setting('rls_test.user_a')::uuid, 'admin');
    raise exception 'Self-admin role escalation was allowed.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.categories (name, slug) values ('RLS test', 'rls-test');
    raise exception 'Customer catalog write was allowed.';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.orders set payment_status = 'paid' where user_id = current_setting('rls_test.user_a')::uuid;
    raise exception 'Customer payment-status update was allowed.';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.orders set order_status = 'delivered' where user_id = current_setting('rls_test.user_a')::uuid;
    raise exception 'Customer order-status update was allowed.';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Service-role writes are the only privileged path used by the admin APIs.
set local role service_role;
insert into public.categories (name, slug) values ('RLS test only', 'rls-test-only');

-- A service-role checkout can be exercised by the application RPC; the browser cannot invoke it.
do $$ begin
  if has_function_privilege('anon', 'public.create_checkout_order(text, uuid, jsonb, jsonb, text, text)', 'execute') then raise exception 'Anonymous checkout RPC execution was granted.'; end if;
  if has_function_privilege('authenticated', 'public.create_checkout_order(text, uuid, jsonb, jsonb, text, text)', 'execute') then raise exception 'Authenticated checkout RPC execution was granted.'; end if;
  if has_function_privilege('anon', 'public.release_failed_payment_stock(text)', 'execute') then raise exception 'Anonymous inventory-release RPC execution was granted.'; end if;
end $$;

rollback;
