import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
const schema = z.object({ full_name: z.string().trim().min(2).max(120), phone: z.string().trim().max(20).optional().or(z.literal("")) });
export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Check your name and phone number." }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Account storage is not configured." }, { status: 503 });
  const supabase = await createServerSupabase(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not update your profile." }, { status: 503 }); return NextResponse.json({ ok: true });
}
