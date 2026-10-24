import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { rupeesToPaise } from "@/lib/money";
import { normalizeNavigation } from "@/lib/navigation";
import { DEFAULT_ACTION_BUTTON_STYLES, resolveActionButtonStyles } from "@/lib/action-button-styles";
import { DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, resolveCustomerLoginRequirements } from "@/lib/customer-login-requirements";
import { DEFAULT_STOREFRONT_THEME, resolveStorefrontTheme } from "@/lib/storefront-theme";
import type { Category, HomepageBanner, HomepageBrand, HomepageSection, Product, SitePage, StoreSettings } from "@/lib/types";

const brandFallback: StoreSettings = {
  store_name: "ZELNO Kitchen", currency: "INR", shipping_fee: 0, free_shipping_minimum: 0, cod_enabled: true,
  whatsapp_enabled: false, whatsapp_product_enabled: false, whatsapp_cart_enabled: false, whatsapp_checkout_enabled: false,
  whatsapp_support_enabled: false, whatsapp_support_message: "Hello, I need help with ZELNO.",
  product_action_button_styles: DEFAULT_ACTION_BUTTON_STYLES,
  customer_login_requirements: DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS,
  storefront_theme: DEFAULT_STOREFRONT_THEME,
};
export const PRODUCT_JOIN = "*, category:categories!products_category_id_fkey(*), product_images(*), product_variants(*), product_content_blocks(*)";

type PublicQueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function logPublicQueryError(scope: string, error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  const queryError = error as PublicQueryError | null;
  console.error(`[public-store] ${scope} failed`, {
    code: queryError?.code,
    message: queryError?.message ?? String(error),
    details: queryError?.details,
    hint: queryError?.hint,
  });
}

function emptyHomeData(connected: boolean) {
  return {
    connected,
    publicDataError: false,
    banners: [] as HomepageBanner[],
    offerBanners: [] as HomepageBanner[],
    brands: [] as HomepageBrand[],
    sections: [] as HomepageSection[],
    categories: [] as Category[],
    products: [] as Product[],
    testimonials: [],
    faqs: [],
  };
}

function isScheduledBannerActive(banner: HomepageBanner, now = Date.now()) {
  const startsAt = banner.starts_at ? Date.parse(banner.starts_at) : null;
  const endsAt = banner.ends_at ? Date.parse(banner.ends_at) : null;
  if (banner.starts_at && !Number.isFinite(startsAt)) return false;
  if (banner.ends_at && !Number.isFinite(endsAt)) return false;
  return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt >= now);
}

export async function getStoreSettings(): Promise<StoreSettings> {
  if (!isSupabaseConfigured) return brandFallback;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("site_settings").select("value").eq("setting_key", "store").eq("is_public", true).maybeSingle();
    if (error) {
      logPublicQueryError("site_settings(store)", error);
      return brandFallback;
    }
    const value = data?.value as Partial<StoreSettings> | undefined;
    return { ...brandFallback, ...value, product_action_button_styles: resolveActionButtonStyles(value?.product_action_button_styles), customer_login_requirements: resolveCustomerLoginRequirements(value?.customer_login_requirements), storefront_theme: resolveStorefrontTheme(value?.storefront_theme) };
  } catch (error) { logPublicQueryError("site_settings(store)", error); return brandFallback; }
}

export async function getAnnouncement() {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("homepage_sections").select("content,is_visible").eq("section_key", "announcement_bar").eq("is_visible", true).maybeSingle();
    if (error) {
      logPublicQueryError("homepage_sections(announcement_bar)", error);
      return null;
    }
    const content = data?.content as { message?: string; href?: string; link_label?: string } | undefined;
    return content?.message ? { message: content.message, href: content.href?.startsWith("/") ? content.href : undefined, linkLabel: content.link_label } : null;
  } catch (error) { logPublicQueryError("homepage_sections(announcement_bar)", error); return null; }
}

export async function getNavigation() {
  if (!isSupabaseConfigured) return normalizeNavigation(null);
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("site_settings").select("value").eq("setting_key", "navigation").eq("is_public", true).maybeSingle();
    if (error) {
      logPublicQueryError("site_settings(navigation)", error);
      return normalizeNavigation(null);
    }
    const value = data?.value as { links?: { label: string; href: string }[] } | undefined;
    return normalizeNavigation(value?.links);
  } catch (error) { logPublicQueryError("site_settings(navigation)", error); return normalizeNavigation(null); }
}

export async function getFooterSettings() {
  if (!isSupabaseConfigured) return { description: "", social_links: {} as Record<string, string>, newsletter_enabled: false };
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("site_settings").select("value").eq("setting_key", "footer").eq("is_public", true).maybeSingle();
    if (error) {
      logPublicQueryError("site_settings(footer)", error);
      return { description: "", social_links: {} as Record<string, string>, newsletter_enabled: false };
    }
    return (data?.value as { description?: string; social_links?: Record<string, string>; newsletter_enabled?: boolean } | undefined) ?? { description: "", social_links: {}, newsletter_enabled: false };
  } catch (error) { logPublicQueryError("site_settings(footer)", error); return { description: "", social_links: {}, newsletter_enabled: false }; }
}

export async function getHomeData() {
  if (!isSupabaseConfigured) return emptyHomeData(false);
  try {
    const supabase = await createServerSupabase();
    const [bannerResult, sectionResult, categoryResult, productResult, testimonialResult, faqResult, brandResult] = await Promise.all([
      supabase.from("homepage_banners").select("*").eq("is_active", true).order("sort_order").limit(100),
      supabase.from("homepage_sections").select("*").eq("is_visible", true).order("sort_order"),
      supabase.from("categories").select("*").eq("is_active", true).eq("featured_on_homepage", true).order("sort_order").limit(8),
      supabase.from("products").select(PRODUCT_JOIN).eq("status", "published").order("published_at", { ascending: false }).limit(12),
      supabase.from("testimonials").select("*").eq("is_approved", true).order("sort_order").limit(8),
      supabase.from("faqs").select("*").eq("is_published", true).order("sort_order").limit(8),
      supabase.from("homepage_brands").select("*").eq("is_active", true).order("sort_order").limit(100),
    ]);
    const queryErrors = [
      ["homepage_banners", bannerResult.error],
      ["homepage_sections", sectionResult.error],
      ["categories", categoryResult.error],
      ["products", productResult.error],
      ["testimonials", testimonialResult.error],
      ["faqs", faqResult.error],
      ["homepage_brands", brandResult.error],
    ] as const;
    queryErrors.forEach(([scope, error]) => { if (error) logPublicQueryError(scope, error); });
    const activeBanners = ((bannerResult.data ?? []) as HomepageBanner[]).filter((banner) => isScheduledBannerActive(banner));
    return { connected: true, publicDataError: queryErrors.some(([, error]) => Boolean(error)), banners: activeBanners.filter((banner) => banner.banner_type !== "offer"), offerBanners: activeBanners.filter((banner) => banner.banner_type === "offer"), brands: (brandResult.data ?? []) as HomepageBrand[], sections: (sectionResult.data ?? []) as HomepageSection[], categories: (categoryResult.data ?? []) as Category[], products: (productResult.data ?? []) as unknown as Product[], testimonials: testimonialResult.data ?? [], faqs: faqResult.data ?? [] };
  } catch (error) {
    logPublicQueryError("homepage data", error);
    return { ...emptyHomeData(true), publicDataError: true };
  }
}

export type CatalogFilters = { search?: string; category?: string; minPrice?: number; maxPrice?: number; available?: boolean; sort?: string; page?: number; pageSize?: number };
export async function getCatalog(filters: CatalogFilters = {}) {
  if (!isSupabaseConfigured) return { products: [] as Product[], categories: [] as Category[], total: 0, page: filters.page ?? 1, configured: false };
  const page = Math.max(1, filters.page ?? 1); const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));
  try {
    const supabase = await createServerSupabase();
    const [{ data: categories, error: categoriesError }, categoryData] = await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      filters.category ? supabase.from("categories").select("id").eq("slug", filters.category).eq("is_active", true).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    if (categoriesError) logPublicQueryError("categories(catalog)", categoriesError);
    if (categoryData.error) logPublicQueryError("categories(category filter)", categoryData.error);
    let query = supabase.from("products").select(PRODUCT_JOIN, { count: "exact" }).eq("status", "published");
    if (filters.category) { if (!categoryData.data?.id) return { products: [], categories: (categories ?? []) as Category[], total: 0, page, configured: true }; query = query.eq("category_id", categoryData.data.id); }
    if (filters.minPrice !== undefined) query = query.gte("price", rupeesToPaise(filters.minPrice, "Minimum price"));
    if (filters.maxPrice !== undefined) query = query.lte("price", rupeesToPaise(filters.maxPrice, "Maximum price"));
    if (filters.available) query = query.or("stock_quantity.gt.0,continue_selling.eq.true");
    const term = filters.search?.trim().replace(/[^\p{L}\p{N}\s'-]/gu, " ").slice(0, 80);
    if (term) {
      const [nameMatches, tagMatches] = await Promise.all([
        supabase.from("products").select("id").eq("status", "published").or(`title.ilike.%${term}%,short_description.ilike.%${term}%`).limit(500),
        supabase.from("tags").select("id").ilike("name", `%${term}%`).limit(100),
      ]);
      if (nameMatches.error) logPublicQueryError("products(search)", nameMatches.error);
      if (tagMatches.error) logPublicQueryError("tags(search)", tagMatches.error);
      const tagIds = (tagMatches.data ?? []).map((tag) => tag.id);
      const taggedProducts = tagIds.length ? await supabase.from("product_tag_map").select("product_id").in("tag_id", tagIds).limit(500) : { data: [] as { product_id: string }[], error: null };
      if (taggedProducts.error) logPublicQueryError("product_tag_map(search)", taggedProducts.error);
      const ids = [...new Set([...(nameMatches.data ?? []).map((item) => item.id), ...(taggedProducts.data ?? []).map((item) => item.product_id)])];
      if (!ids.length) return { products: [], categories: (categories ?? []) as Category[], total: 0, page, configured: true };
      query = query.in("id", ids);
    }
    switch (filters.sort) { case "price-asc": query = query.order("price", { ascending: true }); break; case "price-desc": query = query.order("price", { ascending: false }); break; case "bestseller": query = query.order("is_bestseller", { ascending: false }).order("created_at", { ascending: false }); break; default: query = query.order("created_at", { ascending: false }); }
    const { data, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
    if (error) logPublicQueryError("products(catalog)", error);
    return { products: (data ?? []) as unknown as Product[], categories: (categories ?? []) as Category[], total: count ?? 0, page, configured: true };
  } catch (error) { logPublicQueryError("catalog", error); return { products: [], categories: [], total: 0, page, configured: false }; }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("products").select(PRODUCT_JOIN).eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) logPublicQueryError("products(detail)", error);
    if (error || !data) return null;
    const [reviewResult, tagsResult] = await Promise.all([
      supabase.from("reviews").select("id,product_id,customer_name,rating,body,created_at").eq("product_id", data.id).eq("is_approved", true).order("created_at", { ascending: false }),
      supabase.from("product_tag_map").select("tags(name,slug)").eq("product_id", data.id),
    ]);
    if (reviewResult.error) logPublicQueryError("reviews(detail)", reviewResult.error);
    if (tagsResult.error) logPublicQueryError("product_tag_map(detail)", tagsResult.error);
    return { ...data, product_images: data.product_images ?? [], product_variants: data.product_variants ?? [], product_content_blocks: [...(data.product_content_blocks ?? [])].sort((a, b) => a.sort_order - b.sort_order), reviews: reviewResult.data ?? [], tags: tagsResult.data ?? [] } as unknown as Product;
  } catch (error) { logPublicQueryError("product detail", error); return null; }
}
export async function getProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("products").select(PRODUCT_JOIN).eq("id", id).eq("status", "published").maybeSingle();
    if (error) logPublicQueryError("products(id detail)", error);
    if (error || !data) return null;
    return { ...data, product_images: data.product_images ?? [], product_variants: data.product_variants ?? [], product_content_blocks: [...(data.product_content_blocks ?? [])].sort((a, b) => a.sort_order - b.sort_order) } as unknown as Product;
  } catch (error) { logPublicQueryError("product id detail", error); return null; }
}
export async function getCategoryBySlug(slug: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (error) logPublicQueryError("categories(detail)", error);
    return (data as Category | null) ?? null;
  } catch (error) { logPublicQueryError("category detail", error); return null; }
}
export async function getSitePage(slug: string): Promise<SitePage | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("site_pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) logPublicQueryError("site_pages(detail)", error);
    return (data as SitePage | null) ?? null;
  } catch (error) { logPublicQueryError("site page detail", error); return null; }
}
export async function getProductSitemapEntries() {
  if (!isSupabaseConfigured) return [] as { slug: string; updated_at: string }[];
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("products").select("slug,updated_at").eq("status", "published").limit(5000);
    if (error) logPublicQueryError("products(sitemap)", error);
    return data ?? [];
  } catch (error) { logPublicQueryError("product sitemap", error); return []; }
}
