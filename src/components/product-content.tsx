import Image from "next/image";
import type { ContentBlock } from "@/lib/types";

function embedUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      const id = url.searchParams.get("v"); return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    return ["https:"].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}
export function ProductContent({ blocks }: { blocks: ContentBlock[] }) {
  const ordered = [...blocks].filter((block) => block.is_visible).sort((a, b) => a.sort_order - b.sort_order);
  if (!ordered.length) return null;
  return <div className="space-y-16 border-y border-line py-14 sm:space-y-24 sm:py-20">
    {ordered.map((block) => {
      const p = block.payload ?? {};
      const text = (key: string) => typeof p[key] === "string" ? p[key] as string : "";
      switch (block.block_type) {
        case "heading": return <section key={block.id} className="mx-auto max-w-3xl text-center"><span className="eyebrow">{block.title || "The details"}</span><h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">{text("text") || block.title}</h2></section>;
        case "rich_text": return <section key={block.id} className="mx-auto max-w-2xl"><h3 className="font-display text-3xl">{block.title}</h3><p className="mt-4 whitespace-pre-line text-sm leading-8 text-muted">{text("text")}</p></section>;
        case "full_width_image": return text("image_url") ? <figure key={block.id} className="relative mx-auto aspect-[16/8] w-full max-w-6xl overflow-hidden bg-sand"><Image src={text("image_url")} alt={text("image_alt") || block.title || "Product detail"} fill sizes="100vw" className="object-cover" /></figure> : null;
        case "two_image_gallery": return <div key={block.id} className="mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-2">{[text("image_one"), text("image_two")].filter(Boolean).map((src, i) => <div key={src} className="relative aspect-[4/3] overflow-hidden bg-sand"><Image src={src} alt={i === 0 ? text("alt_one") || block.title : text("alt_two") || block.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div>)}</div>;
        case "image_with_text": return <section key={block.id} className="mx-auto grid max-w-6xl items-center gap-8 sm:grid-cols-2 sm:gap-16">{text("image_url") && <div className="relative aspect-[4/3] overflow-hidden bg-sand"><Image src={text("image_url")} alt={text("image_alt") || block.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" /></div>}<div><span className="eyebrow">{block.title}</span><p className="mt-4 whitespace-pre-line text-sm leading-8 text-muted">{text("text")}</p></div></section>;
        case "video_embed": { const src = embedUrl(p.url); return src ? <section key={block.id} className="mx-auto w-full max-w-5xl"><h3 className="mb-5 font-display text-3xl">{block.title}</h3><div className="aspect-video overflow-hidden bg-ink"><iframe src={src} title={block.title || "Product video"} className="size-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div></section> : null; }
        case "feature_list": { const items = Array.isArray(p.items) ? p.items.filter((item): item is string => typeof item === "string") : []; return <section key={block.id} className="mx-auto max-w-5xl"><h3 className="mb-7 text-center font-display text-3xl">{block.title}</h3><ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <li key={item} className="flex gap-3 border-t border-line py-4 text-sm"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-olive" />{item}</li>)}</ul></section>; }
        case "specification_table":
        case "comparison": { const rows = Array.isArray(p.rows) ? p.rows.filter(Array.isArray) as unknown[][] : []; return <section key={block.id} className="mx-auto max-w-3xl"><h3 className="mb-5 font-display text-3xl">{block.title}</h3><dl className="divide-y divide-line border-y border-line">{rows.map((row, i) => <div key={i} className="grid grid-cols-[1fr_1.2fr] gap-4 py-4 text-sm"><dt className="text-muted">{String(row[0] ?? "")}</dt><dd className="text-right font-medium">{String(row[1] ?? "")}</dd></div>)}</dl></section>; }
        case "faq": { const items = Array.isArray(p.items) ? p.items as { question?: string; answer?: string }[] : []; return <section key={block.id} className="mx-auto max-w-3xl"><h3 className="mb-6 font-display text-3xl">{block.title}</h3><div className="divide-y divide-line">{items.map((item, i) => <details key={`${item.question}-${i}`} className="group py-4"><summary className="cursor-pointer list-none pr-8 text-sm font-medium marker:hidden focus-visible:outline-2 focus-visible:outline-olive">{item.question}<span className="float-right text-olive transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 text-sm leading-7 text-muted">{item.answer}</p></details>)}</div></section>; }
        case "divider": return <hr key={block.id} className="mx-auto w-full max-w-6xl border-0 border-t border-line" />;
        default: return null;
      }
    })}
  </div>;
}
