import Image from "next/image";
import Link from "next/link";
import { getCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CollectionsPage() {
  const { categories } = await getCatalog({ pageSize: 1 });
  return <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><header className="mb-10 border-b border-line pb-8"><span className="eyebrow">The ZELNO edit</span><h1 className="mt-3 font-display text-5xl sm:text-6xl">Categories</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Explore the considered edit by category.</p></header>{categories.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">{categories.map((category) => <Link key={category.id} href={`/collections/${category.slug}`} className="group"><div className="relative aspect-square overflow-hidden bg-[#efede5]">{category.image_url && <Image src={category.image_url} alt={category.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.03]" />}</div><h2 className="mt-3 text-sm font-medium transition-colors group-hover:text-olive">{category.name}</h2></Link>)}</div> : <p className="border-y border-line py-10 text-sm text-muted">Categories will appear here when they are added to the store.</p>}</section>;
}
