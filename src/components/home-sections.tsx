import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, LockKeyhole, MessageCircle, PackageCheck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { NewsletterSignup } from "@/components/newsletter-signup";
import { CategoryCarousel } from "@/components/category-carousel";
import { OfferBannerCarousel } from "@/components/offer-banner-carousel";
import { BrandLogoMarquee } from "@/components/brand-logo-marquee";
import { HeroBannerCarousel } from "@/components/hero-banner-carousel";
import type { Category, HomepageBanner, HomepageBrand, HomepageSection, Product, StoreSettings } from "@/lib/types";

const iconMap = { "badge-check": BadgeCheck, "lock-keyhole": LockKeyhole, "message-circle": MessageCircle, "package-check": PackageCheck };
type HomeData = { banners: HomepageBanner[]; offerBanners: HomepageBanner[]; brands: HomepageBrand[]; sections: HomepageSection[]; categories: Category[]; products: Product[]; testimonials: { id: string; customer_name: string; quote: string; rating: number }[]; faqs: { id: string; question: string; answer: string }[] };

function Heading({ eyebrow, title, description, href, cta, compactSpacing }: { eyebrow?: string; title: string; description?: string; href?: string; cta?: string; compactSpacing?: boolean }) {
  return <div className={`${compactSpacing ? "mb-3 sm:mb-4" : "mb-8 sm:mb-10"} flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between`}><div className="max-w-2xl"><span className="eyebrow">{eyebrow || "The ZELNO edit"}</span><h2 className="mt-3 font-display text-4xl leading-[1.05] sm:text-5xl">{title}</h2>{description && <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{description}</p>}</div>{href && <Link className="inline-flex items-center gap-2 self-start text-[10px] font-semibold uppercase tracking-[.15em] hover:text-olive sm:self-auto" href={href}>{cta || "Discover more"}<ArrowRight size={14} /></Link>}</div>;
}

function HeroSection({ data, settings, section }: { data: HomeData; settings: StoreSettings; section: HomepageSection }) {
  if (!data.banners.length) return null;
  return <HeroBannerCarousel key={section.id} banners={data.banners} storeName={settings.store_name} />;
}

function ProductSection({ section, products, mode }: { section: HomepageSection; products: Product[]; mode: "latest" | "featured" }) {
  const c = section.content ?? {};
  const description = typeof c.description === "string" ? c.description : undefined;
  const cta = typeof c.cta_label === "string" ? c.cta_label : "View the collection";
  const selected = (mode === "featured" ? products.filter((product) => product.is_bestseller) : products).slice(0, 4);
  return <section key={section.id} className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><Heading title={section.title} description={description} href="/shop" cta={cta} />{selected.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{selected.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="border-y border-line py-8 text-sm text-muted">Product selection will appear here once the catalogue is published.</p>}</section>;
}

function EditorialSection({ section, data, settings }: { section: HomepageSection; data: HomeData; settings: StoreSettings }) {
  const c = section.content ?? {};
  const text = (key: string, fallback = "") => typeof c[key] === "string" ? c[key] as string : fallback;
  switch (section.section_key) {
    case "hero": return HeroSection({ section, data, settings });
    case "featured_collections":
    case "featured_categories": return <section key={section.id} className="mx-auto max-w-[1440px] px-5 pt-16 pb-0 sm:px-8 lg:px-12 lg:pt-24 lg:pb-0"><Heading title={section.title} description={text("description")} href="/shop" cta="Shop all" compactSpacing /><CategoryCarousel categories={data.categories} /></section>;
    case "featured_products": return <ProductSection section={section} products={data.products} mode={text("mode", "latest") === "featured" ? "featured" : "latest"} />;
    case "new_arrivals": return <ProductSection section={section} products={data.products} mode="latest" />;
    case "bestsellers": return <ProductSection section={section} products={data.products} mode="featured" />;
    case "offer_promotion": return <section key={section.id} className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12"><div className="flex flex-col items-start justify-between gap-6 bg-sand px-6 py-9 sm:flex-row sm:items-center sm:px-10 sm:py-12"><div><span className="eyebrow">A considered offer</span><h2 className="mt-3 font-display text-3xl sm:text-4xl">{section.title}</h2><p className="mt-2 text-sm text-muted">{text("description")}</p></div><Link href={text("cta_href", "/shop")} className="button-primary">{text("cta_label", "Explore the edit")}<ArrowRight size={15} /></Link></div></section>;
    case "lifestyle_story": return <section key={section.id} className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:px-12 lg:py-24"><div className="relative aspect-[5/4] overflow-hidden bg-sand lg:aspect-[4/3]">{text("image_url") && <Image src={text("image_url")} alt={text("image_alt", section.title)} fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />}</div><div className="max-w-xl lg:py-10"><span className="eyebrow">A point of view</span><h2 className="mt-4 font-display text-4xl leading-[1.04] sm:text-5xl">{section.title}</h2><p className="mt-5 text-sm leading-7 text-muted sm:text-base">{text("description")}</p><Link className="button-secondary mt-8" href={text("cta_href", "/about")}>{text("cta_label", "Discover ZELNO")}<ArrowRight size={14} /></Link></div></section>;
    case "trust_points": { const items = Array.isArray(c.items) ? c.items as { icon?: keyof typeof iconMap; title?: string; text?: string }[] : []; return <section key={section.id} className="border-y border-line bg-sand"><div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><Heading eyebrow="The ZELNO standard" title={section.title} />{items.length ? <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">{items.map((item, i) => { const Icon = iconMap[item.icon ?? "badge-check"] ?? BadgeCheck; return <div key={`${item.title}-${i}`} className="border-t border-olive/25 pt-5"><Icon size={19} strokeWidth={1.4} className="text-olive" /><h3 className="mt-4 text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs leading-6 text-muted">{item.text}</p></div>; })}</div> : null}</div></section>; }
    case "testimonials": return <section key={section.id} className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24"><Heading title={section.title} description={text("description")} />{data.testimonials.length ? <div className="grid gap-5 sm:grid-cols-2">{data.testimonials.slice(0, 4).map((item) => <figure key={item.id} className="bg-paper p-6 sm:p-8"><div aria-label={`${item.rating} out of 5 stars`} className="text-sm tracking-[.2em] text-olive">{"★".repeat(item.rating)}<span className="sr-only">{item.rating} out of 5</span></div><blockquote className="mt-4 font-display text-2xl leading-snug">“{item.quote}”</blockquote><figcaption className="mt-5 text-[10px] font-semibold uppercase tracking-[.15em] text-muted">{item.customer_name}</figcaption></figure>)}</div> : <p className="text-sm text-muted">Customer notes will be shared here.</p>}</section>;
    case "faq_preview": return <section key={section.id} className="mx-auto max-w-5xl px-5 py-14 sm:px-8 lg:py-20"><Heading title={section.title} description={text("description")} href={text("cta_href", "/contact")} cta={text("cta_label", "Contact us")} /><div className="divide-y divide-line border-y border-line">{data.faqs.slice(0, 4).map((faq) => <details key={faq.id} className="group py-4"><summary className="cursor-pointer list-none text-sm font-medium marker:hidden">{faq.question}<span className="float-right text-olive transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{faq.answer}</p></details>)}</div></section>;
    case "offer_banners": return data.offerBanners.length ? <section key={section.id} className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-16"><Heading title={section.title} description={text("description")} /><OfferBannerCarousel banners={data.offerBanners} /></section> : null;
    case "brand_logo_marquee": return data.brands.length ? <section key={section.id} className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-16"><Heading title={section.title} description={text("description")} /><BrandLogoMarquee brands={data.brands} /></section> : null;
    case "newsletter": return <section key={section.id} className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24"><div className="storefront-newsletter grid gap-8 px-6 py-9 sm:grid-cols-[1fr_auto] sm:items-center sm:px-10 lg:px-14 lg:py-12"><div><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/70">A note from ZELNO</span><h2 className="mt-3 font-display text-3xl sm:text-4xl">{section.title}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-white/75">{text("description")}</p>{settings.whatsapp_number && <a className="mt-5 inline-flex items-center gap-2 text-xs underline underline-offset-4" href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{text("whatsapp_cta", "Chat with us")}<ArrowRight size={14} /></a>}</div><NewsletterSignup /></div></section>;
    default: return null;
  }
}

export function HomeSections({ data, settings }: { data: HomeData; settings: StoreSettings }) {
  const sections = [...data.sections].filter((section) => section.is_visible && section.section_key !== "announcement_bar").sort((a, b) => a.sort_order - b.sort_order);
  let firstRenderedSection = true;

  return <>{sections.map((section) => {
    const renderedSection = EditorialSection({ section, data, settings });
    if (!renderedSection) return null;
    const isFirstRenderedSection = firstRenderedSection;
    firstRenderedSection = false;
    return isFirstRenderedSection ? (
      <div
        key={section.id}
        className={`homepage-first-section ${section.section_key === "hero" ? "homepage-first-section--hero" : ""}`}
      >
        {renderedSection}
      </div>
    ) : renderedSection;
  })}</>;
}
