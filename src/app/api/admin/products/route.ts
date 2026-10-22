import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { rupeesToPaise } from "@/lib/money";
import { createServiceSupabase } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const mediaSchema = z.object({ id: z.string().uuid().optional(), cloudinary_public_id: z.string().max(255).nullable().optional(), url: z.string().url().refine((value) => value.startsWith("https://"), "Images must use HTTPS.").max(2048), alt_text: z.string().max(255).default(""), sort_order: z.number().int().nonnegative(), width: z.number().int().positive().nullable().optional(), height: z.number().int().positive().nullable().optional() });
const moneySchema = z.union([z.number().finite().nonnegative(), z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/)]);
const variantSchema = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(120), option_values: z.record(z.string(), z.string()).default({}), sku: z.string().trim().max(120).nullable().optional(), price: moneySchema, compare_at_price: moneySchema.nullable().optional(), stock_quantity: z.number().int().min(0), stock_status: z.enum(["in_stock", "out_of_stock", "continue_selling"]), is_default: z.boolean().default(false), sort_order: z.number().int().nonnegative() });
const blockSchema = z.object({ id: z.string().max(80).optional(), block_type: z.enum(["heading", "rich_text", "full_width_image", "two_image_gallery", "image_with_text", "video_embed", "feature_list", "specification_table", "comparison", "faq", "divider"]), title: z.string().max(200).default(""), payload: z.record(z.string(), z.unknown()).default({}), sort_order: z.number().int().nonnegative(), is_visible: z.boolean().default(true) });
const productSchema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(200), slug: z.string().trim().max(180).optional(), sku: z.string().trim().max(120).nullable().optional(), category_id: z.string().uuid().nullable().optional(), short_description: z.string().max(500).default(""), description: z.string().max(12000).default(""), status: z.enum(["draft", "published"]), price: moneySchema, compare_at_price: moneySchema.nullable().optional(), stock_quantity: z.number().int().min(0), continue_selling: z.boolean().default(false), badge: z.string().max(60).nullable().optional(), is_bestseller: z.boolean().default(false), seo_title: z.string().max(180).nullable().optional(), seo_description: z.string().max(320).nullable().optional(), seo_image_url: z.string().url().nullable().optional(), video_url: z.string().url().nullable().optional(), related_product_ids: z.array(z.string().uuid()).max(20).default([]), tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]), product_images: z.array(mediaSchema).max(20).default([]), product_variants: z.array(variantSchema).min(1).max(60), product_content_blocks: z.array(blockSchema).max(100).default([]) });
type PreparedVariant = Omit<z.infer<typeof variantSchema>, "price" | "compare_at_price"> & { price: number; compare_at_price: number | null };

async function unauthorized() {
  try { await requireAdmin(); return null; }
  catch { return NextResponse.json({ error: "Administrator access is required." }, { status: 403 }); }
}

export async function POST(request: Request) {
  const denied = await unauthorized();
  if (denied) return denied;
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Check the product fields." }, { status: 400 });
  const v = parsed.data;
  const slug = slugify(v.slug || v.title);
  if (!slug) return NextResponse.json({ error: "Product needs a URL-safe name." }, { status: 400 });
  let productPrice: number;
  let productCompare: number | null;
  let variants: PreparedVariant[];
  try {
    productPrice = rupeesToPaise(v.price, "Product price");
    productCompare = v.compare_at_price == null ? null : rupeesToPaise(v.compare_at_price, "Compare-at price");
    variants = v.product_variants.map((item) => ({ ...item, price: rupeesToPaise(item.price, "Variant price"), compare_at_price: item.compare_at_price == null ? null : rupeesToPaise(item.compare_at_price, "Variant compare-at price") }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Product prices are invalid." }, { status: 400 });
  }
  if (productCompare !== null && productCompare < productPrice) return NextResponse.json({ error: "Compare-at price must be at least the product price." }, { status: 400 });
  if (variants.some((item) => item.compare_at_price !== null && item.compare_at_price < item.price)) return NextResponse.json({ error: "Each compare-at price must be at least its variant price." }, { status: 400 });
  const admin = createServiceSupabase();
  const now = new Date().toISOString();
  const { data: existing } = v.id ? await admin.from("products").select("id,published_at").eq("id", v.id).maybeSingle() : { data: null };
  const main = { category_id: v.category_id || null, title: v.title, slug, sku: v.sku || null, short_description: v.short_description, description: v.description, status: v.status, price: productPrice, compare_at_price: productCompare, stock_quantity: v.stock_quantity, continue_selling: v.continue_selling, badge: v.badge || null, is_bestseller: v.is_bestseller, seo_title: v.seo_title || null, seo_description: v.seo_description || null, seo_image_url: v.seo_image_url || null, video_url: v.video_url || null, related_product_ids: v.related_product_ids, published_at: v.status === "published" ? (existing?.published_at || now) : null };
  const saved = v.id ? await admin.from("products").update(main).eq("id", v.id).select("id").single() : await admin.from("products").insert(main).select("id").single();
  if (saved.error || !saved.data) return NextResponse.json({ error: "Could not save product. Check that its slug and SKU are unique." }, { status: 409 });
  const productId = saved.data.id;
  for (const table of ["product_images", "product_variants", "product_content_blocks", "product_tag_map"] as const) {
    const { error } = await admin.from(table).delete().eq("product_id", productId);
    if (error) return NextResponse.json({ error: "Product saved, but its related content needs attention." }, { status: 503 });
  }
  const images = v.product_images.map((item, index) => ({ ...item, product_id: productId, sort_order: index }));
  if (images.length) {
    const { error } = await admin.from("product_images").insert(images.map(({ id, ...rest }) => rest));
    if (error) return NextResponse.json({ error: "Product saved, but its images could not be linked." }, { status: 503 });
  }
  const hasDefault = variants.some((item) => item.is_default);
  const storedVariants = variants.map((item, index) => ({ ...item, product_id: productId, sort_order: index, is_default: hasDefault ? item.is_default : index === 0, sku: item.sku || null }));
  const { error: variantError } = await admin.from("product_variants").insert(storedVariants.map(({ id, ...rest }) => rest));
  if (variantError) return NextResponse.json({ error: "Product saved, but its variants could not be stored." }, { status: 503 });
  if (v.product_content_blocks.length) {
    const blocks = v.product_content_blocks.map((item, index) => ({ product_id: productId, block_type: item.block_type, title: item.title, payload: item.payload, sort_order: index, is_visible: item.is_visible }));
    const { error } = await admin.from("product_content_blocks").insert(blocks);
    if (error) return NextResponse.json({ error: "Product saved, but its content blocks could not be stored." }, { status: 503 });
  }
  for (const name of v.tags) {
    const tagSlug = slugify(name);
    if (!tagSlug) continue;
    const { data: tag } = await admin.from("tags").upsert({ name, slug: tagSlug }, { onConflict: "slug" }).select("id").single();
    if (tag) await admin.from("product_tag_map").upsert({ product_id: productId, tag_id: tag.id }, { onConflict: "product_id,tag_id" });
  }
  return NextResponse.json({ ok: true, id: productId }, { status: 201 });
}

export async function DELETE(request: Request) {
  const denied = await unauthorized();
  if (denied) return denied;
  const parsed = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Product id is invalid." }, { status: 400 });
  const { error } = await createServiceSupabase().from("products").delete().eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Could not delete product. Existing orders may refer to it." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
