import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeSections } from "@/components/home-sections";
import { getHomeData, getStoreSettings } from "@/lib/store";
import type { HomepageSection } from "@/lib/types";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [data, settings] = await Promise.all([getHomeData(), getStoreSettings()]);
  if (!data.connected) return <section className="mx-auto grid min-h-[68vh] max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:px-12"><div className="max-w-xl py-8"><span className="eyebrow">A considered home edit</span><h1 className="mt-5 font-display text-6xl leading-[.94] tracking-[-.04em] sm:text-7xl">Everyday<br />essentials,<br /><span className="text-olive">elevated.</span></h1><p className="mt-6 max-w-md text-sm leading-7 text-muted">Connect your Supabase project and apply the development seed to display store-managed products and homepage content.</p><Link href="/shop" className="button-primary mt-7">Explore the shop<ArrowRight size={15} /></Link></div><div className="relative aspect-[4/3] overflow-hidden bg-sand lg:aspect-[1.1]">{<Image src="/manus-storage/async-images/X6IrwoCu3XBCxlgWSUpDKN/image-1.webp" alt="Warm, considered kitchen essentials on a limestone counter" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />}</div></section>;
  const hasRenderableSections = data.sections.some((section) => section.is_visible && section.section_key !== "announcement_bar");
  const fallbackSection: HomepageSection = { id: "fallback-featured-products", section_key: "featured_products", title: "Made for everyday living", content: { mode: "latest", cta_label: "Shop all", cta_href: "/shop" }, sort_order: 0, is_visible: true };
  const sectionData = hasRenderableSections || data.products.length === 0 ? data : { ...data, sections: [fallbackSection] };
  return <>
    {!hasRenderableSections && data.products.length === 0 && <section className="mx-auto max-w-4xl px-5 py-20 text-center"><span className="eyebrow">The store is ready to take shape</span><h1 className="mt-4 font-display text-4xl">Add your first homepage section</h1><p className="mt-4 text-sm text-muted">Publish store content from the admin dashboard to bring the homepage to life.</p></section>}
    <HomeSections data={sectionData} settings={settings} />
  </>;
}
