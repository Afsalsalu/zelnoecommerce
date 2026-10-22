import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { cartLineSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Cart sync is not configured." }, { status: 503 });
  const parsed = z.object({ items: z.array(cartLineSchema).max(40) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cart details are invalid." }, { status: 400 });
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save your cart." }, { status: 401 });
  const { data: cart, error: cartError } = await supabase.from("carts").upsert({ user_id: user.id }, { onConflict: "user_id" }).select("id").single();
  if (cartError || !cart) return NextResponse.json({ error: "Could not save your cart." }, { status: 503 });
  for (const item of parsed.data.items) {
    const { data: product } = await supabase.from("products").select("id,stock_quantity,continue_selling,product_variants(id,stock_quantity,stock_status)").eq("id", item.productId).eq("status", "published").maybeSingle();
    if (!product) continue;
    const variant = item.variantId ? product.product_variants?.find((entry) => entry.id === item.variantId) : null;
    if (item.variantId && !variant) continue;
    const stock = variant?.stock_quantity ?? product.stock_quantity;
    const stockStatus = variant?.stock_status ?? (product.continue_selling ? "continue_selling" : "in_stock");
    if (stock <= 0 && stockStatus !== "continue_selling") continue;
    const { data: existing } = await supabase.from("cart_items").select("id,quantity,variant_id").eq("cart_id", cart.id).eq("product_id", item.productId);
    const found = existing?.find((row) => row.variant_id === item.variantId);
    const nextQuantity = Math.min(99, (found?.quantity ?? 0) + item.quantity);
    if (found) await supabase.from("cart_items").update({ quantity: nextQuantity }).eq("id", found.id);
    else await supabase.from("cart_items").insert({ cart_id: cart.id, product_id: item.productId, variant_id: item.variantId, quantity: Math.min(item.quantity, Math.max(1, stock)) });
  }
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
