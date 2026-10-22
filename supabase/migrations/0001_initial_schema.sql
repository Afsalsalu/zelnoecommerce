create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.product_visibility as enum ('draft', 'published');
create type public.order_status as enum ('new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded');
create type public.payment_status as enum ('pending', 'payment_pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.discount_type as enum ('percentage', 'fixed');
create type public.content_block_type as enum ('heading', 'rich_text', 'full_width_image', 'two_image_gallery', 'image_with_text', 'video_embed', 'feature_list', 'specification_table', 'comparison', 'faq', 'divider');
create type public.enquiry_status as enum ('new', 'read', 'replied');

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles(user_id);

create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role); $$;
revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', '')) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict (user_id, role) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  image_public_id text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  featured_on_homepage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_active_order_idx on public.categories(is_active, sort_order);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  sku text unique,
  short_description text not null default '',
  description text not null default '',
  status public.product_visibility not null default 'draft',
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  continue_selling boolean not null default false,
  badge text,
  is_bestseller boolean not null default false,
  seo_title text,
  seo_description text,
  seo_image_url text,
  video_url text,
  related_product_ids uuid[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_public_sort_idx on public.products(status, published_at desc, created_at desc);
create index products_category_idx on public.products(category_id, status);
create index products_bestseller_idx on public.products(is_bestseller desc, status);
create index products_title_search_idx on public.products using gin (to_tsvector('english', title || ' ' || short_description));

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  cloudinary_public_id text,
  url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_images_product_order_idx on public.product_images(product_id, sort_order);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null default 'Standard',
  option_values jsonb not null default '{}'::jsonb,
  sku text unique,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'out_of_stock', 'continue_selling')),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants(product_id, sort_order);

create table public.product_content_blocks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  block_type public.content_block_type not null,
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_content_order_idx on public.product_content_blocks(product_id, sort_order, is_visible);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.product_tag_map (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, tag_id)
);
create index product_tag_map_tag_idx on public.product_tag_map(tag_id, product_id);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text not null default '',
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index homepage_sections_visible_order_idx on public.homepage_sections(is_visible, sort_order);
create table public.homepage_banners (
  id uuid primary key default gen_random_uuid(),
  heading text not null default '',
  description text not null default '',
  cta_label text not null default '',
  cta_href text not null default '/shop',
  desktop_image_url text,
  mobile_image_url text,
  image_alt text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index homepage_banners_active_order_idx on public.homepage_banners(is_active, sort_order);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  quote text not null,
  rating smallint not null default 5 check (rating between 1 and 5),
  product_id uuid references public.products(id) on delete set null,
  is_approved boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_public_order_idx on public.faqs(is_published, sort_order);
create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  body text not null default '',
  seo_title text,
  seo_description text,
  is_published boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address_line text not null,
  area text not null,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id, is_default desc);
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);
create index cart_items_cart_idx on public.cart_items(cart_id);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type public.discount_type not null,
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_order_amount numeric(12,2) not null default 0 check (minimum_order_amount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  one_time_per_customer boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index coupons_active_dates_idx on public.coupons(is_active, starts_at, ends_at);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  order_notes text not null default '',
  shipping_method text not null default 'standard',
  order_status public.order_status not null default 'new',
  payment_status public.payment_status not null default 'pending',
  payment_method text not null check (payment_method in ('cod', 'razorpay')),
  payment_reference text,
  coupon_id uuid references public.coupons(id) on delete set null,
  coupon_code text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  tracking_courier text,
  tracking_number text,
  admin_notes text not null default '',
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_recent_idx on public.orders(user_id, placed_at desc);
create index orders_number_idx on public.orders(order_number);
create index orders_status_date_idx on public.orders(order_status, placed_at desc);
create index orders_customer_email_idx on public.orders(lower(customer_email));
create index orders_customer_phone_idx on public.orders(customer_phone);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_title_snapshot text not null,
  sku_snapshot text not null default '',
  variant_snapshot jsonb not null default '{}'::jsonb,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  quantity integer not null check (quantity > 0),
  image_url_snapshot text,
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  next_status public.order_status not null,
  note text not null default '',
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_history_order_idx on public.order_status_history(order_id, created_at);
create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coupon_usages_customer_idx on public.coupon_usages(coupon_id, lower(customer_email));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_public_product_idx on public.reviews(product_id, is_approved, created_at desc);
create table public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  subject text not null,
  message text not null,
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_status_date_idx on public.contact_enquiries(status, created_at desc);

-- Consistent update timestamps across mutable records.
do $$ declare t text; begin
  foreach t in array array['profiles','user_roles','categories','products','product_images','product_variants','product_content_blocks','tags','homepage_sections','homepage_banners','testimonials','faqs','site_pages','site_settings','addresses','carts','cart_items','coupons','orders','order_items','order_status_history','coupon_usages','reviews','contact_enquiries'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- RLS is enabled on every application table; mutations use server-only service credentials after authorization.
do $$ declare t text; begin
  foreach t in array array['profiles','user_roles','categories','products','product_images','product_variants','product_content_blocks','tags','product_tag_map','homepage_sections','homepage_banners','testimonials','faqs','site_pages','site_settings','addresses','carts','cart_items','coupons','orders','order_items','order_status_history','coupon_usages','reviews','contact_enquiries'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "profiles_read_own_or_admin" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "profiles_update_own_or_admin" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin')) with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "roles_read_own_or_admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "categories_public_active" on public.categories for select to anon, authenticated using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "categories_admin_all" on public.categories for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "products_public_published" on public.products for select to anon, authenticated using (status = 'published' or public.has_role(auth.uid(), 'admin'));
create policy "products_admin_all" on public.products for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "product_images_public_published" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.has_role(auth.uid(), 'admin'))));
create policy "product_images_admin_all" on public.product_images for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "variants_public_published" on public.product_variants for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.has_role(auth.uid(), 'admin'))));
create policy "variants_admin_all" on public.product_variants for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "blocks_public_visible_published" on public.product_content_blocks for select to anon, authenticated using (is_visible and exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.has_role(auth.uid(), 'admin'))));
create policy "blocks_admin_all" on public.product_content_blocks for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "tags_public_read" on public.tags for select to anon, authenticated using (true);
create policy "tags_admin_all" on public.tags for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "tag_map_public_published" on public.product_tag_map for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.has_role(auth.uid(), 'admin'))));
create policy "tag_map_admin_all" on public.product_tag_map for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "sections_public_visible" on public.homepage_sections for select to anon, authenticated using (is_visible or public.has_role(auth.uid(), 'admin'));
create policy "sections_admin_all" on public.homepage_sections for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "banners_public_active" on public.homepage_banners for select to anon, authenticated using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "banners_admin_all" on public.homepage_banners for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "testimonials_public_approved" on public.testimonials for select to anon, authenticated using (is_approved or public.has_role(auth.uid(), 'admin'));
create policy "testimonials_admin_all" on public.testimonials for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "faqs_public_published" on public.faqs for select to anon, authenticated using (is_published or public.has_role(auth.uid(), 'admin'));
create policy "faqs_admin_all" on public.faqs for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "pages_public_published" on public.site_pages for select to anon, authenticated using (is_published or public.has_role(auth.uid(), 'admin'));
create policy "pages_admin_all" on public.site_pages for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "settings_public_read" on public.site_settings for select to anon, authenticated using (is_public or public.has_role(auth.uid(), 'admin'));
create policy "settings_admin_all" on public.site_settings for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "addresses_owner_or_admin" on public.addresses for all to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin')) with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "carts_owner" on public.carts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items_owner" on public.cart_items for all to authenticated using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())) with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "coupons_active_public_read" on public.coupons for select to anon, authenticated using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or public.has_role(auth.uid(), 'admin'));
create policy "coupons_admin_all" on public.coupons for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "orders_owner_or_admin_read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "orders_admin_all" on public.orders for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "order_items_owner_or_admin_read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));
create policy "order_items_admin_all" on public.order_items for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "order_history_owner_or_admin_read" on public.order_status_history for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))));
create policy "order_history_admin_all" on public.order_status_history for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "coupon_usage_owner_or_admin_read" on public.coupon_usages for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "coupon_usage_admin_all" on public.coupon_usages for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "reviews_public_approved" on public.reviews for select to anon, authenticated using (is_approved or user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "reviews_customer_pending_insert" on public.reviews for insert to authenticated with check (user_id = auth.uid() and is_approved = false and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.order_status = 'delivered'));
create policy "reviews_admin_all" on public.reviews for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "enquiries_public_insert" on public.contact_enquiries for insert to anon, authenticated with check (status = 'new' and length(trim(name)) between 1 and 120 and length(message) between 10 and 5000);
create policy "enquiries_admin_all" on public.contact_enquiries for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Grant only the table operations needed by application roles; RLS remains the data boundary.
grant select on public.categories, public.products, public.product_images, public.product_variants, public.product_content_blocks, public.tags, public.product_tag_map, public.homepage_sections, public.homepage_banners, public.testimonials, public.faqs, public.site_pages, public.site_settings, public.coupons, public.reviews to anon, authenticated;
grant select, insert, update on public.profiles, public.addresses, public.carts, public.cart_items, public.reviews, public.contact_enquiries to authenticated;
grant insert on public.contact_enquiries to anon;
grant select on public.user_roles, public.orders, public.order_items, public.order_status_history, public.coupon_usages to authenticated;
grant all privileges on all tables in schema public to service_role;


-- Newsletter capture is public-write/admin-read; only normalized email and a consent timestamp are persisted.
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
create trigger set_updated_at before update on public.newsletter_subscribers for each row execute function public.set_updated_at();
create policy "newsletter_public_subscribe" on public.newsletter_subscribers for insert to anon, authenticated with check (email = lower(email));
create policy "newsletter_admin_read" on public.newsletter_subscribers for select to authenticated using (public.has_role(auth.uid(), 'admin'));
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select on public.newsletter_subscribers to authenticated;
grant all privileges on public.newsletter_subscribers to service_role;

-- All checkout writes execute in one transaction. The service-role-only function ignores client-supplied prices.
create or replace function public.create_checkout_order(
  p_order_number text,
  p_user_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_coupon_code text default null,
  p_payment_method text default 'cod'
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  variant_row public.product_variants%rowtype;
  coupon_row public.coupons%rowtype;
  product_id_value uuid;
  variant_id_value uuid;
  quantity_value integer;
  item_price numeric(12,2);
  item_sku text;
  item_variant jsonb;
  item_image text;
  item_stock integer;
  item_stock_status text;
  snapshots jsonb := '[]'::jsonb;
  subtotal_value numeric(12,2) := 0;
  discount_value numeric(12,2) := 0;
  shipping_value numeric(12,2) := 0;
  total_value numeric(12,2) := 0;
  shipping_fee_value numeric(12,2) := 99;
  free_shipping_value numeric(12,2) := 1999;
  cod_enabled_value boolean := true;
  setting_value jsonb;
  coupon_id_value uuid := null;
  coupon_code_value text := null;
  order_id_value uuid;
  line_total_value numeric(12,2);
begin
  if p_payment_method not in ('cod','razorpay') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 40 then raise exception 'INVALID_ITEMS'; end if;
  if length(coalesce(p_order_number,'')) < 12 or length(p_order_number) > 40 then raise exception 'INVALID_ORDER_NUMBER'; end if;
  if nullif(trim(p_customer->>'name'),'') is null or nullif(trim(p_customer->>'email'),'') is null or nullif(trim(p_customer->>'phone'),'') is null then raise exception 'INVALID_CUSTOMER'; end if;
  if coalesce(p_customer#>>'{address,pincode}','') !~ '^[0-9]{6}$' then raise exception 'INVALID_ADDRESS'; end if;

  select value into setting_value from public.site_settings where setting_key = 'store';
  if setting_value is not null then
    shipping_fee_value := coalesce(nullif(setting_value->>'shipping_fee','')::numeric,99);
    free_shipping_value := coalesce(nullif(setting_value->>'free_shipping_minimum','')::numeric,1999);
    cod_enabled_value := coalesce((setting_value->>'cod_enabled')::boolean,true);
  end if;
  if p_payment_method = 'cod' and not cod_enabled_value then raise exception 'COD_DISABLED'; end if;

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
    line_total_value := item_price * quantity_value;
    subtotal_value := subtotal_value + line_total_value;
    snapshots := snapshots || jsonb_build_array(jsonb_build_object('product_id',product_id_value,'variant_id',variant_id_value,'title',product_row.title,'sku',item_sku,'variant',item_variant,'price',item_price,'image',item_image,'quantity',quantity_value,'line_total',line_total_value,'stock_status',item_stock_status));
  end loop;

  if nullif(trim(coalesce(p_coupon_code,'')),'') is not null then
    select * into coupon_row from public.coupons where code = upper(trim(p_coupon_code)) and is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()) for update;
    if not found then raise exception 'INVALID_COUPON'; end if;
    if subtotal_value < coupon_row.minimum_order_amount then raise exception 'COUPON_MINIMUM_NOT_MET'; end if;
    if coupon_row.usage_limit is not null and coupon_row.usage_count >= coupon_row.usage_limit then raise exception 'COUPON_EXHAUSTED'; end if;
    if coupon_row.one_time_per_customer and exists (select 1 from public.coupon_usages where coupon_id = coupon_row.id and lower(customer_email) = lower(p_customer->>'email')) then raise exception 'COUPON_ALREADY_USED'; end if;
    coupon_id_value := coupon_row.id;
    coupon_code_value := coupon_row.code;
    discount_value := case when coupon_row.discount_type = 'percentage' then round(subtotal_value * coupon_row.discount_value / 100,2) else coupon_row.discount_value end;
    discount_value := least(discount_value, subtotal_value);
  end if;
  if subtotal_value - discount_value < free_shipping_value then shipping_value := shipping_fee_value; end if;
  total_value := greatest(0, subtotal_value - discount_value + shipping_value);

  insert into public.orders(order_number,user_id,customer_name,customer_email,customer_phone,shipping_address,order_notes,shipping_method,order_status,payment_status,payment_method,coupon_id,coupon_code,subtotal,discount_total,shipping_total,total)
  values(p_order_number,p_user_id,trim(p_customer->>'name'),lower(trim(p_customer->>'email')),trim(p_customer->>'phone'),p_customer->'address',coalesce(p_customer->>'notes',''),coalesce(p_customer->>'shipping_method','standard'),'new',case when p_payment_method='cod' then 'pending'::public.payment_status else 'payment_pending'::public.payment_status end,p_payment_method,coupon_id_value,coupon_code_value,subtotal_value,discount_value,shipping_value,total_value)
  returning id into order_id_value;

  for item in select value from jsonb_array_elements(snapshots) loop
    insert into public.order_items(order_id,product_id,variant_id,product_title_snapshot,sku_snapshot,variant_snapshot,unit_price,discount,quantity,image_url_snapshot,line_total)
    values(order_id_value,(item->>'product_id')::uuid,nullif(item->>'variant_id','')::uuid,item->>'title',coalesce(item->>'sku',''),coalesce(item->'variant','{}'::jsonb) || jsonb_build_object('stock_status',item->>'stock_status'),(item->>'price')::numeric,0,(item->>'quantity')::integer,item->>'image',(item->>'line_total')::numeric);
    if (item->>'stock_status') <> 'continue_selling' then
      if nullif(item->>'variant_id','') is not null then
        update public.product_variants set stock_quantity = stock_quantity - (item->>'quantity')::integer where id = (item->>'variant_id')::uuid;
        update public.products set stock_quantity = coalesce((select sum(stock_quantity)::integer from public.product_variants where product_id = (item->>'product_id')::uuid),0) where id = (item->>'product_id')::uuid;
      else
        update public.products set stock_quantity = stock_quantity - (item->>'quantity')::integer where id = (item->>'product_id')::uuid;
      end if;
    end if;
  end loop;
  insert into public.order_status_history(order_id,previous_status,next_status,note) values(order_id_value,null,'new','Order placed');
  if coupon_id_value is not null then
    update public.coupons set usage_count = usage_count + 1 where id = coupon_id_value;
    insert into public.coupon_usages(coupon_id,order_id,user_id,customer_email) values(coupon_id_value,order_id_value,p_user_id,lower(trim(p_customer->>'email')));
  end if;
  return jsonb_build_object('id',order_id_value,'order_number',p_order_number,'subtotal',subtotal_value,'discount_total',discount_value,'shipping_total',shipping_value,'total',total_value,'payment_status',case when p_payment_method='cod' then 'pending' else 'payment_pending' end);
end;
$$;
revoke all on function public.create_checkout_order(text, uuid, jsonb, jsonb, text, text) from public;
revoke all on function public.create_checkout_order(text, uuid, jsonb, jsonb, text, text) from anon, authenticated;
grant execute on function public.create_checkout_order(text, uuid, jsonb, jsonb, text, text) to service_role;


-- Release an online-payment reservation only after a verified provider failure, exactly once.
alter table public.orders add column stock_released_at timestamptz;
create or replace function public.release_failed_payment_stock(p_gateway_order_id text) returns boolean
language plpgsql security definer set search_path = public
as $$
declare order_row public.orders%rowtype; line_row record;
begin
  select * into order_row from public.orders where payment_reference = p_gateway_order_id for update;
  if not found or order_row.payment_status = 'paid' or order_row.stock_released_at is not null then return false; end if;
  for line_row in select product_id,variant_id,quantity,variant_snapshot from public.order_items where order_id = order_row.id loop
    if coalesce(line_row.variant_snapshot->>'stock_status','in_stock') <> 'continue_selling' then
      if line_row.variant_id is not null then
        update public.product_variants set stock_quantity = stock_quantity + line_row.quantity where id = line_row.variant_id;
        update public.products set stock_quantity = coalesce((select sum(stock_quantity)::integer from public.product_variants where product_id = line_row.product_id),0) where id = line_row.product_id;
      elsif line_row.product_id is not null then
        update public.products set stock_quantity = stock_quantity + line_row.quantity where id = line_row.product_id;
      end if;
    end if;
  end loop;
  update public.orders set stock_released_at = now(),payment_status='failed',order_status=case when order_status in ('new','confirmed') then 'cancelled'::public.order_status else order_status end where id = order_row.id;
  insert into public.order_status_history(order_id,previous_status,next_status,note) values(order_row.id,order_row.order_status,case when order_row.order_status in ('new','confirmed') then 'cancelled'::public.order_status else order_row.order_status end,'Online payment failed; inventory reservation released');
  return true;
end;
$$;
revoke all on function public.release_failed_payment_stock(text) from public,anon,authenticated;
grant execute on function public.release_failed_payment_stock(text) to service_role;
