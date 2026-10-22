import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";
import { env, isServiceRoleConfigured } from "@/lib/env";

const schema = z.object({ orderNumber: z.string().trim().min(12).max(40), razorpayOrderId: z.string().min(4).max(80), razorpayPaymentId: z.string().min(4).max(80), razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payment verification details are invalid." }, { status: 400 });
  if (!env.RAZORPAY_KEY_SECRET || !isServiceRoleConfigured) return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
  const { orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest();
  const received = Buffer.from(razorpaySignature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) return NextResponse.json({ error: "The payment signature could not be verified." }, { status: 400 });
  const admin = createServiceSupabase();
  const { data: order } = await admin.from("orders").select("id,payment_reference,payment_status,payment_method").eq("order_number", orderNumber.toUpperCase()).maybeSingle();
  if (!order || order.payment_method !== "razorpay" || order.payment_reference !== razorpayOrderId || order.payment_status === "cancelled") return NextResponse.json({ error: "Payment does not match this order." }, { status: 409 });
  // Deliberately do not set `paid` here. The signed webhook is authoritative for the final state.
  return NextResponse.json({ ok: true, state: order.payment_status, message: "Signature verified. Final payment confirmation is received securely from the payment provider." }, { headers: { "cache-control": "no-store" } });
}
