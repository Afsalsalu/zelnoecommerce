import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

const diagnosticSchema = z.object({
  status: z.number().int().min(100).max(599),
  code: z.string().trim().regex(/^[A-Za-z0-9_.-]{1,80}$/).optional(),
});

export async function POST(request: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Administrator access is required." }, { status: 403 }); }
  const parsed = diagnosticSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Cloudinary diagnostic data is invalid." }, { status: 400 });
  console.error("[cloudinary] upload response", { status: parsed.data.status, code: parsed.data.code || "UNKNOWN" });
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}
