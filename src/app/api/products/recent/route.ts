import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slugs = (url.searchParams.get("slugs") ?? "").split(",").map((slug) => slug.trim()).filter((slug) => /^[a-z0-9-]{1,120}$/.test(slug)).slice(0, 4);
  if (!slugs.length || !isSupabaseConfigured) return NextResponse.json({ products: [] }, { headers: { "cache-control": "private, no-store" } });
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("products").select("*,product_images(*),product_variants(*)").in("slug", slugs).eq("status", "published");
  const ordered = slugs.map((slug) => data?.find((item) => item.slug === slug)).filter(Boolean);
  return NextResponse.json({ products: ordered }, { headers: { "cache-control": "private, no-store" } });
}
