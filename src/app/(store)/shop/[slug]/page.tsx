import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, ChevronRight, Star } from "lucide-react";
import { ProductActions } from "@/components/product-actions";
import { ProductContent } from "@/components/product-content";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewed } from "@/components/recently-viewed";
import { getProductBySlug, getCatalog, getStoreSettings } from "@/lib/store";
import { formatPrice } from "@/lib/format";

type Params = Promise<{ slug: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params; const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  const title = product.seo_title || product.title;
  const description = product.seo_description || product.short_description || product.description;
  return { title, description, alternates: process.env.NEXT_PUBLIC_SITE_URL ? { canonical: `/shop/${product.slug}` } : undefined, openGraph: { type: "website", title, description, images: product.seo_image_url || product.product_images?.[0]?.url ? [product.seo_image_url || product.product_images?.[0]?.url as string] : undefined } };
}
function ProductVideo({ url, title }: { url: string; title: string }) {
  try { const parsed = new URL(url); if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(parsed.hostname)) { const id = parsed.searchParams.get("v"); if (id) return <div className="aspect-video overflow-hidden bg-ink"><iframe className="size-full" title={title} src={`https://www.youtube-nocookie.com/embed/${id}`} allowFullScreen loading="lazy" /></div>; } if (parsed.hostname === "youtu.be") return <div className="aspect-video overflow-hidden bg-ink"><iframe className="size-full" title={title} src={`https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`} allowFullScreen loading="lazy" /></div>; if (parsed.protocol === "https:" && /\.(mp4|webm)(\?|$)/i.test(parsed.pathname)) return <video controls preload="none" className="aspect-video w-full bg-ink" src={url} aria-label={title} />; } catch { return null; }
  return null;
}
export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getStoreSettings()]);
  if (!product) notFound();
  const images = product.product_images ?? [];
  const defaultVariant = product.product_variants?.find((item) => item.is_default) ?? product.product_variants?.[0];
  const price = Number(defaultVariant?.price ?? product.price);
  const compare = defaultVariant?.compare_at_price ?? product.compare_at_price;
  const reviews = product.reviews ?? [];
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const recommendations = product.related_product_ids?.length ? await (async () => {
    const { products } = await getCatalog({ pageSize: 48 }); return products.filter((item) => product.related_product_ids.includes(item.id)).slice(0, 4);
  })() : (await getCatalog({ category: product.category?.slug, pageSize: 12 })).products.filter((item) => item.id !== product.id).slice(0, 4);
  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-7 sm:px-8 lg:px-12">
    <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[.12em] text-muted"><Link href="/shop" className="hover:text-ink">Shop</Link><ChevronRight size={12} /><Link href={product.category ? `/collections/${product.category.slug}` : "/shop"} className="hover:text-ink">{product.category?.name || "Collection"}</Link><ChevronRight size={12} /><span className="text-ink">{product.title}</span></nav>
    <section className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
      <ProductGallery images={images} title={product.title} />
      <div className="lg:sticky lg:top-28 lg:self-start lg:py-4"><span className="eyebrow">{product.category?.name || "ZELNO collection"}</span><h1 className="mt-3 font-display text-4xl leading-[1.02] sm:text-5xl">{product.title}</h1><p className="mt-4 max-w-xl text-sm leading-7 text-muted">{product.short_description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3"><span className="text-lg font-medium">{formatPrice(price, settings.currency || "INR")}</span>{compare && compare > price && <><span className="text-sm text-muted line-through">{formatPrice(Number(compare), settings.currency || "INR")}</span><span className="bg-[#e9e8de] px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-olive">Save {Math.round((1 - price / compare) * 100)}%</span></>}</div>
        {reviews.length > 0 && <div className="mt-3 flex items-center gap-2 text-xs"><span aria-label={`${average.toFixed(1)} out of 5`} className="inline-flex text-olive">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill={i < Math.round(average) ? "currentColor" : "none"} />)}</span><a href="#reviews" className="text-muted underline underline-offset-2">{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</a></div>}
        <ProductActions product={product} variants={product.product_variants ?? []} whatsappEnabled={Boolean(settings.whatsapp_enabled)} whatsappProductEnabled={Boolean(settings.whatsapp_product_enabled)} whatsappButtonLabel={settings.whatsapp_product_button_label} actionButtonStyles={settings.product_action_button_styles} />
        <div className="mt-6 grid gap-3 border-b border-line pb-6 text-xs text-muted sm:grid-cols-2"><p className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-olive" />{settings.cod_enabled ? "Cash on delivery available on eligible orders" : "Online payment at checkout"}</p><p className="flex items-start gap-2"><Check size={14} className="mt-0.5 text-olive" />{settings.delivery_estimate || "Delivery estimate shown at checkout"}</p><p className="flex items-start gap-2 sm:col-span-2"><Check size={14} className="mt-0.5 text-olive" />Thoughtfully packed. <Link className="underline underline-offset-2" href="/return-refund-policy">Read our return policy</Link></p></div>
        <div className="mt-6"><h2 className="eyebrow">A little more about it</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted">{product.description}</p></div>
        {product.video_url && <div className="mt-8"><ProductVideo url={product.video_url} title={`${product.title} product video`} /></div>}
      </div>
    </section>
    <section className="mt-16 sm:mt-24"><ProductContent blocks={product.product_content_blocks ?? []} /></section>
    <section id="reviews" className="mx-auto mt-16 max-w-5xl scroll-mt-28 sm:mt-24"><div className="mb-7 border-b border-line pb-5"><span className="eyebrow">Customer notes</span><h2 className="mt-2 font-display text-4xl">Reviews {reviews.length ? `(${reviews.length})` : ""}</h2>{reviews.length > 0 && <p className="mt-2 text-sm text-muted">Rated {average.toFixed(1)} out of 5</p>}</div>{reviews.length ? <div className="divide-y divide-line">{reviews.map((review) => <article key={review.id} className="py-5"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{review.customer_name}</span><time className="text-xs text-muted" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}</time></div><div className="mt-2 flex text-olive">{Array.from({ length: review.rating }, (_, i) => <Star size={13} key={i} fill="currentColor" />)}</div><p className="mt-3 text-sm leading-7 text-muted">{review.body}</p></article>)}</div> : <p className="py-8 text-sm text-muted">No reviews have been approved for this piece yet.</p>}</section>
    {recommendations.length > 0 && <section className="mx-auto mt-20 max-w-[1440px]"><div className="mb-8"><span className="eyebrow">Consider these, too</span><h2 className="mt-3 font-display text-4xl">You may also like</h2></div><div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:gap-x-6">{recommendations.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
    <RecentlyViewed currentSlug={product.slug} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: product.title, description: product.short_description, sku: defaultVariant?.sku || product.sku, image: images.map((item) => item.url), offers: { "@type": "Offer", priceCurrency: settings.currency || "INR", price: (price / 100).toFixed(2), availability: (defaultVariant?.stock_quantity ?? product.stock_quantity) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/shop/${product.slug}` : undefined }, ...(reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: reviews.length } } : {}) }).replace(/</g, "\\u003c") }} />
  </div>;
}
