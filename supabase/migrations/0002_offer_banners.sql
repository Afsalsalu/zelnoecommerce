alter table public.homepage_banners
  add column if not exists banner_type text not null default 'hero',
  add column if not exists offer_badge text,
  add column if not exists alignment text not null default 'left',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

alter table public.homepage_banners
  drop constraint if exists homepage_banners_banner_type_check,
  add constraint homepage_banners_banner_type_check check (banner_type in ('hero', 'offer'));

alter table public.homepage_banners
  drop constraint if exists homepage_banners_alignment_check,
  add constraint homepage_banners_alignment_check check (alignment in ('left', 'right'));

create index if not exists homepage_banners_type_active_order_idx on public.homepage_banners(banner_type, is_active, sort_order);
