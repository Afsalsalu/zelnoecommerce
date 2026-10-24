"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";

export function CategoryCarousel({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollLeft(track.scrollLeft > 1);
    setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateScrollState();
    track.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollState);
    observer?.observe(track);
    return () => {
      track.removeEventListener("scroll", updateScrollState);
      observer?.disconnect();
    };
  }, [updateScrollState]);

  function scrollByCards(direction: -1 | 1) {
    const track = trackRef.current;
    const firstCard = track?.querySelector<HTMLElement>("[data-category-card]");
    if (!track || !firstCard) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 8;
    const cardStep = firstCard.offsetWidth + gap;
    const visibleCards = Math.max(1, Math.floor(track.clientWidth / cardStep));
    const amount = cardStep * Math.max(1, visibleCards - 1);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    track.scrollBy({ left: direction * amount, behavior });
  }

  return <div className="relative">
    <button type="button" aria-label="Scroll categories left" disabled={!canScrollLeft} onClick={() => scrollByCards(-1)} className="absolute -left-5 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-ivory text-ink shadow-sm transition hover:border-olive disabled:cursor-not-allowed disabled:opacity-30 md:grid"><ChevronLeft size={17} /></button>
    <div id="homepage-categories" ref={trackRef} tabIndex={0} role="region" aria-label="Shop by category" className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-5">
      {categories.map((category) => <Link key={category.id} data-category-card href={`/collections/${category.slug}`} className="group w-[80px] shrink-0 snap-start text-center md:w-[180px]">
        <div className="relative h-[80px] overflow-hidden bg-sand md:h-[150px]">{category.image_url && <Image src={category.image_url} alt={category.name} fill sizes="(max-width: 767px) 80px, 180px" className="object-contain p-2.5 transition-transform duration-500 group-hover:scale-[1.03] md:p-6" />}</div>
        <span className="mt-2 block line-clamp-2 text-[11px] leading-4 text-ink transition-colors group-hover:text-olive md:text-sm">{category.name}</span>
      </Link>)}
    </div>
    <button type="button" aria-label="Scroll categories right" disabled={!canScrollRight} onClick={() => scrollByCards(1)} className="absolute -right-5 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-ivory text-ink shadow-sm transition hover:border-olive disabled:cursor-not-allowed disabled:opacity-30 md:grid"><ChevronRight size={17} /></button>
  </div>;
}
