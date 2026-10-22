"use client";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product-card";
export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    try {
      const key = "zelno-recent-v1";
      const previous = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      const slugs = [currentSlug, ...previous.filter((slug) => slug !== currentSlug)].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(slugs));
      const viewed = slugs.slice(1, 5);
      if (!viewed.length) return;
      fetch(`/api/products/recent?slugs=${encodeURIComponent(viewed.join(","))}`).then((response) => response.json()).then((body: { products?: Product[] }) => setProducts(body.products ?? [])).catch(() => undefined);
    } catch { /* Storage may be disabled; product browsing remains available. */ }
  }, [currentSlug]);
  if (!products.length) return null;
  return <section className="mx-auto mt-20 max-w-[1440px]"><div className="mb-8"><span className="eyebrow">For another time</span><h2 className="mt-3 font-display text-4xl">Recently viewed</h2></div><div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:gap-x-6">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
