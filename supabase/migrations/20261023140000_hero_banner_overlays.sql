alter table public.homepage_banners
  add column if not exists overlay_enabled boolean,
  add column if not exists overlay_color text,
  add column if not exists overlay_opacity smallint,
  add column if not exists overlay_direction text;

update public.homepage_banners
set
  overlay_enabled = coalesce(overlay_enabled, true),
  overlay_color = coalesce(overlay_color, 'dark'),
  overlay_opacity = coalesce(overlay_opacity, 35),
  overlay_direction = coalesce(overlay_direction, 'bottom-to-top');

alter table public.homepage_banners
  alter column overlay_enabled set default true,
  alter column overlay_enabled set not null,
  alter column overlay_color set default 'dark',
  alter column overlay_color set not null,
  alter column overlay_opacity set default 35,
  alter column overlay_opacity set not null,
  alter column overlay_direction set default 'bottom-to-top',
  alter column overlay_direction set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'homepage_banners_overlay_color_check') then
    alter table public.homepage_banners
      add constraint homepage_banners_overlay_color_check check (overlay_color in ('dark', 'light'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_banners_overlay_opacity_check') then
    alter table public.homepage_banners
      add constraint homepage_banners_overlay_opacity_check check (overlay_opacity between 0 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'homepage_banners_overlay_direction_check') then
    alter table public.homepage_banners
      add constraint homepage_banners_overlay_direction_check check (overlay_direction in ('full', 'bottom-to-top', 'left-to-right', 'right-to-left'));
  end if;
end $$;
