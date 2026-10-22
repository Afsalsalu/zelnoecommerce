-- Admin-managed homepage brand logos. Records are intentionally separate from
-- promotional banners because they have a different content and lifecycle model.
create table if not exists public.homepage_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  logo_url text not null,
  destination_url text,
  alt_text text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists homepage_brands_active_order_idx
  on public.homepage_brands(is_active, sort_order);

alter table public.homepage_brands enable row level security;

drop policy if exists homepage_brands_public_active on public.homepage_brands;
create policy homepage_brands_public_active
  on public.homepage_brands for select
  to anon, authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));

drop policy if exists homepage_brands_admin_all on public.homepage_brands;
create policy homepage_brands_admin_all
  on public.homepage_brands for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists homepage_brands_set_updated_at on public.homepage_brands;
create trigger homepage_brands_set_updated_at
  before update on public.homepage_brands
  for each row execute function public.set_updated_at();

grant select on public.homepage_brands to anon, authenticated;
grant all privileges on public.homepage_brands to service_role;
