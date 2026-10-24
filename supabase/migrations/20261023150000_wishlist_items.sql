create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_created_idx on public.wishlist_items(user_id, created_at desc);

alter table public.wishlist_items enable row level security;

drop policy if exists wishlist_items_owner_select on public.wishlist_items;
create policy wishlist_items_owner_select on public.wishlist_items
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists wishlist_items_owner_insert on public.wishlist_items;
create policy wishlist_items_owner_insert on public.wishlist_items
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists wishlist_items_owner_delete on public.wishlist_items;
create policy wishlist_items_owner_delete on public.wishlist_items
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.wishlist_items to authenticated;
grant all privileges on public.wishlist_items to service_role;
