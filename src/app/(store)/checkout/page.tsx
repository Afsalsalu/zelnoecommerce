import { CheckoutForm } from "@/components/checkout-form";
import { isRazorpayConfigured } from "@/lib/env";
import { getStoreSettings } from "@/lib/store";
export const metadata={title:"Checkout",robots:{index:false,follow:false}};
export default async function CheckoutPage(){const settings=await getStoreSettings();return <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16"><header className="mb-9 border-b border-line pb-7"><span className="eyebrow">A few details, then it’s yours</span><h1 className="mt-3 font-display text-5xl">Checkout</h1><p className="mt-3 text-sm text-muted">Guest checkout is welcome. No account required.</p></header><CheckoutForm codEnabled={Boolean(settings.cod_enabled)} razorpayEnabled={isRazorpayConfigured} shippingFee={Number(settings.shipping_fee??0)} freeMinimum={Number(settings.free_shipping_minimum??0)} currency={settings.currency||"INR"}/></div>;}
