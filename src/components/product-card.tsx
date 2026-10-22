"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Eye, Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { ProductQuickView } from "@/components/product-quick-view";
import { useCart } from "@/components/cart-provider";
import type { Product, ProductImage } from "@/lib/types";
import { discountPercent, formatPrice } from "@/lib/format";

const WISHLIST_KEY = "zelno-wishlist-v1";

function sortedImages(product: Product): ProductImage[] {
  return [...(product.product_images ?? [])].filter((image) => Boolean(image.url)).sort((a, b) => a.sort_order - b.sort_order);
}

function readWishlist(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function ProductCard({ product, quickAdd = true }: { product: Product; quickAdd?: boolean }) {
  const { add } = useCart();
  const images = sortedImages(product);
  const image = images[0];
  const hoverImage = images[1];
  const variant = product.product_variants?.find((item) => item.is_default) ?? product.product_variants?.[0];
  const price = Number(variant?.price ?? product.price);
  const compare = variant?.compare_at_price ?? product.compare_at_price;
  const discount = discountPercent(price, compare);
  const canBuy = variant ? (variant.stock_quantity > 0 || variant.stock_status === "continue_selling" || product.continue_selling) : (product.stock_quantity > 0 || product.continue_selling);
  const [wishlisted, setWishlisted] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  useEffect(() => { setWishlisted(readWishlist().includes(product.id)); }, [product.id]);

  function quickAddProduct() {
    if (!canBuy) return;
    add({ productId: product.id, variantId: variant?.id ?? null, slug: product.slug, title: product.title, variantName: variant?.name ?? "Standard", unitPrice: price, imageUrl: image?.url ?? null });
    toast.success("Added to your bag");
  }

  function toggleWishlist() {
    const current = readWishlist();
    const next = current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id];
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(next)); } catch { /* Keep the active state local when storage is unavailable. */ }
    setWishlisted(next.includes(product.id));
    toast.success(next.includes(product.id) ? "Added to your wishlist" : "Removed from your wishlist");
  }

  return <>
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#efede6]">
        <Link href={`/shop/${product.slug}`} aria-label={`View ${product.title}`} className="absolute inset-0 z-0">
          {image?.url ? <>
            <Image src={image.url} alt={image.alt_text || product.title} fill sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw" className="object-cover transition-opacity duration-500 ease-out group-hover:opacity-0 group-focus-within:opacity-0" />
            {hoverImage?.url && <Image src={hoverImage.url} alt="" fill sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw" className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-within:opacity-100" />}
          </> : <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[.15em] text-muted">Image coming soon</div>}
        </Link>
        {(product.badge || discount) && <span className="absolute left-3 top-3 z-10 bg-paper/95 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.12em]">{product.badge || `${discount}% off`}</span>}
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 translate-y-0 items-center gap-2 transition-transform duration-300 md:translate-y-[calc(100%+0.75rem)] md:group-focus-within:translate-y-0 md:group-hover:translate-y-0">
          <button type="button" title={wishlisted ? "Remove from wishlist" : "Add to wishlist"} aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`} aria-pressed={wishlisted} onClick={toggleWishlist} className="grid size-10 place-items-center rounded-full border border-black/10 bg-white/95 text-ink shadow-sm transition-colors hover:bg-olive hover:text-white"><Heart size={16} strokeWidth={1.5} fill={wishlisted ? "currentColor" : "none"} /></button>
          {quickAdd && <button type="button" title={canBuy ? "Add to cart" : "Sold out"} aria-label={canBuy ? `Add ${product.title} to cart` : `${product.title} is sold out`} onClick={quickAddProduct} disabled={!canBuy} className="grid size-10 place-items-center rounded-full border border-black/10 bg-white/95 text-ink shadow-sm transition-colors hover:bg-olive hover:text-white disabled:cursor-not-allowed disabled:opacity-35"><ShoppingBag size={16} strokeWidth={1.5} /></button>}
          <button type="button" title="Quick view" aria-label={`Quick view ${product.title}`} onClick={() => setQuickViewOpen(true)} className="grid size-10 place-items-center rounded-full border border-black/10 bg-white/95 text-ink shadow-sm transition-colors hover:bg-olive hover:text-white"><Eye size={16} strokeWidth={1.5} /></button>
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 pt-3.5">
        <div className="min-w-0">
          {product.category?.name && <p className="mb-1 text-[9px] uppercase tracking-[.16em] text-muted">{product.category.name}</p>}
          <Link href={`/shop/${product.slug}`} className="line-clamp-1 text-sm font-medium tracking-[-.015em] hover:text-olive">{product.title}</Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"><span className="font-medium">{formatPrice(price)}</span>{compare && compare > price && <><span className="text-muted line-through">{formatPrice(Number(compare))}</span><span className="text-olive">{discount}% off</span></>}</div>
        </div>
        <Link href={`/shop/${product.slug}`} aria-label={`Details for ${product.title}`} className="mt-3 text-muted transition-colors hover:text-olive"><ArrowUpRight size={15} strokeWidth={1.5} /></Link>
      </div>
    </article>
    {quickViewOpen && <ProductQuickView product={product} onClose={() => setQuickViewOpen(false)} />}
  </>;
}
