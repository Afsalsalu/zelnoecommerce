"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import { actionButtonCssVariables, resolveActionButtonStyles, type ActionButtonStyles } from "@/lib/action-button-styles";
import { formatPrice } from "@/lib/format";

export function CartPageClient({ shippingFee, freeMinimum, currency, whatsappEnabled, whatsappCartEnabled, whatsappButtonLabel, actionButtonStyles }: { shippingFee: number; freeMinimum: number; currency: string; whatsappEnabled: boolean; whatsappCartEnabled: boolean; whatsappButtonLabel?: string; actionButtonStyles?: ActionButtonStyles }) {
  const { items, couponCode, setCouponCode, setQuantity, remove, subtotal, hydrated } = useCart();
  const [code, setCode] = useState(couponCode);
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);

  async function applyCoupon(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This coupon could not be applied.");
      setCouponCode(result.code);
      setDiscount(Number(result.discount));
      toast.success("Coupon applied");
    } catch (error) {
      setCouponCode("");
      setDiscount(0);
      toast.error(error instanceof Error ? error.message : "This coupon could not be applied.");
    } finally {
      setBusy(false);
    }
  }

  function removeCoupon() {
    setCouponCode("");
    setCode("");
    setDiscount(0);
  }

  const shipping = subtotal - discount >= freeMinimum ? 0 : shippingFee;
  const buttonStyles = resolveActionButtonStyles(actionButtonStyles);

  if (!hydrated) return <div className="py-20 text-center text-sm text-muted">Loading your bag…</div>;
  if (!items.length) return <section className="mx-auto max-w-3xl px-5 py-24 text-center"><span className="eyebrow">A good place to begin</span><h1 className="mt-4 font-display text-5xl">Your bag is empty.</h1><p className="mt-4 text-sm text-muted">Thoughtfully selected pieces are waiting to find a place at home.</p><Link href="/shop" className="button-primary mt-7">Explore the shop<ArrowRight size={15}/></Link></section>;

  return <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
    <header className="mb-9 border-b border-line pb-7"><span className="eyebrow">A considered choice</span><h1 className="mt-3 font-display text-5xl">Your bag <span className="text-muted">({items.length})</span></h1></header>
    <div className="grid gap-12 lg:grid-cols-[1.4fr_.6fr] lg:gap-16">
      <div className="divide-y divide-line">
        {items.map((item) => <article key={`${item.productId}-${item.variantId}`} className="grid grid-cols-[88px_1fr] gap-4 py-5 sm:grid-cols-[112px_1fr_auto] sm:gap-6">
          <Link href={`/shop/${item.slug}`} className="relative aspect-[4/5] overflow-hidden bg-sand">{item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill sizes="112px" className="object-cover" />}</Link>
          <div className="flex min-w-0 flex-col justify-between py-1"><div><Link href={`/shop/${item.slug}`} className="font-display text-xl sm:text-2xl">{item.title}</Link><p className="mt-1 text-xs text-muted">{item.variantName}</p><p className="mt-2 text-sm">{formatPrice(item.unitPrice, currency)}</p></div><div className="mt-4 flex items-center gap-2"><button aria-label={`Decrease ${item.title} quantity`} className="grid size-9 place-items-center border border-line" onClick={() => setQuantity(item.productId, item.variantId, item.quantity - 1)}><Minus size={13}/></button><span className="min-w-7 text-center text-sm">{item.quantity}</span><button aria-label={`Increase ${item.title} quantity`} className="grid size-9 place-items-center border border-line" onClick={() => setQuantity(item.productId, item.variantId, item.quantity + 1)}><Plus size={13}/></button><button aria-label={`Remove ${item.title}`} className="ml-2 text-muted hover:text-red-700" onClick={() => remove(item.productId, item.variantId)}><Trash2 size={15}/></button></div></div>
          <p className="col-span-2 text-right text-sm font-medium sm:col-span-1 sm:pt-2">{formatPrice(item.unitPrice * item.quantity, currency)}</p>
        </article>)}
      </div>
      <aside className="h-fit bg-paper p-5 sm:p-7">
        <h2 className="font-display text-2xl">Order summary</h2>
        <form onSubmit={applyCoupon} className="mt-5 border-b border-line pb-5"><label className="field-label" htmlFor="coupon">Offer code</label><div className="flex gap-2"><input id="coupon" className="field-control min-w-0" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter code" maxLength={40}/>{couponCode ? <button type="button" className="button-secondary min-h-12 px-3" onClick={removeCoupon}>Remove</button> : <button disabled={busy || !code.trim()} className="button-secondary min-h-12 px-4">Apply</button>}</div>{couponCode && <p className="mt-2 text-xs text-olive">{couponCode} applied · {formatPrice(discount, currency)} saved</p>}</form>
        <dl className="space-y-3 py-5 text-sm"><div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(subtotal, currency)}</dd></div><div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{shipping ? formatPrice(shipping, currency) : "Complimentary"}</dd></div>{discount > 0 && <div className="flex justify-between text-olive"><dt>Offer</dt><dd>−{formatPrice(discount, currency)} saved</dd></div>}<div className="flex justify-between border-t border-line pt-4 text-base font-semibold"><dt>Estimated total</dt><dd>{formatPrice(Math.max(0, subtotal - discount + shipping), currency)}</dd></div></dl>
        <p className="mb-5 text-[11px] leading-5 text-muted">Final prices, stock and shipping are confirmed securely at checkout.</p>
        <div className="space-y-3"><Link href="/checkout" className="button-primary w-full">Continue to checkout<ArrowRight size={15}/></Link>{whatsappEnabled && whatsappCartEnabled && <Link href="/checkout?whatsapp=cart" style={actionButtonCssVariables(buttonStyles.buy_via_whatsapp)} className="button-secondary action-button flex w-full items-center justify-center gap-2"><MessageCircle size={16}/>{whatsappButtonLabel || "Order via WhatsApp"}</Link>}</div>
        <Link href="/shop" className="mt-4 block text-center text-xs underline underline-offset-4">Continue shopping</Link>
      </aside>
    </div>
  </div>;
}
