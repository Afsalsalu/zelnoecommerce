import type { CartLine } from "@/lib/cart-types";
import { CheckoutForm, type CheckoutMode } from "@/components/checkout-form";
import { isRazorpayConfigured } from "@/lib/env";
import { getProductById, getStoreSettings } from "@/lib/store";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const requestedMode = first(query.whatsapp);
  const mode: CheckoutMode = requestedMode === "cart" ? "cart" : requestedMode === "buy-now" ? "buy-now" : "standard";
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
  const settings = await getStoreSettings();
  return <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><header className="mb-9 border-b border-line pb-7"><span className="eyebrow">A few details, then it&apos;s yours</span><h1 className="mt-3 font-display text-5xl">Checkout</h1><p className="mt-3 text-sm text-muted">{mode === "standard" ? "Guest checkout is welcome. No account required." : "Your details are saved securely before WhatsApp opens. You will press Send manually."}</p></header><CheckoutForm codEnabled={Boolean(settings.cod_enabled)} razorpayEnabled={isRazorpayConfigured} shippingFee={Number(settings.shipping_fee ?? 0)} freeMinimum={Number(settings.free_shipping_minimum ?? 0)} currency={settings.currency || "INR"} whatsappEnabled={Boolean(settings.whatsapp_enabled)} whatsappCheckoutEnabled={Boolean(settings.whatsapp_checkout_enabled)} whatsappButtonLabel={settings.whatsapp_order_button_label} actionButtonStyles={settings.product_action_button_styles} mode={mode} buyNowItem={buyNowItem} /></div>;
}
