import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";

const statusSchema = z.enum(["new", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned", "refunded"]);
const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(["confirm_whatsapp", "cancel_whatsapp"]).optional(),
  order_status: statusSchema.optional(),
  tracking_courier: z.string().trim().max(120).optional(),
  tracking_number: z.string().trim().max(180).optional(),
  note: z.string().trim().max(1000).optional(),
  admin_note: z.string().trim().max(2000).optional(),
}).refine((value) => Boolean(value.action || value.order_status), { message: "Choose an order action." });
const transitions: Record<string, string[]> = { new: ["confirmed", "cancelled"], confirmed: ["packed", "cancelled"], packed: ["shipped", "cancelled"], shipped: ["delivered", "returned"], delivered: ["returned", "refunded"], cancelled: [], returned: ["refunded"], refunded: [] };

function actionError(message: string) {
  if (message.includes("OUT_OF_STOCK") || message.includes("PRODUCT_UNAVAILABLE") || message.includes("VARIANT_UNAVAILABLE")) return "Stock changed before confirmation. The WhatsApp order was not confirmed; review availability and try again.";
  if (message.includes("WHATSAPP_ORDER_CANCELLED")) return "This WhatsApp order is already cancelled.";
  if (message.includes("COUPON")) return "The offer changed before confirmation. Review the order before confirming it.";
  return "Could not complete the WhatsApp order action.";
}

export async function PATCH(request: Request) {
  let actor: string;
  try { const { user } = await requireAdmin(); actor = user.id; }
  catch { return NextResponse.json({ error: "Administrator access is required." }, { status: 403 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the order update." }, { status: 400 });
  const value = parsed.data;
  const admin = createServiceSupabase();

  const { data: current } = await admin.from("orders").select("id,order_status,whatsapp_status,order_source,payment_status,admin_notes,stock_committed_at").eq("id", value.id).maybeSingle();
  if (!current) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (value.action === "confirm_whatsapp") {
    if (current.order_source !== "whatsapp") return NextResponse.json({ error: "This is not a WhatsApp order." }, { status: 409 });
    const { data, error } = await admin.rpc("confirm_whatsapp_order", { p_order_id: value.id, p_admin_user_id: actor });
    if (error || !data) return NextResponse.json({ error: actionError(error?.message ?? "") }, { status: 409 });
    return NextResponse.json({ ok: true, order: { order_status: "confirmed", whatsapp_status: "confirmed", stock_committed_at: (data as { stock_committed_at?: string }).stock_committed_at ?? new Date().toISOString(), payment_status: current.payment_status } });
  }

  if (value.action === "cancel_whatsapp") {
    if (current.order_source !== "whatsapp") return NextResponse.json({ error: "This is not a WhatsApp order." }, { status: 409 });
    if (current.whatsapp_status !== "awaiting_whatsapp_confirmation") return NextResponse.json({ error: "Only awaiting WhatsApp orders can be cancelled from this action." }, { status: 409 });
    const notes = [current.admin_notes, value.admin_note ? `[${new Date().toISOString()}] ${value.admin_note}` : ""].filter(Boolean).join("\n");
    const { data: updated, error } = await admin.from("orders").update({ order_status: "cancelled", whatsapp_status: "cancelled", payment_status: "cancelled", admin_notes: notes }).eq("id", value.id).eq("order_source", "whatsapp").eq("whatsapp_status", "awaiting_whatsapp_confirmation").select("id").maybeSingle();
    if (error || !updated) return NextResponse.json({ error: "The WhatsApp order could not be cancelled." }, { status: 409 });
    const { error: historyError } = await admin.from("order_status_history").insert({ order_id: value.id, previous_status: current.order_status, next_status: "cancelled", note: value.note || "WhatsApp order request cancelled.", changed_by: actor });
    if (historyError) return NextResponse.json({ error: "Order cancelled, but its timeline needs attention." }, { status: 503 });
    return NextResponse.json({ ok: true, order: { order_status: "cancelled", whatsapp_status: "cancelled", payment_status: "cancelled", admin_notes: notes } });
  }

  const nextStatus = value.order_status!;
  if (current.order_source === "whatsapp" && current.whatsapp_status === "awaiting_whatsapp_confirmation") return NextResponse.json({ error: "Confirm or cancel the WhatsApp request before changing fulfilment status." }, { status: 409 });
  if (nextStatus !== current.order_status && !transitions[current.order_status]?.includes(nextStatus)) return NextResponse.json({ error: `The transition from ${current.order_status} to ${nextStatus} is not allowed.` }, { status: 409 });
  const notes = [current.admin_notes, value.admin_note ? `[${new Date().toISOString()}] ${value.admin_note}` : ""].filter(Boolean).join("\n");
  const paymentStatus = nextStatus === "refunded" ? "refunded" : nextStatus === "cancelled" && ["pending", "payment_pending"].includes(current.payment_status) ? "cancelled" : current.payment_status;
  const whatsappStatus = current.order_source === "whatsapp" ? nextStatus === "confirmed" ? "confirmed" : nextStatus === "packed" ? "processing" : nextStatus === "shipped" ? "shipped" : nextStatus === "delivered" ? "delivered" : nextStatus === "cancelled" ? "cancelled" : undefined : undefined;
  const updatePayload: Record<string, unknown> = { order_status: nextStatus, payment_status: paymentStatus, tracking_courier: value.tracking_courier || null, tracking_number: value.tracking_number || null, admin_notes: notes };
  if (whatsappStatus) updatePayload.whatsapp_status = whatsappStatus;
  const { error } = await admin.from("orders").update(updatePayload).eq("id", value.id);
  if (error) return NextResponse.json({ error: "Could not update this order." }, { status: 503 });
  if (nextStatus !== current.order_status) {
    const { error: historyError } = await admin.from("order_status_history").insert({ order_id: value.id, previous_status: current.order_status, next_status: nextStatus, note: value.note || `Status updated to ${nextStatus}.`, changed_by: actor });
    if (historyError) return NextResponse.json({ error: "Order changed, but its timeline needs attention." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, order: { order_status: nextStatus, whatsapp_status: whatsappStatus ?? current.whatsapp_status, payment_status: paymentStatus, tracking_courier: value.tracking_courier || null, tracking_number: value.tracking_number || null, admin_notes: notes } });
}
