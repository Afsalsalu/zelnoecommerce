"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Share2, ShoppingBag, Zap } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import { useCustomerLoginRequirements } from "@/components/customer-login-requirements-provider";
import { customerLoginPath, writePendingCustomerAction } from "@/lib/customer-action";
import type { Product, ProductVariant } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { DEFAULT_WHATSAPP_PRODUCT_LABEL } from "@/lib/whatsapp";
import { actionButtonCssVariables, resolveActionButtonStyles, type ActionButtonStyles } from "@/lib/action-button-styles";

export function ProductActions({ product, variants, whatsappEnabled, whatsappProductEnabled, whatsappButtonLabel, actionButtonStyles }: { product: Product; variants: ProductVariant[]; whatsappEnabled?: boolean; whatsappProductEnabled?: boolean; whatsappButtonLabel?: string; actionButtonStyles?: ActionButtonStyles }) {
  const router = useRouter();
  const { add, authenticated, hydrated } = useCart();
  const customerLoginRequirements = useCustomerLoginRequirements();
  const initial = variants.find((variant) => variant.is_default);
  const [variantId, setVariantId] = useState(initial?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const variant = useMemo(() => variants.find((item) => item.id === variantId) ?? initial, [variants, variantId, initial]);
  const price = Number(variant?.price ?? product.price);
  const compare = variant?.compare_at_price ?? product.compare_at_price;
  const stock = Number(variant?.stock_quantity ?? product.stock_quantity);
  const selectedVariantId = variant?.id ?? null;
  const canBuy = Boolean(variants.length === 0 || variant) && (stock > 0 || variant?.stock_status === "continue_selling" || (!variant && product.continue_selling));
  const buttonStyles = resolveActionButtonStyles(actionButtonStyles);
  function currentPath() { return `${window.location.pathname}${window.location.search}`; }
  function item() { return { productId: product.id, variantId: selectedVariantId, slug: product.slug, title: product.title, variantName: variant?.name ?? "Standard", unitPrice: price, imageUrl: product.product_images?.[0]?.url ?? null, quantity }; }
  function addToBag(buyNow = false) {
    if (!canBuy || !hydrated) return;
    const line = item();
    const loginRequired = customerLoginRequirements.require_login_cart || (buyNow && (customerLoginRequirements.require_login_buy_now || customerLoginRequirements.require_login_checkout));
    if (!authenticated && loginRequired) {
      const returnTo = buyNow ? "/checkout?buyNow=1" : currentPath();
      writePendingCustomerAction({ type: "cart", line, returnTo });
      router.push(customerLoginPath(returnTo));
      return;
    }
    add(line);
    toast.success(`${product.title} added to your bag`);
    if (buyNow) router.push("/checkout?buyNow=1");
  }
  function buyViaWhatsApp() {
    if (!canBuy) return;
    const params = new URLSearchParams({ whatsapp: "buy-now", productId: product.id, quantity: String(quantity) });
    if (selectedVariantId) params.set("variantId", selectedVariantId);
    const returnTo = `/checkout?${params.toString()}`;
    if (!authenticated && (customerLoginRequirements.require_login_whatsapp || customerLoginRequirements.require_login_checkout)) { router.push(customerLoginPath(returnTo)); return; }
    router.push(returnTo);
  }
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: product.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Product link copied"); }
    } catch { /* User dismissed the native share sheet. */ }
  }
  return <div className="mt-7 space-y-5">
    {variants.length > 0 && <label className="block"><span className="field-label">Choose an option</span><select className="field-control" value={variantId} onChange={(event) => setVariantId(event.target.value)}><option value="">Select an option</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.name}{Object.values(item.option_values ?? {}).length ? ` — ${Object.values(item.option_values).join(" · ")}` : ""}{item.stock_quantity <= 0 && item.stock_status !== "continue_selling" ? " — sold out" : ""}</option>)}</select></label>}
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex min-h-12 items-center border border-line bg-paper"><button aria-label="Decrease quantity" className="grid size-11 place-items-center text-lg" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><span aria-live="polite" className="min-w-8 text-center text-sm">{quantity}</span><button aria-label="Increase quantity" className="grid size-11 place-items-center text-lg" onClick={() => setQuantity((value) => Math.min(99, value + 1))}>+</button></div>
      <button disabled={!canBuy} onClick={() => addToBag()} style={actionButtonCssVariables(buttonStyles.add_to_bag)} className="button-primary action-button flex-1">{canBuy && <ShoppingBag size={16} aria-hidden="true" />}{canBuy ? "Add to bag" : "Sold out"}</button>
    </div>
    <button disabled={!canBuy} onClick={() => addToBag(true)} style={actionButtonCssVariables(buttonStyles.buy_now)} className="button-secondary action-button flex w-full items-center justify-center gap-2"><Zap size={16} aria-hidden="true" />Buy now · {formatPrice(price * quantity)}</button>
    {whatsappEnabled && whatsappProductEnabled && <button disabled={!canBuy} onClick={buyViaWhatsApp} style={actionButtonCssVariables(buttonStyles.buy_via_whatsapp)} className="button-secondary action-button flex w-full items-center justify-center gap-2"><MessageCircle size={16} />{canBuy ? (whatsappButtonLabel || DEFAULT_WHATSAPP_PRODUCT_LABEL) : "Unavailable"}</button>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-4 text-xs text-muted"><span>{canBuy ? "In stock · ready to ship" : "Currently unavailable"}</span><button onClick={share} className="inline-flex items-center gap-2 text-ink hover:text-olive"><Share2 size={15} /> Share</button></div>
    {compare && compare > price && <p className="text-xs text-olive">You save {formatPrice((compare - price) * quantity)} on this order.</p>}
  </div>;
}
