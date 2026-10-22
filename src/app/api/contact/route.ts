import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Contact is not connected yet. Please use the store email." }, { status: 503 });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("contact_enquiries").insert({ ...parsed.data, phone: parsed.data.phone || "", status: "new" });
  if (error) return NextResponse.json({ error: "We couldn't send your message. Please try again later." }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
