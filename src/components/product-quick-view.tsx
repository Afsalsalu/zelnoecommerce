"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import type { Product, ProductImage, ProductVariant } from "@/lib/types";
import { formatPrice } from "@/lib/format";

function sortedImages(product: Product): ProductImage[] {
  return [...(product.product_images ?? [])].filter((image) => Boolean(image.url)).sort((a, b) => a.sort_order - b.sort_order);
}

function variantLabel(variant: ProductVariant) {
  const options = Object.values(variant.option_values ?? {});
  return options.length ? `${variant.name} / ${options.join(" / ")}` : variant.name;
}

export function ProductQuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const { add } = useCart();
  const dialogRef = useRef<HTMLDivElement>(null);
  const images = useMemo(() => sortedImages(product), [product]);
  const variants = product.product_variants ?? [];
  const initialVariant = variants.find((variant) => variant.is_default) ?? variants[0];
  const [variantId, setVariantId] = useState(initialVariant?.id ?? "");
  const variant = variants.find((item) => item.id === variantId) ?? initialVariant;
  const price = Number(variant?.price ?? product.price);
  const compare = variant?.compare_at_price ?? product.compare_at_price;
  const stock = Number(variant?.stock_quantity ?? product.stock_quantity);
  const canBuy = variant ? (stock > 0 || variant.stock_status === "continue_selling" || product.continue_selling) : (stock > 0 || product.continue_selling);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const selector = "button:not([disabled]), a[href], select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";
    const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(selector)) : [];
    focusable[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [onClose]);

  function addToBag() {
    if (!canBuy) return;
    add({ productId: product.id, variantId: variant?.id ?? null, slug: product.slug, title: product.title, variantName: variant?.name ?? "Standard", unitPrice: price, imageUrl: images[0]?.url ?? null });
    toast.success(`${product.title} added to your bag`);
  }

  return <div className="fixed inset-0 z-[70] bg-ink/45 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`quick-view-title-${product.id}`} className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-ivory shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7"><span className="eyebrow">Quick view</span><button type="button" aria-label="Close quick view" onClick={onClose} className="grid size-10 place-items-center text-muted hover:text-ink"><X size={19} /></button></div>
      <div className="grid gap-6 p-5 sm:grid-cols-[minmax(180px,.8fr)_1fr] sm:gap-7 sm:p-7">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#efede6]">{images[0] ? <Image src={images[0].url} alt={images[0].alt_text || product.title} fill sizes="(max-width: 640px) 100vw, 240px" className="object-contain p-6" /> : <div className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[.15em] text-muted">Image coming soon</div>}</div>
        <div className="flex min-w-0 flex-col"><p className="eyebrow">{product.category?.name || "ZELNO collection"}</p><h2 id={`quick-view-title-${product.id}`} className="mt-2 font-display text-3xl leading-tight">{product.title}</h2><div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{formatPrice(price)}</span>{compare && compare > price && <span className="text-muted line-through">{formatPrice(Number(compare))}</span>}</div>{product.short_description && <p className="mt-4 text-sm leading-6 text-muted">{product.short_description}</p>}{variants.length > 1 && <label className="mt-6 block"><span className="field-label">Choose an option</span><select className="field-control" value={variantId} onChange={(event) => setVariantId(event.target.value)}>{variants.map((item) => <option key={item.id} value={item.id}>{variantLabel(item)}{item.stock_quantity <= 0 && item.stock_status !== "continue_selling" ? " - sold out" : ""}</option>)}</select></label>}<button type="button" disabled={!canBuy} onClick={addToBag} className="button-primary mt-6 w-full">{canBuy ? "Add to bag" : "Sold out"}</button><Link href={`/shop/${product.slug}`} onClick={onClose} className="button-secondary mt-3 w-full">View full details</Link></div>
      </div>
    </div>
  </div>;
}
