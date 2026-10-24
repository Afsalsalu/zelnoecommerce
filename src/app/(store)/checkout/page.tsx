import type { CartLine } from "@/lib/cart-types";
import { CheckoutForm, type CheckoutMode } from "@/components/checkout-form";
import { getCurrentUser } from "@/lib/auth";
import { getServerCustomerLoginRequirements } from "@/lib/customer-login-requirements-server";
import { isRazorpayConfigured } from "@/lib/env";
import { getProductById, getStoreSettings } from "@/lib/store";
import { safeInternalPath } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getSavedAddressesForCheckout, logSavedAddressError } from "@/lib/saved-address-server";
import type { SavedAddress } from "@/lib/saved-addresses";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function checkoutPath(query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) { const item = first(value); if (item !== undefined) params.set(key, item); }
  const queryString = params.toString();
  return safeInternalPath(`/checkout${queryString ? `?${queryString}` : ""}`, "/checkout");
}

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const requestedMode = first(query.whatsapp);
  const mode: CheckoutMode = requestedMode === "cart" ? "cart" : requestedMode === "buy-now" ? "buy-now" : "standard";
  const buyNowRequested = first(query.buyNow) === "1";
  const [settings, user, requirements] = await Promise.all([getStoreSettings(), getCurrentUser(), getServerCustomerLoginRequirements()]);
  const loginRequired = requirements.require_login_checkout
    || (buyNowRequested && requirements.require_login_buy_now)
    || ((mode === "cart" || mode === "buy-now") && requirements.require_login_whatsapp);
  if (!user && loginRequired) redirect(`/login?next=${encodeURIComponent(checkoutPath(query))}`);
  let buyNowItem: CartLine | null = null;
  if (mode === "buy-now") {
    const productId = first(query.productId);
    const variantId = first(query.variantId) || null;
    const quantity = Number(first(query.quantity));
    const product = productId ? await getProductById(productId) : null;
    const variant = product?.product_variants?.find((item) => item.id === variantId) ?? (product?.product_variants?.length ? undefined : null);
    if (product && Number.isInteger(quantity) && quantity >= 1 && quantity <= 99 && (!variantId || Boolean(variant)) && (variant || !product.product_variants?.length)) {
      buyNowItem = { productId: product.id, variantId: variant?.id ?? null, slug: product.slug, title: product.title, variantName: variant?.name ?? "Standard", unitPrice: Number(variant?.price ?? product.price), imageUrl: product.product_images?.[0]?.url ?? null, quantity };
    }
  }
  let savedAddressResult: { addresses: SavedAddress[]; error: boolean } = { addresses: [], error: false };
  if (user) {
    try {
      savedAddressResult = await getSavedAddressesForCheckout(user.id, user.email || "");
    } catch (error) {
      logSavedAddressError("loading saved addresses for checkout page", error);
      savedAddressResult = { addresses: [], error: true };
    }
  }
  const intro = mode === "standard"
    ? user ? "You're signed in. Your details and saved addresses are available for faster checkout." : "Guest checkout is welcome. No account required."
    : "Your details are saved securely before WhatsApp opens. You will press Send manually.";
  return <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><header className="mb-9 border-b border-line pb-7"><span className="eyebrow">A few details, then it&apos;s yours</span><h1 className="mt-3 font-display text-5xl">Checkout</h1><p className="mt-3 text-sm text-muted">{intro}</p></header><CheckoutForm isAuthenticated={Boolean(user)} initialSavedAddresses={savedAddressResult.addresses} savedAddressesLoadError={savedAddressResult.error} codEnabled={Boolean(settings.cod_enabled)} razorpayEnabled={isRazorpayConfigured} shippingFee={Number(settings.shipping_fee ?? 0)} freeMinimum={Number(settings.free_shipping_minimum ?? 0)} currency={settings.currency || "INR"} whatsappEnabled={Boolean(settings.whatsapp_enabled)} whatsappCheckoutEnabled={Boolean(settings.whatsapp_checkout_enabled)} whatsappButtonLabel={settings.whatsapp_order_button_label} actionButtonStyles={settings.product_action_button_styles} mode={mode} buyNow={buyNowRequested} buyNowItem={buyNowItem} /></div>;
}
