import { HomeSections } from "@/components/home-sections";
import { getHomeData, getStoreSettings } from "@/lib/store";
import type { HomepageSection } from "@/lib/types";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [data, settings] = await Promise.all([getHomeData(), getStoreSettings()]);
  const hasRenderableSections = data.sections.some((section) => section.is_visible && section.section_key !== "announcement_bar");
  const fallbackSection: HomepageSection = { id: "fallback-featured-products", section_key: "featured_products", title: "Made for everyday living", content: { mode: "latest", cta_label: "Shop all", cta_href: "/shop" }, sort_order: 0, is_visible: true };
  const sectionData = hasRenderableSections || data.products.length === 0 ? data : { ...data, sections: [fallbackSection] };
  if (!data.connected || (!hasRenderableSections && data.products.length === 0)) return <section className="mx-auto max-w-4xl px-5 py-20 text-center"><span className="eyebrow">A considered home edit</span><h1 className="mt-4 font-display text-4xl">We’re preparing something special.</h1><p className="mt-4 text-sm text-muted">Please check back soon.</p></section>;
  return <HomeSections data={sectionData} settings={settings} />;
}
