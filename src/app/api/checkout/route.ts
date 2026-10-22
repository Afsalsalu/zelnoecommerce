import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/schemas";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { isRazorpayConfigured, isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your order details." }, { status: 400 });
  const input = parsed.data;
  if (!isSupabaseConfigured || !isServiceRoleConfigured) return NextResponse.json({ error: "Checkout needs Supabase configuration. Add the server-side credentials and try again." }, { status: 503 });
  if (input.paymentMethod === "razorpay" && !isRazorpayConfigured) return NextResponse.json({ error: "Online payment is not configured yet. Please choose cash on delivery." }, { status: 503 });
  let userId: string | null = null;
  try { const sessionClient = await createServerSupabase(); const { data } = await sessionClient.auth.getUser(); userId = data.user?.id ?? null; } catch { /* Guest checkout is allowed. */ }
  const orderNumber = `ZK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(5).toString("hex").toUpperCase()}`;
  const admin = createServiceSupabase();
  const { data, error } = await admin.rpc("create_checkout_order", {
    p_order_number: orderNumber,
    p_user_id: userId,
    p_customer: {
      name: input.name, email: input.email, phone: input.phone,
      address: { address_line: input.addressLine, area: input.area, city: input.city, state: input.state, pincode: input.pincode },
      notes: input.notes || "", shipping_method: input.shippingMethod,
    },
    p_items: input.items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
    p_coupon_code: input.couponCode || null,
    p_payment_method: input.paymentMethod,
  });
  if (error || !data) {
    const code = error?.message ?? "";
    const userMessage = code.includes("OUT_OF_STOCK") || code.includes("PRODUCT_UNAVAILABLE") || code.includes("VARIANT_UNAVAILABLE") ? "An item in your bag is unavailable or has changed. Please review your bag." : code.includes("COUPON") ? "That coupon is not valid for this order." : code.includes("COD_DISABLED") ? "Cash on delivery is currently unavailable." : "We couldn't place this order. Please review your details and try again.";
    return NextResponse.json({ error: userMessage }, { status: 409, headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json({ ok: true, order: data, orderNumber }, { status: 201, headers: { "cache-control": "no-store" } });
}
