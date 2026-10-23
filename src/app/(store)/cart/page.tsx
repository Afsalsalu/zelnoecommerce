import { CartPageClient } from "@/components/cart-page-client";
import { getStoreSettings } from "@/lib/store";
export const metadata = { title: "Your bag", robots: { index: false, follow: false } };
export default async function CartPage() { const settings = await getStoreSettings(); return <CartPageClient shippingFee={Number(settings.shipping_fee ?? 0)} freeMinimum={Number(settings.free_shipping_minimum ?? 0)} currency={settings.currency || "INR"} whatsappEnabled={Boolean(settings.whatsapp_enabled)} whatsappCartEnabled={Boolean(settings.whatsapp_cart_enabled)} whatsappButtonLabel={settings.whatsapp_order_button_label} actionButtonStyles={settings.product_action_button_styles}/>; }
