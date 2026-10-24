import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { whatsappOrderSchema } from "@/lib/schemas";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import { buildWhatsAppMessage, createWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE_INTRO, normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { supabaseErrorDetails, whatsappOrderErrorMessage, whatsappOrderErrorStatus } from "@/lib/whatsapp-order-errors";
import { recordCheckoutAddressAfterSuccess } from "@/lib/saved-address-server";
import { getServerCustomerLoginRequirements } from "@/lib/customer-login-requirements-server";

function orderNumber() {
  return `ZK-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function logServerError(phase: string, error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  console.error(`[whatsapp-order] ${phase}`, supabaseErrorDetails(error));
}

function failure(error: unknown, status = whatsappOrderErrorStatus(error)) {
  return NextResponse.json({ error: whatsappOrderErrorMessage(error) }, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const parsed = whatsappOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your order details." }, { status: 400, headers: { "cache-control": "no-store" } });
  if (!isSupabaseConfigured || !isServiceRoleConfigured) return failure(new Error("Supabase service-role access is not configured."), 503);
  const requirements = await getServerCustomerLoginRequirements();
  if (requirements.require_login_whatsapp) {
    try {
      const sessionClient = await createServerSupabase();
      const { data } = await sessionClient.auth.getUser();
      if (!data.user) return NextResponse.json({ error: "Please sign in before placing a WhatsApp order.", loginRequired: true }, { status: 401, headers: { "cache-control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "Please sign in before placing a WhatsApp order.", loginRequired: true }, { status: 401, headers: { "cache-control": "no-store" } });
    }
  }

  try {
    return await createWhatsAppOrder(parsed.data);
  } catch (error) {
    logServerError("unexpected failure", error);
    return failure(error, 503);
  }
}

async function createWhatsAppOrder(input: typeof whatsappOrderSchema._output) {
  const admin = createServiceSupabase();
  const { data: setting, error: settingError } = await admin.from("site_settings").select("value").eq("setting_key", "store").maybeSingle();
  if (settingError) {
    logServerError("loading store settings", settingError);
    return failure(settingError, 503);
  }
  const store = setting?.value && typeof setting.value === "object" && !Array.isArray(setting.value) ? setting.value as Record<string, unknown> : {};
  if (store.whatsapp_enabled !== true) return NextResponse.json({ error: "WhatsApp ordering is not available right now." }, { status: 409 });
  let businessNumber: string;
  try { businessNumber = normalizeWhatsAppNumber(String(store.whatsapp_number || "")); }
  catch { return NextResponse.json({ error: "WhatsApp ordering is not configured correctly. Please contact the store." }, { status: 503 }); }

  let userId: string | null = null;
  try { const sessionClient = await createServerSupabase(); const { data } = await sessionClient.auth.getUser(); userId = data.user?.id ?? null; } catch { /* Guest checkout is allowed. */ }

  const { data: requestData, error } = await admin.rpc("create_whatsapp_order_request", {
    p_order_number: orderNumber(),
    p_user_id: userId,
    p_customer: {
      name: input.name, email: input.email, phone: input.phone,
      address: { address_line: input.addressLine, area: input.area, city: input.city, state: input.state, pincode: input.pincode },
      notes: input.notes || "", shipping_method: input.shippingMethod,
    },
    p_items: input.items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
    p_coupon_code: input.couponCode || null,
    p_request_key: input.requestKey,
  });
  if (error) {
    logServerError("creating request", error);
    return failure(error);
  }
  if (!requestData) {
    const missingDataError = new Error("WhatsApp order RPC returned no data.");
    logServerError("creating request", missingDataError);
    return failure(missingDataError, 503);
  }
  await recordCheckoutAddressAfterSuccess(input, userId);

  const id = String((requestData as { id?: string }).id || "");
  const { data: order, error: orderError } = await admin.from("orders").select("id,order_number,customer_name,customer_email,customer_phone,shipping_address,total,whatsapp_message,whatsapp_number_snapshot,placed_at").eq("id", id).eq("order_source", "whatsapp").maybeSingle();
  if (orderError) {
    logServerError("loading created request", orderError);
    return failure(orderError, 503);
  }
  if (!order) return NextResponse.json({ error: "The WhatsApp order request could not be loaded." }, { status: 503 });
  const { data: items, error: itemsError } = await admin.from("order_items").select("product_title_snapshot,variant_snapshot,quantity,unit_price,line_total").eq("order_id", order.id).order("created_at");
  if (itemsError) {
    logServerError("loading created request items", itemsError);
    return failure(itemsError, 503);
  }

  let message = order.whatsapp_message;
  let targetNumber = order.whatsapp_number_snapshot || businessNumber;
  if (!message || !order.whatsapp_number_snapshot) {
    const address = (order.shipping_address ?? {}) as Record<string, string>;
    message = buildWhatsAppMessage({
      intro: typeof store.whatsapp_message_intro === "string" && store.whatsapp_message_intro.trim() ? store.whatsapp_message_intro : DEFAULT_WHATSAPP_MESSAGE_INTRO,
      orderNumber: order.order_number,
      customer: { name: order.customer_name, phone: order.customer_phone, email: order.customer_email },
      address: { addressLine: address.address_line || "", area: address.area || "", city: address.city || "", state: address.state || "", pincode: address.pincode || "" },
      items: (items ?? []).map((item) => {
        const snapshot = (item.variant_snapshot ?? {}) as { name?: string };
        return { title: item.product_title_snapshot, variantName: snapshot.name, quantity: Number(item.quantity), unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total) };
      }),
      total: Number(order.total),
    });
    const { error: updateError } = await admin.from("orders").update({ whatsapp_message: message, whatsapp_number_snapshot: targetNumber }).eq("id", order.id).eq("order_source", "whatsapp");
    if (updateError) {
      logServerError("saving WhatsApp message", updateError);
      return failure(updateError, 503);
    }
  }
  targetNumber = normalizeWhatsAppNumber(targetNumber);
  return NextResponse.json({ ok: true, orderNumber: order.order_number, orderRequestId: order.id, whatsappUrl: createWhatsAppUrl(targetNumber, message), placedAt: order.placed_at }, { status: 201, headers: { "cache-control": "no-store" } });
}
