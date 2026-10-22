import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { env, isCloudinaryConfigured } from "@/lib/env";

export async function POST() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Administrator access is required." }, { status: 403 }); }
  if (!isCloudinaryConfigured) {
    console.error("[cloudinary] signed upload request rejected", { status: 503, code: "MISSING_CONFIGURATION" });
    return NextResponse.json({ error: "Cloudinary is not configured. Add the required Cloudinary credentials to .env.local and restart the server." }, { status: 503 });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "zelno/products";
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest("hex");
  return NextResponse.json({ cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, timestamp, folder, signature }, { headers: { "cache-control": "no-store" } });
}
