"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { HomepageBanner } from "@/lib/types";

export function OfferBannerCarousel({ banners }: { banners: HomepageBanner[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => { setActive((current) => Math.min(current, Math.max(0, banners.length - 1))); }, [banners.length]);
  if (!banners.length) return null;

  function move(step: number) {
    setActive((current) => (current + step + banners.length) % banners.length);
  }

  return <div className="relative" role="region" aria-roledescription="carousel" aria-label="Offer banners">
    <div className="relative min-h-[520px] overflow-hidden rounded-2xl">
      {banners.map((banner, index) => {
        const imageOnRight = banner.alignment === "right";
        const visible = index === active;
        return <article key={banner.id} aria-hidden={!visible} aria-roledescription="slide" aria-label={`Offer ${index + 1} of ${banners.length}`} className={`grid min-h-[520px] grid-rows-[minmax(220px,1fr)_minmax(260px,1fr)] bg-paper transition-opacity duration-500 motion-reduce:transition-none lg:grid-cols-2 lg:grid-rows-1 ${visible ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"}`}>
          <div className={`relative min-h-[220px] overflow-hidden bg-sand lg:min-h-[520px] ${imageOnRight ? "lg:order-2" : "lg:order-1"}`}>
            {banner.mobile_image_url && <Image src={banner.mobile_image_url} alt={banner.image_alt || banner.heading} fill sizes="(max-width: 1023px) 100vw, 50vw" className="object-contain p-4 md:hidden" />}
            {banner.desktop_image_url && <Image src={banner.desktop_image_url} alt={banner.image_alt || banner.heading} fill sizes="(max-width: 1023px) 100vw, 50vw" className={`${banner.mobile_image_url ? "hidden md:block" : "block"} object-contain p-5 sm:p-8`} />}
          </div>
          <div className={`flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16 ${imageOnRight ? "lg:order-1" : "lg:order-2"}`}>
            {banner.offer_badge && <span className="eyebrow text-olive">{banner.offer_badge}</span>}
            <h2 className="mt-3 max-w-xl font-display text-4xl leading-[1.02] sm:text-5xl lg:text-6xl">{banner.heading}</h2>
            {banner.description && <p className="mt-4 max-w-lg text-sm leading-7 text-muted sm:text-base">{banner.description}</p>}
            <Link href={banner.cta_href} tabIndex={visible ? 0 : -1} className="button-primary mt-7 self-start">{banner.cta_label || "Explore the offer"}<ArrowRight size={15} /></Link>
          </div>
        </article>;
      })}
    </div>
    {banners.length > 1 && <div className="absolute bottom-5 right-5 z-10 flex items-center gap-2 sm:bottom-7 sm:right-7"><button type="button" aria-label="Previous offer banner" onClick={() => move(-1)} className="grid size-10 place-items-center rounded-full border border-line bg-ivory/95 text-ink shadow-sm hover:bg-white"><ArrowLeft size={16} /></button><div className="flex items-center gap-1.5" aria-label="Choose offer banner">{banners.map((banner, index) => <button key={banner.id} type="button" aria-label={`Show offer ${index + 1}`} aria-current={index === active} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-ink" : "w-1.5 bg-ink/35"}`} />)}</div><button type="button" aria-label="Next offer banner" onClick={() => move(1)} className="grid size-10 place-items-center rounded-full border border-line bg-ivory/95 text-ink shadow-sm hover:bg-white"><ArrowRight size={16} /></button></div>}
  </div>;
}
