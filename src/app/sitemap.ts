import type { MetadataRoute } from "next";
import { getProductSitemapEntries } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) return [];
  const base = site.replace(/\/$/, "");
  const fixed = ["/", "/shop", "/about", "/contact", "/shipping-policy", "/return-refund-policy", "/privacy-policy", "/terms-conditions"];
  const entries: MetadataRoute.Sitemap = fixed.map((path) => ({ url: `${base}${path}`, changeFrequency: path === "/" ? "weekly" : "monthly", priority: path === "/" ? 1 : 0.5 }));
  if (isSupabaseConfigured) {
    const supabase = await createServerSupabase();
    const [{ data: categories }, products, { data: pages }] = await Promise.all([
      supabase.from("categories").select("slug,updated_at").eq("is_active", true),
      getProductSitemapEntries(),
      supabase.from("site_pages").select("slug,updated_at").eq("is_published", true),
    ]);
    for (const category of categories ?? []) entries.push({ url: `${base}/collections/${category.slug}`, lastModified: category.updated_at, changeFrequency: "weekly", priority: 0.6 });
    for (const product of products) entries.push({ url: `${base}/shop/${product.slug}`, lastModified: product.updated_at, changeFrequency: "weekly", priority: 0.7 });
    for (const page of pages ?? []) if (!fixed.includes(`/${page.slug}`)) entries.push({ url: `${base}/${page.slug}`, lastModified: page.updated_at, changeFrequency: "monthly", priority: 0.4 });
  }
  return entries;
}
