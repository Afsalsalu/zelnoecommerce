import { NextResponse } from "next/server";
import { z } from "zod";
import { cartLineSchema } from "@/lib/schemas";
import { percentageDiscountPaise } from "@/lib/money";
import { formatPrice } from "@/lib/utils";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/env";
const schema = z.object({ code: z.string().trim().min(1).max(40), items: z.array(cartLineSchema).min(1).max(40) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Enter a coupon and add an item to your bag." }, { status: 400 });
  if (!isServiceRoleConfigured) return NextResponse.json({ error: "Coupon validation is not connected yet." }, { status: 503 });
  const admin = createServiceSupabase(); let subtotal = 0;
  for (const item of parsed.data.items) {
    const { data: product } = await admin.from("products").select("id,status,price,product_variants(id,price)").eq("id", item.productId).eq("status", "published").maybeSingle();
    if (!product) return NextResponse.json({ error: "An item in your bag is no longer available." }, { status: 409 });
    const variant = item.variantId ? product.product_variants?.find((value) => value.id === item.variantId) : null;
    if (item.variantId && !variant) return NextResponse.json({ error: "An item option in your bag is no longer available." }, { status: 409 });
    subtotal += Number(variant?.price ?? product.price) * item.quantity;
  }
  const { data: coupon } = await admin.from("coupons").select("id,code,discount_type,discount_value,minimum_order_amount,usage_limit,usage_count,starts_at,ends_at").eq("code", parsed.data.code.toUpperCase()).eq("is_active", true).maybeSingle();
  const now = Date.now();
  if (!coupon || (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) || (coupon.ends_at && new Date(coupon.ends_at).getTime() <= now) || (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit)) return NextResponse.json({ error: "That coupon is not available." }, { status: 400 });
  if (subtotal < Number(coupon.minimum_order_amount)) return NextResponse.json({ error: `Add ${formatPrice(Number(coupon.minimum_order_amount) - subtotal)} more to use this coupon.` }, { status: 400 });
  const discount = Math.min(subtotal, coupon.discount_type === "percentage" ? percentageDiscountPaise(subtotal, Number(coupon.discount_value)) : Number(coupon.discount_value));
  return NextResponse.json({ ok: true, code: coupon.code, discount }, { headers: { "cache-control": "private, no-store" } });
}
