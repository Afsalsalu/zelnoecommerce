import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/env";

const schema = z.object({ orderNumber: z.string().trim().min(12).max(40), contact: z.string().trim().min(5).max(254) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter an order number and the email or phone used at checkout." }, { status: 400 });
  if (!isServiceRoleConfigured) return NextResponse.json({ error: "Order tracking is not connected yet." }, { status: 503 });
  const admin = createServiceSupabase();
  const { data: order } = await admin.from("orders").select("id,order_number,customer_email,customer_phone,order_status,order_source,whatsapp_status,payment_status,payment_method,subtotal,discount_total,shipping_total,total,placed_at,tracking_courier,tracking_number").eq("order_number", parsed.data.orderNumber.toUpperCase()).maybeSingle();
  if (!order) return NextResponse.json({ error: "We couldn't find an order matching those details." }, { status: 404 });
  const contact = parsed.data.contact.trim().toLowerCase();
  const matchesEmail = order.customer_email.toLowerCase() === contact;
  const matchesPhone = order.customer_phone.replace(/\D/g, "") === contact.replace(/\D/g, "");
  if (!matchesEmail && !matchesPhone) return NextResponse.json({ error: "We couldn't find an order matching those details." }, { status: 404 });
  const [{ data: items }, { data: history }] = await Promise.all([
    admin.from("order_items").select("product_title_snapshot,variant_snapshot,unit_price,quantity,image_url_snapshot,line_total").eq("order_id", order.id),
    admin.from("customer_order_status_history").select("next_status,created_at").eq("order_id", order.id).order("created_at"),
  ]);
  const { customer_email: _email, customer_phone: _phone, id: _id, ...safeOrder } = order;
  return NextResponse.json({ order: safeOrder, items: items ?? [], history: history ?? [] }, { headers: { "cache-control": "private, no-store" } });
}
