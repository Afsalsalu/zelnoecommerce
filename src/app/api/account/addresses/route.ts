import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { emailSchema } from "@/lib/schemas";
import { getSavedAddressesForCheckout, logSavedAddressError, recordCheckoutAddressAfterSuccess } from "@/lib/saved-address-server";

const createSchema = z.object({ label: z.string().trim().max(40).default("Home"), full_name: z.string().trim().min(2).max(120), phone: z.string().trim().regex(/^[+0-9 ()-]{8,20}$/), address_line: z.string().trim().min(2).max(240), area: z.string().trim().min(2).max(160), city: z.string().trim().min(2).max(120), state: z.string().trim().min(2).max(120), pincode: z.string().regex(/^[0-9]{6}$/), is_default: z.boolean().default(false) });
const checkoutSaveSchema = z.object({ action: z.literal("record_checkout"), full_name: z.string().trim().min(2).max(120), email: emailSchema, phone: z.string().trim().regex(/^[+0-9 ()-]{8,20}$/), address_line: z.string().trim().min(2).max(240), area: z.string().trim().min(2).max(160), city: z.string().trim().min(2).max(120), state: z.string().trim().min(2).max(120), pincode: z.string().regex(/^[0-9]{6}$/) });

export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Address storage is not configured." }, { status: 503 });
  const client = await createServerSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const result = await getSavedAddressesForCheckout(user.id, user.email || "");
    if (result.error) return NextResponse.json({ error: "Could not load saved addresses. Please try again." }, { status: 503 });
    return NextResponse.json({ addresses: result.addresses, authenticated: true }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    logSavedAddressError("loading saved addresses API", error);
    return NextResponse.json({ error: "Could not load saved addresses. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Address storage is not configured." }, { status: 503 });
  const client = await createServerSupabase(); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  if (body && typeof body === "object" && !Array.isArray(body) && (body as { action?: unknown }).action === "record_checkout") {
    const parsed = checkoutSaveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Check the address fields and pincode." }, { status: 400 });
    await recordCheckoutAddressAfterSuccess({ name: parsed.data.full_name, email: parsed.data.email, phone: parsed.data.phone, addressLine: parsed.data.address_line, area: parsed.data.area, city: parsed.data.city, state: parsed.data.state, pincode: parsed.data.pincode }, user.id);
    return NextResponse.json({ ok: true }, { status: 201, headers: { "cache-control": "private, no-store" } });
  }

  const parsed = createSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "Check the address fields and pincode." }, { status: 400 });
  if (parsed.data.is_default) {
    const { error } = await client.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    if (error) logSavedAddressError("clearing default saved address", error);
  }
  const { error } = await client.from("addresses").insert({ ...parsed.data, user_id: user.id });
  if (error) {
    logSavedAddressError("saving account address", error);
    return NextResponse.json({ error: "Could not save this address." }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Address storage is not configured." }, { status: 503 });
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Address id is invalid." }, { status: 400 });
  const client = await createServerSupabase(); const { data: { user } } = await client.auth.getUser(); if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { error } = await client.from("addresses").delete().eq("id", parsed.data.id).eq("user_id", user.id);
  if (error) {
    logSavedAddressError("removing account address", error);
    return NextResponse.json({ error: "Could not remove this address." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
