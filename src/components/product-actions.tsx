"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import type { Product, ProductVariant } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function ProductActions({ product, variants }: { product: Product; variants: ProductVariant[] }) {
  const router = useRouter();
  const { add } = useCart();
  const initial = variants.find((variant) => variant.is_default) ?? variants[0];
  const [variantId, setVariantId] = useState(initial?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const variant = useMemo(() => variants.find((item) => item.id === variantId) ?? initial, [variants, variantId, initial]);
  const price = Number(variant?.price ?? product.price);
  const compare = variant?.compare_at_price ?? product.compare_at_price;
  const stock = Number(variant?.stock_quantity ?? product.stock_quantity);
  const canBuy = Boolean(variant) && (stock > 0 || variant?.stock_status === "continue_selling" || product.continue_selling);
  function addToBag(buyNow = false) {
    if (!variant || !canBuy) return;
    add({ productId: product.id, variantId: variant.id, slug: product.slug, title: product.title, variantName: variant.name, unitPrice: price, imageUrl: product.product_images?.[0]?.url ?? null, quantity });
    toast.success(`${product.title} added to your bag`);
    if (buyNow) router.push("/checkout");
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: product.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Product link copied"); }
    } catch { /* User dismissed the native share sheet. */ }
  }
  return <div className="mt-7 space-y-5">
    {variants.length > 1 && <label className="block"><span className="field-label">Choose an option</span><select className="field-control" value={variantId} onChange={(event) => setVariantId(event.target.value)}>{variants.map((item) => <option key={item.id} value={item.id}>{item.name}{Object.values(item.option_values ?? {}).length ? ` — ${Object.values(item.option_values).join(" · ")}` : ""}{item.stock_quantity <= 0 && item.stock_status !== "continue_selling" ? " — sold out" : ""}</option>)}</select></label>}
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex min-h-12 items-center border border-line bg-paper"><button aria-label="Decrease quantity" className="grid size-11 place-items-center text-lg" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><span aria-live="polite" className="min-w-8 text-center text-sm">{quantity}</span><button aria-label="Increase quantity" className="grid size-11 place-items-center text-lg" onClick={() => setQuantity((value) => Math.min(99, value + 1))}>+</button></div>
      <button disabled={!canBuy} onClick={() => addToBag()} className="button-primary flex-1">{canBuy ? "Add to bag" : "Sold out"}</button>
    </div>
    <button disabled={!canBuy} onClick={() => addToBag(true)} className="button-secondary w-full">Buy now · {formatPrice(price * quantity)}</button>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-4 text-xs text-muted"><span>{canBuy ? "In stock · ready to ship" : "Currently unavailable"}</span><button onClick={share} className="inline-flex items-center gap-2 text-ink hover:text-olive"><Share2 size={15} /> Share</button></div>
    {compare && compare > price && <p className="text-xs text-olive">You save {formatPrice((compare - price) * quantity)} on this order.</p>}
  </div>;
}
