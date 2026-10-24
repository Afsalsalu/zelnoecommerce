-- Additive checkout address history support. Existing address rows and ownership policies remain intact.
alter table public.addresses add column if not exists email text;
alter table public.addresses add column if not exists last_used_at timestamptz;

update public.addresses
set last_used_at = coalesce(last_used_at, updated_at, created_at)
where last_used_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.addresses'::regclass
      and conname = 'addresses_email_check'
  ) then
    alter table public.addresses
      add constraint addresses_email_check
      check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
  end if;
end $$;

create index if not exists addresses_user_last_used_idx
  on public.addresses(user_id, last_used_at desc nulls last, created_at desc);

-- The function runs as the authenticated customer and never accepts a user id from the browser.
-- An advisory transaction lock prevents two successful checkout requests from creating the same address twice.
create or replace function public.record_checkout_address(p_address jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  address_row public.addresses%rowtype;
  address_email text := lower(trim(coalesce(p_address->>'email', '')));
  address_name text := trim(coalesce(p_address->>'full_name', ''));
  address_phone text := trim(coalesce(p_address->>'phone', ''));
  address_line_value text := trim(coalesce(p_address->>'address_line', ''));
  address_area text := trim(coalesce(p_address->>'area', ''));
  address_city text := trim(coalesce(p_address->>'city', ''));
  address_state text := trim(coalesce(p_address->>'state', ''));
  address_pincode text := trim(coalesce(p_address->>'pincode', ''));
  identity_key text;
begin
  if current_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if length(address_name) not between 2 and 120
     or length(address_email) not between 5 and 254
     or address_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or address_phone !~ '^[+0-9 ()-]{8,20}$'
     or length(address_line_value) not between 2 and 240
     or length(address_area) not between 2 and 160
     or length(address_city) not between 2 and 120
     or length(address_state) not between 2 and 120
     or address_pincode !~ '^[0-9]{6}$' then
    raise exception 'INVALID_ADDRESS';
  end if;

  identity_key := concat_ws('|',
    current_user_id::text,
    address_email,
    lower(regexp_replace(address_name, '\s+', ' ', 'g')),
    regexp_replace(address_phone, '[^0-9]', '', 'g'),
    lower(regexp_replace(address_line_value, '\s+', ' ', 'g')),
    lower(regexp_replace(address_area, '\s+', ' ', 'g')),
    lower(regexp_replace(address_city, '\s+', ' ', 'g')),
    lower(regexp_replace(address_state, '\s+', ' ', 'g')),
    address_pincode
  );
  perform pg_advisory_xact_lock(hashtextextended(identity_key, 0));

  select * into address_row
  from public.addresses
  where user_id = current_user_id
    and lower(coalesce(email, '')) = address_email
    and lower(regexp_replace(full_name, '\s+', ' ', 'g')) = lower(regexp_replace(address_name, '\s+', ' ', 'g'))
    and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(address_phone, '[^0-9]', '', 'g')
    and lower(regexp_replace(address_line, '\s+', ' ', 'g')) = lower(regexp_replace(address_line_value, '\s+', ' ', 'g'))
    and lower(regexp_replace(area, '\s+', ' ', 'g')) = lower(regexp_replace(address_area, '\s+', ' ', 'g'))
    and lower(regexp_replace(city, '\s+', ' ', 'g')) = lower(regexp_replace(address_city, '\s+', ' ', 'g'))
    and lower(regexp_replace(state, '\s+', ' ', 'g')) = lower(regexp_replace(address_state, '\s+', ' ', 'g'))
    and pincode = address_pincode
  order by last_used_at desc nulls last, created_at desc
  limit 1;

  if address_row.id is not null then
    update public.addresses
    set last_used_at = now(), email = address_email
    where id = address_row.id and user_id = current_user_id
    returning * into address_row;
    return to_jsonb(address_row);
  end if;

  insert into public.addresses(user_id, label, full_name, email, phone, address_line, area, city, state, pincode, is_default, last_used_at)
  values (
    current_user_id,
    'Checkout',
    address_name,
    address_email,
    address_phone,
    address_line_value,
    address_area,
    address_city,
    address_state,
    address_pincode,
    not exists (select 1 from public.addresses where user_id = current_user_id),
    now()
  )
  returning * into address_row;

  return to_jsonb(address_row);
end;
$$;

revoke all on function public.record_checkout_address(jsonb) from public, anon;
grant execute on function public.record_checkout_address(jsonb) to authenticated;
