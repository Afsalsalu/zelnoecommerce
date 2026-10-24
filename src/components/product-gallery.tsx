"use client";
import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ProductImage } from "@/lib/types";

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const selected = sorted[active];
  function move(step: number) { setActive((value) => (value + step + sorted.length) % sorted.length); }
  return <div className="grid gap-3 sm:grid-cols-[76px_1fr]">
    {sorted.length > 1 && <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">{sorted.map((image, index) => <button key={image.id} onClick={() => setActive(index)} aria-label={`View image ${index + 1}`} aria-current={active === index} className={`relative aspect-square w-16 shrink-0 overflow-hidden bg-sand sm:w-full ${active === index ? "ring-1 ring-olive" : "opacity-70 hover:opacity-100"}`}><Image src={image.url} alt={image.alt_text || title} fill sizes="80px" className="object-cover" /></button>)}</div>}
    <div className="relative order-1 aspect-[4/5] overflow-hidden bg-sand sm:order-2">
      {selected ? <button onClick={() => setZoom(true)} aria-label="Open product image zoom" className="absolute inset-0 cursor-zoom-in"><Image src={selected.url} alt={selected.alt_text || title} fill priority sizes="(max-width: 640px) 100vw, 55vw" className="object-cover" /></button> : <div className="absolute inset-0 grid place-items-center text-xs uppercase tracking-[.15em] text-muted">Image coming soon</div>}
      {sorted.length > 1 && <div className="absolute bottom-4 right-4 flex gap-2"><button aria-label="Previous image" onClick={() => move(-1)} className="grid size-10 place-items-center bg-paper/90"><ChevronLeft size={18} /></button><button aria-label="Next image" onClick={() => move(1)} className="grid size-10 place-items-center bg-paper/90"><ChevronRight size={18} /></button></div>}
    </div>
    {zoom && selected && <div role="dialog" aria-modal="true" aria-label={`${title} image zoom`} className="storefront-image-overlay fixed inset-0 z-[80] grid place-items-center p-4" onClick={() => setZoom(false)} onKeyDown={(event) => { if (event.key === "Escape") setZoom(false); }}>
      <button autoFocus aria-label="Close image zoom" className="absolute right-5 top-5 grid size-12 place-items-center text-white" onClick={() => setZoom(false)}><X /></button>
      <button aria-label="Previous image" className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center text-white sm:left-8" onClick={(event) => { event.stopPropagation(); move(-1); }}><ChevronLeft /></button>
      <div className="relative h-[82vh] w-[88vw] max-w-5xl" onClick={(event) => event.stopPropagation()}><Image src={selected.url} alt={selected.alt_text || title} fill sizes="90vw" className="object-contain" /></div>
      <button aria-label="Next image" className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center text-white sm:right-8" onClick={(event) => { event.stopPropagation(); move(1); }}><ChevronRight /></button>
    </div>}
  </div>;
}
