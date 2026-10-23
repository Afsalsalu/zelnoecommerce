import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/server";
import { normalizeWhatsAppAdminSettings, whatsappAdminSettingsSchema } from "@/lib/whatsapp-admin-settings";

function invalidSettings(result: { success: false; error: { issues: Array<{ message?: string; path: PropertyKey[] }> } }) {
  const issue = result.error.issues[0];
  return NextResponse.json({ error: issue?.message || "Check the WhatsApp settings.", field: issue?.path.join(".") || undefined }, { status: 400 });
}

async function authorized() {
  try { return await requireAdmin(); }
  catch { return null; }
}

export async function GET() {
  const access = await authorized();
  if (!access) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { data, error } = await access.supabase.from("site_settings").select("value,is_public").eq("setting_key", "store").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load WhatsApp settings." }, { status: 503 });
  const value = data?.value && typeof data.value === "object" && !Array.isArray(data.value) ? data.value as Record<string, unknown> : {};
  return NextResponse.json({ settings: value, is_public: data?.is_public ?? true });
}

export async function POST(request: Request) {
  const access = await authorized();
  if (!access) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const parsed = whatsappAdminSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidSettings(parsed);

  const admin = createServiceSupabase();
  const existing = await admin.from("site_settings").select("value,is_public").eq("setting_key", "store").maybeSingle();
  if (existing.error) return NextResponse.json({ error: "Could not load the existing store settings." }, { status: 503 });
  const existingValue = existing.data?.value && typeof existing.data.value === "object" && !Array.isArray(existing.data.value) ? existing.data.value as Record<string, unknown> : {};
  const value = { ...existingValue, ...normalizeWhatsAppAdminSettings(parsed.data) };
  const result = await admin.from("site_settings").upsert({ setting_key: "store", value, is_public: existing.data?.is_public ?? true, updated_at: new Date().toISOString() }, { onConflict: "setting_key" }).select("id").single();
  if (result.error) return NextResponse.json({ error: "Could not save the WhatsApp settings." }, { status: 409 });
  return NextResponse.json({ ok: true, id: result.data?.id });
}
