-- Repair the public storefront read boundary without assuming optional
-- storefront tables exist in the target database. The preceding migration
-- can have applied some policies before stopping on an absent brands table.
-- Existing authenticated admin policies are intentionally preserved.

do $$
declare
  policy_row record;
begin
  for policy_row in
    select * from (values
      ('categories', 'categories_public_active', 'is_active = true'),
      ('products', 'products_public_published', 'status = ''published'''),
      ('tags', 'tags_public_read', 'true'),
      ('homepage_sections', 'sections_public_visible', 'is_visible = true'),
      ('testimonials', 'testimonials_public_approved', 'is_approved = true'),
      ('faqs', 'faqs_public_published', 'is_published = true'),
      ('site_pages', 'pages_public_published', 'is_published = true'),
      ('site_settings', 'settings_public_read', 'is_public = true'),
      ('coupons', 'coupons_active_public_read', 'is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())'),
      ('reviews', 'reviews_public_approved', 'is_approved = true')
    ) as public_policy(table_name, policy_name, condition_sql)
  loop
    if to_regclass(format('public.%I', policy_row.table_name)) is null then
      raise notice 'Skipped missing public storefront table: public.%', policy_row.table_name;
    else
      execute format('alter table public.%I enable row level security', policy_row.table_name);
      execute format('drop policy if exists %I on public.%I', policy_row.policy_name, policy_row.table_name);
      execute format(
        'create policy %I on public.%I for select to anon, authenticated using (%s)',
        policy_row.policy_name,
        policy_row.table_name,
        policy_row.condition_sql
      );
      execute format('grant select on table public.%I to anon, authenticated', policy_row.table_name);
      raise notice 'Repaired public storefront read policy: public.%', policy_row.table_name;
    end if;
  end loop;

  if to_regclass('public.reviews') is not null then
    execute 'drop policy if exists reviews_customer_own on public.reviews';
    execute 'create policy reviews_customer_own on public.reviews for select to authenticated using (user_id = auth.uid())';
  end if;
end $$;

-- Homepage banners gained scheduling columns in a later migration. Keep the
-- active-only fallback if an older database has not received those columns.
do $$
declare
  banner_condition text;
begin
  if to_regclass('public.homepage_banners') is null then
    raise notice 'Skipped missing public storefront table: public.homepage_banners';
  else
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'homepage_banners'
        and column_name in ('starts_at', 'ends_at')
      group by table_schema, table_name
      having count(*) = 2
    ) then
      banner_condition := 'is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())';
    else
      banner_condition := 'is_active = true';
      raise notice 'Scheduling columns missing on public.homepage_banners; using is_active-only policy';
    end if;

    execute 'alter table public.homepage_banners enable row level security';
    execute 'drop policy if exists banners_public_active on public.homepage_banners';
    execute format(
      'create policy banners_public_active on public.homepage_banners for select to anon, authenticated using (%s)',
      banner_condition
    );
    execute 'grant select on table public.homepage_banners to anon, authenticated';
  end if;
end $$;

-- Product child records are public only when attached to a published product.
-- The dependent policy block is skipped if either side of the relationship is
-- absent, so this repair remains safe on partial schemas.
do $$
declare
  child_row record;
begin
  if to_regclass('public.products') is null then
    raise notice 'Skipped product child policies because public.products is missing';
  else
    for child_row in
      select * from (values
        ('product_images', 'product_images_public_published', 'exists (select 1 from public.products p where p.id = product_id and p.status = ''published'')'),
        ('product_variants', 'variants_public_published', 'exists (select 1 from public.products p where p.id = product_id and p.status = ''published'')'),
        ('product_content_blocks', 'blocks_public_visible_published', 'is_visible = true and exists (select 1 from public.products p where p.id = product_id and p.status = ''published'')'),
        ('product_tag_map', 'tag_map_public_published', 'exists (select 1 from public.products p where p.id = product_id and p.status = ''published'')')
      ) as child_policy(table_name, policy_name, condition_sql)
    loop
      if to_regclass(format('public.%I', child_row.table_name)) is null then
        raise notice 'Skipped missing public storefront table: public.%', child_row.table_name;
      else
        execute format('alter table public.%I enable row level security', child_row.table_name);
        execute format('drop policy if exists %I on public.%I', child_row.policy_name, child_row.table_name);
        execute format(
          'create policy %I on public.%I for select to anon, authenticated using (%s)',
          child_row.policy_name,
          child_row.table_name,
          child_row.condition_sql
        );
        execute format('grant select on table public.%I to anon, authenticated', child_row.table_name);
        raise notice 'Repaired public storefront read policy: public.%', child_row.table_name;
      end if;
    end loop;
  end if;
end $$;

-- Brands are optional. The current project query uses public.homepage_brands,
-- but its owning migration has not been applied in the reported database.
-- Never reference that relation outside this guarded dynamic block.
do $$
begin
  if to_regclass('public.homepage_brands') is null then
    raise notice 'Skipped missing optional public storefront table: public.homepage_brands';
  else
    execute 'alter table public.homepage_brands enable row level security';
    execute 'drop policy if exists homepage_brands_public_active on public.homepage_brands';
    execute 'create policy homepage_brands_public_active on public.homepage_brands for select to anon, authenticated using (is_active = true)';
    execute 'grant select on table public.homepage_brands to anon, authenticated';
    raise notice 'Repaired public storefront read policy: public.homepage_brands';
  end if;
end $$;
