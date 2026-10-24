"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { HomepageBanner } from "@/lib/types";
import { HERO_AUTOPLAY_MS, heroHasControls, nextHeroIndex, shouldAutoplayHero, swipeStep } from "@/lib/hero-carousel";
import { heroOverlayStyle } from "@/lib/hero-overlay";

export function HeroBannerCarousel({ banners, storeName }: { banners: HomepageBanner[]; storeName?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const hasControls = heroHasControls(banners.length);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, banners.length - 1)));
  }, [banners.length]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const paused = hovered || focused || dragging;
  useEffect(() => {
    if (!shouldAutoplayHero(banners.length, reducedMotion, paused)) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => nextHeroIndex(current, banners.length, 1));
    }, HERO_AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [banners.length, paused, reducedMotion]);

  if (!banners.length) return null;

  function move(step: -1 | 1) {
    setActiveIndex((current) => nextHeroIndex(current, banners.length, step));
  }

  function finishPointer(clientX: number, pointerId?: number, currentTarget?: HTMLElement) {
    const start = pointerStart.current;
    pointerStart.current = null;
    setDragging(false);
    const step = start === null ? 0 : swipeStep(clientX - start);
    if (step) move(step);
    if (pointerId !== undefined && currentTarget?.hasPointerCapture(pointerId)) currentTarget.releasePointerCapture(pointerId);
  }

  return <section
    className="relative h-[clamp(300px,82vw,360px)] overflow-hidden bg-sand sm:h-[clamp(400px,46vw,460px)] lg:h-[clamp(480px,36vw,560px)]"
    role="region"
    aria-roledescription="carousel"
    aria-label="Homepage hero banners"
    tabIndex={hasControls ? 0 : undefined}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    }}
    onPointerDown={(event) => {
      if (!hasControls || (event.target instanceof Element && event.target.closest("a, button, input, select, textarea"))) return;
      pointerStart.current = event.clientX;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerUp={(event) => finishPointer(event.clientX, event.pointerId, event.currentTarget)}
    onPointerCancel={(event) => finishPointer(event.clientX, event.pointerId, event.currentTarget)}
  >
    <span className="sr-only" aria-live="polite">Banner {activeIndex + 1} of {banners.length}</span>
    <div className="relative h-full">
      {banners.map((banner, index) => {
        const visible = index === activeIndex;
        return <article
          key={banner.id}
          aria-hidden={!visible}
          aria-roledescription="slide"
          aria-label={`Banner ${index + 1} of ${banners.length}`}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${visible ? "z-[1] opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <div className="absolute inset-0 bg-sand">
            {banner.mobile_image_url && <Image src={banner.mobile_image_url} alt={banner.image_alt || banner.heading} fill priority={index === 0} sizes="100vw" className={`${banner.desktop_image_url ? "sm:hidden" : "block"} object-cover object-center`} />}
            {banner.desktop_image_url && <Image src={banner.desktop_image_url} alt={banner.image_alt || banner.heading} fill priority={index === 0 && !banner.mobile_image_url} sizes="100vw" className={`${banner.mobile_image_url ? "hidden sm:block" : "block"} object-cover object-center`} />}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]" style={heroOverlayStyle(banner)} />
          <div className="relative z-[2] mx-auto flex h-full max-w-[1440px] items-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div className="max-w-2xl">
              <span className="eyebrow">{storeName || "ZELNO Kitchen"}</span>
              <h1 className="mt-5 font-display text-6xl leading-[.94] tracking-[-.04em] sm:text-7xl lg:text-[92px]">{banner.heading}</h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-ink/75 sm:text-base">{banner.description}</p>
              <Link href={banner.cta_href} tabIndex={visible ? 0 : -1} className="button-primary mt-8">{banner.cta_label}<ArrowRight size={15} /></Link>
            </div>
          </div>
        </article>;
      })}
    </div>
    {hasControls && <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-ink/45 via-ink/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-4 z-30 flex items-center sm:left-7 lg:left-10">
        <button type="button" aria-label="Previous banner" onClick={() => move(-1)} className="pointer-events-auto grid size-10 place-items-center rounded-full border border-white/25 bg-ink/80 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive sm:size-11"><ArrowLeft size={17} aria-hidden="true" /></button>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-4 z-30 flex items-center sm:right-7 lg:right-10">
        <button type="button" aria-label="Next banner" onClick={() => move(1)} className="pointer-events-auto grid size-10 place-items-center rounded-full border border-white/25 bg-ink/80 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive sm:size-11"><ArrowRight size={17} aria-hidden="true" /></button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center sm:bottom-7">
        <div className="pointer-events-auto flex items-center gap-2" aria-label="Choose homepage banner">
          {banners.map((banner, index) => <button key={banner.id} type="button" aria-label={`Go to banner ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => setActiveIndex(index)} className={`h-1.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-olive motion-reduce:transition-none ${index === activeIndex ? "w-8 bg-white shadow-sm" : "w-1.5 bg-white/55 hover:bg-white/85"}`} />)}
        </div>
      </div>
    </>}
    <div className={`${hasControls ? "bottom-7 left-1/2 -translate-x-1/2" : "bottom-5 right-6"} absolute z-10 hidden text-[9px] font-semibold uppercase tracking-[.18em] text-ink/60 sm:block`}>Objects for everyday living</div>
  </section>;
}
