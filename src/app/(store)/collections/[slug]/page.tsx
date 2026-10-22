import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { getCatalog, getCategoryBySlug } from "@/lib/store";
import type { Metadata } from "next";

type Params = Promise<{ slug: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params; const category = await getCategoryBySlug(slug);
  return category ? { title: category.name, description: category.description || `Explore the ${category.name} collection at ZELNO.` } : { title: "Collection" };
}
export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params; const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  const result = await getCatalog({ category: slug, pageSize: 24 });
  return <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 sm:px-8 lg:px-12 lg:pt-16">
    <header className="relative mb-12 grid min-h-[280px] items-end overflow-hidden bg-[#e9e6dc] px-6 py-8 sm:min-h-[380px] sm:px-12 sm:py-12">{category.image_url && <Image src={category.image_url} alt={category.name} fill priority sizes="100vw" className="object-cover" />}<div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-ink/20 to-transparent" /><div className="relative max-w-xl text-white"><span className="text-[10px] font-semibold uppercase tracking-[.22em]">Collection</span><h1 className="mt-3 font-display text-5xl sm:text-6xl">{category.name}</h1><p className="mt-3 max-w-lg text-sm leading-6 text-white/85">{category.description}</p></div></header>
    {result.products.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{result.products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="border-y border-line py-16 text-center"><span className="eyebrow">A considered start</span><h2 className="mt-3 font-display text-3xl">More pieces are on the way</h2><p className="mt-3 text-sm text-muted">There are no published products in this collection yet.</p></div>}
  </div>;
}
