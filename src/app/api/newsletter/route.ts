import { NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().trim().email().max(254) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Store signup is not connected yet. Please try again later." }, { status: 503 });
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("newsletter_subscribers").insert({ email: parsed.data.email.toLowerCase() });
  if (error && error.code !== "23505") return NextResponse.json({ error: "We couldn't save your signup. Please try again." }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
