"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, MessageCircle, PackageSearch, RefreshCw } from "lucide-react";
import { checkoutSchema } from "@/lib/schemas";
import { useCart } from "@/components/cart-provider";
import { useCustomerLoginRequirements } from "@/components/customer-login-requirements-provider";
import { CheckoutSavedAddresses } from "@/components/checkout-saved-addresses";
import { formatPrice } from "@/lib/format";
import { createWhatsAppRequestKey, DEFAULT_WHATSAPP_ORDER_LABEL } from "@/lib/whatsapp";
import { actionButtonCssVariables, resolveActionButtonStyles, type ActionButtonStyles } from "@/lib/action-button-styles";
import type { CartLine } from "@/lib/cart-types";
import { checkoutValuesFromAddress, shouldShowSavedAddresses, sortSavedAddresses, type SavedAddress } from "@/lib/saved-addresses";
import type { z } from "zod";
import { customerLoginPath } from "@/lib/customer-action";

const detailsSchema = checkoutSchema.omit({ items: true });
type DetailsInput = z.input<typeof detailsSchema>;
type Details = z.output<typeof detailsSchema>;
export type CheckoutMode = "standard" | "cart" | "buy-now";

type WhatsAppConfirmation = { orderNumber: string; placedAt?: string };
type GatewayResponse = { keyId: string; gatewayOrderId: string; amount: number; currency: string; orderNumber: string };
type GatewayResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, callback: () => void) => void } } }

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(Boolean(window.Razorpay)); script.onerror = () => resolve(false); document.body.appendChild(script);
  });
}

export function CheckoutForm({ isAuthenticated = false, initialSavedAddresses = [], savedAddressesLoadError = false, codEnabled, razorpayEnabled, shippingFee, freeMinimum, currency, whatsappEnabled, whatsappCheckoutEnabled, whatsappButtonLabel, actionButtonStyles, mode = "standard", buyNow = false, buyNowItem }: {
  isAuthenticated?: boolean; initialSavedAddresses?: SavedAddress[]; savedAddressesLoadError?: boolean;
  codEnabled: boolean; razorpayEnabled: boolean; shippingFee: number; freeMinimum: number; currency: string;
  whatsappEnabled: boolean; whatsappCheckoutEnabled: boolean; whatsappButtonLabel?: string; actionButtonStyles?: ActionButtonStyles; mode?: CheckoutMode; buyNow?: boolean; buyNowItem?: CartLine | null;
}) {
  const router = useRouter();
  const { items, subtotal: cartSubtotal, couponCode, clear, hydrated } = useCart();
  const customerLoginRequirements = useCustomerLoginRequirements();
  const buttonStyles = resolveActionButtonStyles(actionButtonStyles);
  const [payment, setPayment] = useState<"cod" | "razorpay">(codEnabled ? "cod" : "razorpay");
  const [busy, setBusy] = useState<"regular" | "whatsapp" | null>(null);
  const [whatsappDiscount, setWhatsappDiscount] = useState(0);
  const [confirmation, setConfirmation] = useState<WhatsAppConfirmation | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => sortSavedAddresses(initialSavedAddresses));
  const [savedAddressesLoading, setSavedAddressesLoading] = useState(false);
  const [savedAddressesError, setSavedAddressesError] = useState<string | null>(savedAddressesLoadError ? "Saved addresses are unavailable right now. Please try again." : null);
  const [savedAddressesAuthenticated, setSavedAddressesAuthenticated] = useState(isAuthenticated);
  const [savedAddressesExpanded, setSavedAddressesExpanded] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const requestKeyRef = useRef<string | null>(null);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<DetailsInput, undefined, Details>({ resolver: zodResolver(detailsSchema), defaultValues: { name: "", email: "", phone: "", addressLine: "", area: "", city: "", state: "", pincode: "", notes: "", shippingMethod: "standard", paymentMethod: codEnabled ? "cod" : "razorpay", couponCode } });
  const checkoutItems: CartLine[] = mode === "buy-now" && buyNowItem ? [buyNowItem] : items;
  const checkoutItemsKey = checkoutItems.map(({ productId, variantId, quantity }) => `${productId}:${variantId || ""}:${quantity}`).join("|");
  const subtotal = mode === "buy-now" ? checkoutItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) : cartSubtotal;
  const activeCouponCode = mode === "buy-now" ? "" : couponCode;
  const summaryDiscount = mode === "standard" ? 0 : Math.min(subtotal, whatsappDiscount);
  const shipping = subtotal - summaryDiscount >= freeMinimum ? 0 : shippingFee;
  const canWhatsApp = Boolean(whatsappEnabled && (mode !== "standard" || whatsappCheckoutEnabled));
  const invalidBuyNow = mode === "buy-now" && !buyNowItem;

  useEffect(() => { setValue("couponCode", mode === "buy-now" ? "" : couponCode); setValue("paymentMethod", payment); }, [couponCode, mode, payment, setValue]);
  useEffect(() => {
    if (mode === "buy-now" || !activeCouponCode || !checkoutItems.length) { setWhatsappDiscount(0); return; }
    let active = true;
    void fetch("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: activeCouponCode, items: checkoutItems.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }) })
      .then(async (response) => response.ok ? response.json() as Promise<{ discount?: number }> : { discount: 0 })
      .then((result) => { if (active) setWhatsappDiscount(Number(result.discount) || 0); })
      .catch(() => { if (active) setWhatsappDiscount(0); });
    return () => { active = false; };
  }, [activeCouponCode, checkoutItemsKey, mode]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("zelno-whatsapp-order-return");
      if (raw) { const parsed = JSON.parse(raw) as WhatsAppConfirmation; if (parsed.orderNumber) setConfirmation(parsed); sessionStorage.removeItem("zelno-whatsapp-order-return"); }
    } catch { /* Ignore unavailable browser storage. */ }
  }, []);
  async function retrySavedAddresses() {
    if (!isAuthenticated) return;
    setSavedAddressesLoading(true);
    try {
      const response = await fetch("/api/account/addresses", { cache: "no-store" });
      if (response.status === 401) {
        setSavedAddresses([]);
        setSavedAddressesAuthenticated(false);
        setSavedAddressesError(null);
        return;
      }
      if (!response.ok) throw new Error("Saved addresses are unavailable right now. Please try again.");
      const result = await response.json() as { addresses?: SavedAddress[] };
      setSavedAddresses(sortSavedAddresses(result.addresses ?? []));
      setSavedAddressesAuthenticated(true);
      setSavedAddressesError(null);
    } catch (error) {
      setSavedAddressesError(error instanceof Error ? error.message : "Saved addresses are unavailable right now. Please try again.");
    } finally {
      setSavedAddressesLoading(false);
    }
  }

  function getRequestKey() {
    if (!requestKeyRef.current) requestKeyRef.current = createWhatsAppRequestKey();
    return requestKeyRef.current;
  }
  function redirectToLogin() {
    router.push(customerLoginPath(`${window.location.pathname}${window.location.search}`));
  }

  function selectSavedAddress(address: SavedAddress) {
    const values = checkoutValuesFromAddress(address);
    setSelectedAddressId(address.id);
    setValue("name", values.name, { shouldValidate: true });
    setValue("email", values.email, { shouldValidate: true });
    setValue("phone", values.phone, { shouldValidate: true });
    setValue("addressLine", values.addressLine, { shouldValidate: true });
    setValue("area", values.area, { shouldValidate: true });
    setValue("city", values.city, { shouldValidate: true });
    setValue("state", values.state, { shouldValidate: true });
    setValue("pincode", values.pincode, { shouldValidate: true });
  }

  async function saveAddressAfterSuccessfulCheckout(values: Details) {
    const response = await fetch("/api/account/addresses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "record_checkout", full_name: values.name, email: values.email, phone: values.phone, address_line: values.addressLine, area: values.area, city: values.city, state: values.state, pincode: values.pincode }) });
    if (response.status === 401) return;
    if (!response.ok) throw new Error("Your order was completed, but the address could not be saved for next time.");
  }

  async function submitRegular(values: Details) {
    if (!checkoutItems.length) { toast.error("Your bag is empty."); return; }
    if (!isAuthenticated && (customerLoginRequirements.require_login_checkout || (buyNow && customerLoginRequirements.require_login_buy_now))) { redirectToLogin(); return; }
    if (payment === "cod" && !codEnabled) { toast.error("Cash on delivery is not available."); return; }
    if (payment === "razorpay" && !razorpayEnabled) { toast.error("Online payment is not configured. Please choose cash on delivery."); return; }
    setBusy("regular");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, paymentMethod: payment, checkoutIntent: buyNow ? "buy-now" : "standard", couponCode: activeCouponCode, items: checkoutItems.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }) });
      const result = await response.json(); if (result.loginRequired) { redirectToLogin(); return; } if (!response.ok) throw new Error(result.error || "We couldn't place your order.");
      if (payment === "cod") { clear(); router.push(`/order-success/${encodeURIComponent(result.orderNumber)}`); return; }
      const ready = await loadRazorpay(); if (!ready) throw new Error("Secure checkout could not be loaded. Your order is still awaiting payment.");
      const gatewayResponse = await fetch("/api/payments/razorpay/create-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderNumber: result.orderNumber }) });
      const gateway = await gatewayResponse.json() as GatewayResponse & { error?: string }; if (!gatewayResponse.ok) throw new Error(gateway.error || "Online payment could not be prepared.");
      const Razorpay = window.Razorpay; if (!Razorpay) throw new Error("Secure checkout could not be loaded.");
      const checkout = new Razorpay({ key: gateway.keyId, amount: gateway.amount, currency: gateway.currency, order_id: gateway.gatewayOrderId, name: "ZELNO Kitchen", description: `Order ${gateway.orderNumber}`, handler: async (paymentResult: GatewayResult) => { const verified = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderNumber: gateway.orderNumber, razorpayOrderId: paymentResult.razorpay_order_id, razorpayPaymentId: paymentResult.razorpay_payment_id, razorpaySignature: paymentResult.razorpay_signature }) }); const body = await verified.json(); if (!verified.ok) { toast.error(body.error || "Payment verification failed."); return; } try { await saveAddressAfterSuccessfulCheckout(values); } catch { /* The paid order is still complete if address history is unavailable. */ } clear(); toast.success("Payment details verified; waiting for final confirmation."); router.push(`/order-success/${encodeURIComponent(gateway.orderNumber)}`); }, modal: { ondismiss: () => toast.message("Payment was not completed. Your order remains pending.") }, theme: { color: "#626b4f" } });
      checkout.on("payment.failed", () => toast.error("Payment failed. Your order remains pending.")); checkout.open();
    } catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't complete checkout."); }
    finally { setBusy(null); }
  }

  async function submitWhatsApp(values: Details) {
    if (!checkoutItems.length) { toast.error(mode === "buy-now" ? "This product is no longer available." : "Your bag is empty."); return; }
    if (!isAuthenticated && (customerLoginRequirements.require_login_whatsapp || customerLoginRequirements.require_login_checkout)) { redirectToLogin(); return; }
    if (!canWhatsApp) { toast.error("WhatsApp ordering is not available right now."); return; }
    setBusy("whatsapp");
    try {
      const response = await fetch("/api/whatsapp/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, paymentMethod: "cod", couponCode: activeCouponCode, requestKey: getRequestKey(), items: checkoutItems.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) }) });
      const result = await response.json(); if (result.loginRequired) { redirectToLogin(); return; } if (!response.ok) throw new Error(result.error || "We couldn't prepare the WhatsApp order.");
      try { sessionStorage.setItem("zelno-whatsapp-order-return", JSON.stringify({ orderNumber: result.orderNumber, placedAt: result.placedAt })); } catch { /* The order is still saved if storage is unavailable. */ }
      window.location.assign(result.whatsappUrl);
    } catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't prepare the WhatsApp order."); setBusy(null); }
  }

  const field = (name: keyof DetailsInput, label: string, type = "text", autoComplete?: string) => { const error = errors[name]; const registration = register(name); return <label className="block"><span className="field-label">{label}</span><input type={type} autoComplete={autoComplete} className="field-control" aria-invalid={Boolean(error)} {...registration} onChange={(event) => { registration.onChange(event); setSelectedAddressId(null); }} />{error && <span className="mt-1 block text-xs text-red-700">{String(error.message)}</span>}</label>; };

  if (!hydrated) return <p className="py-10 text-center text-sm text-muted">Loading your bag…</p>;
  if (invalidBuyNow) return <div className="border border-line bg-paper p-7 text-center"><p className="text-sm text-muted">This WhatsApp product request is no longer available.</p><a className="button-secondary mt-4" href="/shop"><ArrowLeft size={15} aria-hidden="true" />Return to the shop</a></div>;
  if (!checkoutItems.length) return <div className="bg-paper p-7 text-center"><p className="text-sm text-muted">Your bag is empty.</p><a className="button-secondary mt-4" href="/shop"><ArrowLeft size={15} aria-hidden="true" />Return to the shop</a></div>;

  return <form onSubmit={handleSubmit(mode === "standard" ? submitRegular : submitWhatsApp)} className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-16">
    <div className="space-y-9">
      {savedAddressesLoading && <section className="border border-line bg-paper p-5 sm:p-7" role="status" aria-live="polite"><p className="text-sm text-muted">Loading saved addresses…</p></section>}
      {savedAddressesError && <section className="border border-amber-200 bg-amber-50 p-5 sm:p-7" role="status"><h2 className="font-display text-2xl">Saved addresses unavailable</h2><p className="mt-2 text-sm leading-6 text-amber-900">We couldn&apos;t load your saved addresses. You can continue with a new delivery address or try again.</p><button type="button" onClick={() => void retrySavedAddresses()} disabled={savedAddressesLoading} className="button-secondary mt-4 min-h-10 px-4"><RefreshCw size={14} aria-hidden="true" />{savedAddressesLoading ? "Trying again…" : "Try again"}</button></section>}
      {!savedAddressesLoading && !savedAddressesError && savedAddressesAuthenticated && savedAddresses.length === 0 && <section className="border border-line bg-paper p-5 sm:p-7" role="status"><h2 className="font-display text-2xl">Saved addresses</h2><p className="mt-2 text-sm leading-6 text-muted">No saved addresses yet. Your next successful checkout will save these details for faster ordering.</p></section>}
      {!savedAddressesLoading && !savedAddressesError && shouldShowSavedAddresses(savedAddressesAuthenticated, savedAddresses.length) && <CheckoutSavedAddresses addresses={savedAddresses} selectedId={selectedAddressId} expanded={savedAddressesExpanded} onExpand={() => setSavedAddressesExpanded((value) => !value)} onSelect={selectSavedAddress} onUseNew={() => setSelectedAddressId(null)} />}
      {confirmation && <section role="status" className="border border-olive/30 bg-[#eef0e7] p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-olive text-ivory"><Check size={17} /></span><div><span className="eyebrow">WhatsApp request saved</span><h2 className="mt-2 font-display text-2xl">Order request #{confirmation.orderNumber} created</h2><p className="mt-2 text-sm leading-6 text-muted">Please press Send in WhatsApp to submit your request. The store will confirm availability before reducing stock.</p><div className="mt-4 flex flex-wrap gap-3"><a className="button-secondary min-h-10 px-4" href={`/track-order?order=${encodeURIComponent(confirmation.orderNumber)}`}><PackageSearch size={15} aria-hidden="true" />Track this request</a><a className="button-secondary min-h-10 px-4" href="/shop"><ArrowRight size={15} aria-hidden="true" />Continue shopping</a></div></div></div></section>}
      <section><h2 className="mb-5 font-display text-3xl">Your details</h2><div className="grid gap-4 sm:grid-cols-2">{field("name", "Full name", "text", "name")}{field("email", "Email", "email", "email")}{field("phone", "Phone", "tel", "tel")}</div></section>
      <section><h2 className="mb-5 font-display text-3xl">Delivery address</h2><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2">{field("addressLine", "House / address", "text", "street-address")}</div>{field("area", "Area / locality")}{field("city", "City")}{field("state", "State")}{field("pincode", "Pincode", "text", "postal-code")}</div></section>
      {mode === "standard" && <section><h2 className="mb-5 font-display text-3xl">Delivery and payment</h2><label className="mb-4 block"><span className="field-label">Shipping method</span><select className="field-control" {...register("shippingMethod")}><option value="standard">Standard delivery</option></select></label><div className="space-y-3">{codEnabled && <label className="flex cursor-pointer items-center gap-3 border border-line bg-paper p-4"><input type="radio" name="payment-choice" value="cod" checked={payment === "cod"} onChange={() => setPayment("cod")} className="accent-olive" /><span><strong className="block text-sm">Cash on delivery</strong><small className="text-xs text-muted">Pay when your order arrives.</small></span></label>}<label className={`flex items-center gap-3 border border-line bg-paper p-4 ${razorpayEnabled ? "cursor-pointer" : "opacity-60"}`}><input type="radio" name="payment-choice" value="razorpay" checked={payment === "razorpay"} disabled={!razorpayEnabled} onChange={() => setPayment("razorpay")} className="accent-olive" /><span><strong className="block text-sm">Pay online</strong><small className="text-xs text-muted">Secure payment, where configured.</small></span></label></div></section>}
      <section><label className="block"><span className="field-label">Order note (optional)</span><textarea rows={3} maxLength={1000} className="field-control resize-y" {...register("notes")} /></label></section>
    </div>
    <aside className="h-fit bg-paper p-5 sm:p-7 lg:sticky lg:top-28"><h2 className="font-display text-2xl">Your order</h2><div className="mt-5 max-h-64 space-y-3 overflow-auto border-b border-line pb-5">{checkoutItems.map((item) => <div key={`${item.productId}-${item.variantId}`} className="flex justify-between gap-4 text-sm"><span className="text-muted">{item.title} × {item.quantity}</span><span>{formatPrice(item.unitPrice * item.quantity, currency)}</span></div>)}</div><dl className="space-y-3 py-5 text-sm"><div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(subtotal, currency)}</dd></div>{activeCouponCode && <div className="flex justify-between text-olive"><dt>Offer ({activeCouponCode})</dt><dd>{summaryDiscount ? `−${formatPrice(summaryDiscount, currency)}` : "Validating…"}</dd></div>}<div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{shipping ? formatPrice(shipping, currency) : "Complimentary"}</dd></div><div className="flex justify-between border-t border-line pt-4 text-base font-semibold"><dt>Estimated total</dt><dd>{formatPrice(subtotal - summaryDiscount + shipping, currency)}</dd></div></dl><p className="mb-5 flex gap-2 text-[11px] leading-5 text-muted"><LockKeyhole size={13} className="mt-0.5 shrink-0" />Current item prices, availability, coupons and total are checked on the server before the order is accepted.</p>{mode === "standard" ? <div className="space-y-3"><button type="submit" disabled={busy !== null} className="button-primary w-full">{busy === "regular" ? "Preparing your order…" : payment === "cod" ? "Place COD order" : "Continue to secure payment"}<ArrowRight size={15} /></button>{whatsappEnabled && whatsappCheckoutEnabled && <button type="button" disabled={busy !== null} onClick={() => void handleSubmit(submitWhatsApp)()} style={actionButtonCssVariables(buttonStyles.buy_via_whatsapp)} className="button-secondary action-button flex w-full items-center justify-center gap-2"><MessageCircle size={16} />{busy === "whatsapp" ? "Preparing WhatsApp…" : whatsappButtonLabel || DEFAULT_WHATSAPP_ORDER_LABEL}</button>}</div> : canWhatsApp ? <button type="submit" disabled={busy !== null} style={actionButtonCssVariables(buttonStyles.buy_via_whatsapp)} className="button-primary action-button w-full">{busy === "whatsapp" ? "Preparing WhatsApp…" : <><MessageCircle size={16} />{whatsappButtonLabel || DEFAULT_WHATSAPP_ORDER_LABEL}</>}<ArrowRight size={15} /></button> : <p className="border border-line p-4 text-xs leading-5 text-muted">WhatsApp ordering is unavailable right now.</p>}<p className="mt-3 text-center text-[10px] leading-5 text-muted">By placing an order, you agree to our <a className="underline" href="/terms-conditions">terms</a> and <a className="underline" href="/privacy-policy">privacy policy</a>.</p></aside>
  </form>;
}
