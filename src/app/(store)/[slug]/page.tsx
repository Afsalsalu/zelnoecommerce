import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSitePage } from "@/lib/store";
type Params = Promise<{ slug: string }>;
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params; const page = await getSitePage(slug);
  if (!page) return { title: "Page not found", robots: { index: false, follow: false } };
  return { title: page.seo_title || page.title, description: page.seo_description || page.body.slice(0, 155), alternates: process.env.NEXT_PUBLIC_SITE_URL ? { canonical: `/${page.slug}` } : undefined, openGraph: { type: "article", title: page.seo_title || page.title, description: page.seo_description || page.body.slice(0, 155) } };
}
export default async function EditablePage({ params }: { params: Params }) {
  const { slug } = await params; const page = await getSitePage(slug); if (!page) notFound();
  return <article className="mx-auto max-w-4xl px-5 py-16 sm:px-8 lg:py-24"><span className="eyebrow">ZELNO Kitchen</span><h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">{page.title}</h1><div className="mt-8 border-t border-line pt-8 text-sm leading-8 text-muted"><p className="whitespace-pre-line">{page.body}</p></div></article>;
}
