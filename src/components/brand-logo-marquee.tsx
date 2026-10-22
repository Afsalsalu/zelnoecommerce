import Image from "next/image";
import Link from "next/link";
import type { HomepageBrand } from "@/lib/types";

function BrandLogo({ brand, duplicate = false }: { brand: HomepageBrand; duplicate?: boolean }) {
  const image = <span className="relative block h-14 w-32 shrink-0 sm:h-16 sm:w-36">
    <Image src={brand.logo_url} alt={brand.alt_text || brand.name} fill sizes="144px" className="object-contain p-3 sm:p-4" />
  </span>;
  const destination = brand.destination_url?.trim();
  if (!destination) return <span className="brand-logo-slot" aria-label={brand.name}>{image}</span>;
  const external = /^https:\/\//i.test(destination);
  return <Link href={destination} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} tabIndex={duplicate ? -1 : 0} aria-label={`Visit ${brand.name}`} className="brand-logo-slot transition-opacity hover:opacity-70 focus-visible:opacity-70">
    {image}
  </Link>;
}

export function BrandLogoMarquee({ brands }: { brands: HomepageBrand[] }) {
  if (!brands.length) return null;

  const staticList = <div className={`brand-marquee-static-list ${brands.length === 1 ? "brand-marquee-single-list" : ""}`}>
    {brands.map((brand) => <BrandLogo key={brand.id} brand={brand} />)}
  </div>;

  return <div className="brand-marquee group" role="region" aria-label="Featured brands">
    <div className="brand-marquee-viewport">
      {brands.length > 1 && <div className="brand-marquee-track">
        <div className="brand-marquee-group">
          {brands.map((brand) => <BrandLogo key={brand.id} brand={brand} />)}
        </div>
        <div className="brand-marquee-group" aria-hidden="true">
          {brands.map((brand) => <BrandLogo key={brand.id} brand={brand} duplicate />)}
        </div>
      </div>}
      {staticList}
    </div>
  </div>;
}
