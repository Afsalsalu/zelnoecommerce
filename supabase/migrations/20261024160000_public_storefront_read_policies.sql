-- Public storefront reads must not call admin-only helpers. The previous
-- mixed policies included public.has_role(auth.uid(), ...), but that helper
-- is intentionally unavailable to anon. Keep admin access in the existing
-- authenticated admin policies and make the public predicates self-contained.

drop policy if exists categories_public_active on public.categories;
create policy categories_public_active
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists products_public_published on public.products;
create policy products_public_published
  on public.products for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists product_images_public_published on public.product_images;
create policy product_images_public_published
  on public.product_images for select
  to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published'
  ));

drop policy if exists variants_public_published on public.product_variants;
create policy variants_public_published
  on public.product_variants for select
  to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published'
  ));

drop policy if exists blocks_public_visible_published on public.product_content_blocks;
create policy blocks_public_visible_published
  on public.product_content_blocks for select
  to anon, authenticated
  using (
    is_visible = true
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.status = 'published'
    )
  );

drop policy if exists tag_map_public_published on public.product_tag_map;
create policy tag_map_public_published
  on public.product_tag_map for select
  to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published'
  ));

drop policy if exists sections_public_visible on public.homepage_sections;
create policy sections_public_visible
  on public.homepage_sections for select
  to anon, authenticated
  using (is_visible = true);

drop policy if exists banners_public_active on public.homepage_banners;
create policy banners_public_active
  on public.homepage_banners for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists testimonials_public_approved on public.testimonials;
create policy testimonials_public_approved
  on public.testimonials for select
  to anon, authenticated
  using (is_approved = true);

drop policy if exists faqs_public_published on public.faqs;
create policy faqs_public_published
  on public.faqs for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists pages_public_published on public.site_pages;
create policy pages_public_published
  on public.site_pages for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read
  on public.site_settings for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists coupons_active_public_read on public.coupons;
create policy coupons_active_public_read
  on public.coupons for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists reviews_public_approved on public.reviews;
create policy reviews_public_approved
  on public.reviews for select
  to anon, authenticated
  using (is_approved = true);

drop policy if exists reviews_customer_own on public.reviews;
create policy reviews_customer_own
  on public.reviews for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.categories, public.products, public.product_images,
  public.product_variants, public.product_content_blocks, public.tags,
  public.product_tag_map, public.homepage_sections, public.homepage_banners,
  public.testimonials, public.faqs, public.site_pages, public.site_settings,
  public.coupons, public.reviews
  to anon, authenticated;
