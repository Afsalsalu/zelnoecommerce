import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";
import { env, isRazorpayConfigured, isServiceRoleConfigured } from "@/lib/env";

const schema = z.object({ orderNumber: z.string().trim().min(12).max(40) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Order number is invalid." }, { status: 400 });
  if (!isRazorpayConfigured || !isServiceRoleConfigured) return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });
  const admin = createServiceSupabase();
  const { data: order } = await admin.from("orders").select("id,order_number,total,payment_method,payment_status,payment_reference").eq("order_number", parsed.data.orderNumber.toUpperCase()).maybeSingle();
  if (!order || order.payment_method !== "razorpay" || order.payment_status !== "payment_pending") return NextResponse.json({ error: "This order is not awaiting online payment." }, { status: 409 });
  const amount = Number(order.total);
  if (!Number.isSafeInteger(amount) || amount < 0) return NextResponse.json({ error: "This order total is invalid." }, { status: 503 });
  if (order.payment_reference) return NextResponse.json({ keyId: env.RAZORPAY_KEY_ID, gatewayOrderId: order.payment_reference, amount, currency: "INR", orderNumber: order.order_number }, { headers: { "cache-control": "no-store" } });
  const authorization = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const gatewayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { authorization: `Basic ${authorization}`, "content-type": "application/json" },
    body: JSON.stringify({ amount, currency: "INR", receipt: order.order_number, notes: { order_number: order.order_number } }), cache: "no-store",
  }).catch(() => null);
  const gatewayOrder = gatewayResponse?.ok ? await gatewayResponse.json().catch(() => null) as { id?: string; amount?: number; currency?: string } | null : null;
  if (!gatewayOrder?.id) return NextResponse.json({ error: "The payment provider could not create a payment order." }, { status: 502 });
  const { error } = await admin.from("orders").update({ payment_reference: gatewayOrder.id }).eq("id", order.id).eq("payment_status", "payment_pending");
  if (error) return NextResponse.json({ error: "Could not prepare payment. Please contact support with your order number." }, { status: 503 });
  return NextResponse.json({ keyId: env.RAZORPAY_KEY_ID, gatewayOrderId: gatewayOrder.id, amount: gatewayOrder.amount, currency: gatewayOrder.currency, orderNumber: order.order_number }, { headers: { "cache-control": "no-store" } });
}
