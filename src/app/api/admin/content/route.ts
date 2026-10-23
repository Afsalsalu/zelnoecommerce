import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { HOMEPAGE_DEFAULT_SECTIONS } from "@/lib/homepage-sections";
import { createServiceSupabase } from "@/lib/supabase/server";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";
import { validateActionButtonStyles } from "@/lib/action-button-styles";

const uuid = z.string().uuid();
const relativePath = z.string().max(250).refine((value) => value.startsWith("/") && !value.startsWith("//"), "Use a site-relative path.");
const optionalEmail = z.string().trim().max(180).refine((value) => !value || z.email().safeParse(value).success, "Use a valid email address.");
const optionalUrl = z.string().trim().max(500).refine((value) => !value || /^https:\/\//.test(value), "Use an HTTPS URL.");
const optionalDestination = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a site-relative path or HTTPS URL.");
const optionalScheduleDate = z.string().trim().max(80).refine((value) => !value || Number.isFinite(Date.parse(value)), "Use a valid schedule date.");
const socialLinks = z.record(z.string().trim().min(1).max(50), optionalUrl).optional();
const actionButtonStyles = z.unknown().optional().superRefine((value, context) => {
  if (value === undefined) return;
  const result = validateActionButtonStyles(value);
  if (!result.valid) context.addIssue({ code: "custom", path: result.field ? [result.field] : [], message: result.message });
});
const storeSettingsSchema = z.object({
  store_name: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(300).optional(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).optional(),
  logo_url: optionalUrl.optional(),
  contact_email: optionalEmail.optional(),
  contact_phone: z.string().trim().max(60).optional(),
  whatsapp_number: z.string().trim().max(60).optional(),
  shipping_fee: z.number().int().nonnegative().optional(),
  free_shipping_minimum: z.number().int().nonnegative().optional(),
  cod_enabled: z.boolean().optional(),
  delivery_estimate: z.string().trim().max(180).optional(),
  return_summary: z.string().trim().max(500).optional(),
  seo_title: z.string().trim().max(180).optional(),
  seo_description: z.string().trim().max(320).optional(),
  social_links: socialLinks,
  whatsapp_enabled: z.boolean().optional(),
  whatsapp_product_enabled: z.boolean().optional(),
  whatsapp_cart_enabled: z.boolean().optional(),
  whatsapp_checkout_enabled: z.boolean().optional(),
  whatsapp_product_button_label: z.string().trim().min(1).max(80).optional(),
  whatsapp_order_button_label: z.string().trim().min(1).max(80).optional(),
  whatsapp_message_intro: z.string().trim().min(1).max(240).optional(),
  whatsapp_support_enabled: z.boolean().optional(),
  whatsapp_support_message: z.string().trim().max(240).optional(),
  product_action_button_styles: actionButtonStyles,
}).strict().superRefine((value, context) => {
  if (value.whatsapp_number) {
    try { normalizeWhatsAppNumber(value.whatsapp_number); }
    catch (error) { context.addIssue({ code: "custom", path: ["whatsapp_number"], message: error instanceof Error ? error.message : "Enter a valid WhatsApp number." }); }
  }
  if ((value.whatsapp_enabled || value.whatsapp_support_enabled) && !value.whatsapp_number) context.addIssue({ code: "custom", path: ["whatsapp_number"], message: "A WhatsApp business number is required when WhatsApp ordering or support is enabled." });
  if (value.whatsapp_support_enabled && !value.whatsapp_support_message) context.addIssue({ code: "custom", path: ["whatsapp_support_message"], message: "A support message is required when the floating support button is enabled." });
});
const footerSettingsSchema = z.object({ description: z.string().trim().max(1200).optional(), newsletter_enabled: z.boolean().optional(), social_links: socialLinks }).strict();
const navigationSettingsSchema = z.object({ links: z.array(z.object({ label: z.string().trim().min(1).max(80), href: relativePath })).max(30) }).strict();
const schemas = {
  section: z.object({ section_key: z.string().trim().regex(/^[a-z][a-z0-9_]{1,60}$/), title: z.string().trim().max(180), content: z.record(z.string(), z.unknown()), sort_order: z.number().int(), is_visible: z.boolean() }),
  banner: z.object({ banner_type: z.enum(["hero", "offer"]).default("hero"), heading: z.string().max(180), description: z.string().max(1200), cta_label: z.string().max(100), cta_href: relativePath, desktop_image_url: z.string().url().nullable(), mobile_image_url: z.string().url().nullable(), image_alt: z.string().max(255), offer_badge: z.string().trim().max(120).nullable().optional(), alignment: z.enum(["left", "right"]).default("left"), starts_at: optionalScheduleDate.nullable().optional(), ends_at: optionalScheduleDate.nullable().optional(), sort_order: z.number().int(), is_active: z.boolean() }),
  brand: z.object({ name: z.string().trim().min(1).max(120), logo_url: z.string().url(), destination_url: optionalDestination.nullable().optional(), alt_text: z.string().trim().min(1).max(255), sort_order: z.number().int(), is_active: z.boolean() }),
  faq: z.object({ question: z.string().trim().min(2).max(300), answer: z.string().trim().min(2).max(5000), sort_order: z.number().int(), is_published: z.boolean() }),
  testimonial: z.object({ customer_name: z.string().trim().min(2).max(120), quote: z.string().trim().min(5).max(1500), rating: z.number().int().min(1).max(5), is_approved: z.boolean(), sort_order: z.number().int() }),
  page: z.object({ title: z.string().trim().min(2).max(180), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), body: z.string().max(30000), seo_title: z.string().max(180).nullable(), seo_description: z.string().max(320).nullable(), is_published: z.boolean() }),
  setting: z.object({ setting_key: z.enum(["store", "footer", "navigation"]), value: z.unknown(), is_public: z.boolean() }),
  enquiry: z.object({ status: z.enum(["new", "read", "replied"]) }),
} as const;

const requestSchema = z.object({
  entity: z.enum(["section", "banner", "brand", "faq", "testimonial", "page", "setting", "enquiry", "homepage_defaults"]),
  id: uuid.optional(),
  data: z.unknown(),
});

async function authorized() {
  try {
    const { user } = await requireAdmin();
    return user;
  } catch {
    return null;
  }
}

function invalidFields(result: { success: false; error: z.ZodError }) {
  const issue = result.error.issues[0];
  return NextResponse.json({ error: issue?.message || "Check the content fields.", field: issue?.path.join(".") || undefined }, { status: 400 });
}

function invalidId(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const user = await authorized();
  if (!user) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Content type, id, or payload is invalid." }, { status: 400 });
  const { entity, id, data } = body.data;
  if (id && !uuid.safeParse(id).success) return invalidId("Content id is invalid.");

  const admin = createServiceSupabase();
  switch (entity) {
    case "homepage_defaults": {
      const keys = HOMEPAGE_DEFAULT_SECTIONS.map((section) => section.section_key);
      const existing = await admin.from("homepage_sections").select("section_key").in("section_key", keys);
      if (existing.error) return NextResponse.json({ error: "Could not check homepage defaults." }, { status: 409 });

      const existingKeys = new Set((existing.data ?? []).map((section) => section.section_key));
      const missing = HOMEPAGE_DEFAULT_SECTIONS.filter((section) => !existingKeys.has(section.section_key));
      if (missing.length) {
        const result = await admin.from("homepage_sections").insert(missing).select("id");
        if (result.error) return NextResponse.json({ error: "Could not initialize homepage defaults." }, { status: 409 });
      }
      return NextResponse.json({ ok: true, created: missing.length });
    }
    case "section": {
      const parsed = schemas.section.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      const result = id ? await admin.from("homepage_sections").update(parsed.data).eq("id", id).select("id").single() : await admin.from("homepage_sections").insert(parsed.data).select("id").single();
      if (result.error) return NextResponse.json({ error: "Could not save this content. Check required fields and unique keys." }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
    case "banner": {
      const parsed = schemas.banner.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      if (parsed.data.banner_type === "offer" && !parsed.data.desktop_image_url) return NextResponse.json({ error: "Offer banners require a desktop image.", field: "desktop_image_url" }, { status: 400 });
      if (parsed.data.starts_at && parsed.data.ends_at && Date.parse(parsed.data.starts_at) > Date.parse(parsed.data.ends_at)) return NextResponse.json({ error: "The offer end date must be after the start date.", field: "ends_at" }, { status: 400 });
      const result = id ? await admin.from("homepage_banners").update(parsed.data).eq("id", id).select("id").single() : await admin.from("homepage_banners").insert(parsed.data).select("id").single();
      if (result.error) return NextResponse.json({ error: "Could not save this content. Check required fields and unique keys." }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
    case "brand": {
      const parsed = schemas.brand.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      const result = id ? await admin.from("homepage_brands").update(parsed.data).eq("id", id).select("id").single() : await admin.from("homepage_brands").insert(parsed.data).select("id").single();
      if (result.error) return NextResponse.json({ error: "Could not save this brand. Check the logo and required fields." }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
    case "faq": {
      const parsed = schemas.faq.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      const result = id ? await admin.from("faqs").update(parsed.data).eq("id", id).select("id").single() : await admin.from("faqs").insert(parsed.data).select("id").single();
      if (result.error) return NextResponse.json({ error: "Could not save this content. Check required fields and unique keys." }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
    case "testimonial": {
      const parsed = schemas.testimonial.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      const result = id ? await admin.from("testimonials").update(parsed.data).eq("id", id).select("id").single() : await admin.from("testimonials").insert(parsed.data).select("id").single();
      if (result.error) return NextResponse.json({ error: "Could not save this content. Check required fields and unique keys." }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
    case "page": {
      const parsed = schemas.page.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      const payload = { ...parsed.data, updated_by: user.id };
      const result = id ? await admin.from("site_pages").update(payload).eq("id", id).select("id").single() : await admin.from("site_pages").insert(payload).select("id").single();
      if (result.error) return NextResponse.json({ error: result.error.code === "23505" ? "A page with this slug already exists." : "Could not save this page.", field: result.error.code === "23505" ? "slug" : undefined }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
    case "setting": {
      const parsed = schemas.setting.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      const valueSchema = parsed.data.setting_key === "store" ? storeSettingsSchema : parsed.data.setting_key === "footer" ? footerSettingsSchema : navigationSettingsSchema;
      const value = valueSchema.safeParse(parsed.data.value);
      if (!value.success) return invalidFields(value);
      const rawValue = value.data as Record<string, unknown>;
      const buttonStyles = rawValue.product_action_button_styles === undefined ? undefined : validateActionButtonStyles(rawValue.product_action_button_styles);
      let existingStoreValue: Record<string, unknown> = {};
      if (parsed.data.setting_key === "store") {
        const existing = await admin.from("site_settings").select("value").eq("setting_key", "store").maybeSingle();
        if (existing.error) return NextResponse.json({ error: "Could not load the existing store settings." }, { status: 503 });
        if (existing.data?.value && typeof existing.data.value === "object" && !Array.isArray(existing.data.value)) existingStoreValue = existing.data.value as Record<string, unknown>;
      }
      const normalizedValue = parsed.data.setting_key === "store" && value.data && typeof value.data === "object"
        ? {
          ...rawValue,
          whatsapp_number: rawValue.whatsapp_number ? normalizeWhatsAppNumber(String(rawValue.whatsapp_number)) : "",
          ...(buttonStyles?.valid ? { product_action_button_styles: buttonStyles.data } : {}),
        }
        : value.data;
      const valueToSave = parsed.data.setting_key === "store" && normalizedValue && typeof normalizedValue === "object" && !Array.isArray(normalizedValue) ? { ...existingStoreValue, ...(normalizedValue as Record<string, unknown>) } : normalizedValue;
      const result = await admin.from("site_settings").upsert({ ...parsed.data, value: valueToSave, updated_at: new Date().toISOString() }, { onConflict: "setting_key" }).select("id").single();
      if (result.error) return NextResponse.json({ error: "Could not save this setting." }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
    case "enquiry": {
      if (!id) return invalidId("Enquiry id is required.");
      const parsed = schemas.enquiry.safeParse(data);
      if (!parsed.success) return invalidFields(parsed);
      const result = await admin.from("contact_enquiries").update(parsed.data).eq("id", id).select("id").single();
      if (result.error) return NextResponse.json({ error: "Could not update this enquiry." }, { status: 409 });
      return NextResponse.json({ ok: true, id: result.data?.id }, { status: 201 });
    }
  }
}

export async function DELETE(request: Request) {
  const user = await authorized();
  if (!user) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = z.object({ entity: z.enum(["section", "banner", "brand", "faq", "testimonial", "page"]), id: uuid }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Content type or id is invalid." }, { status: 400 });
  const admin = createServiceSupabase();
  const result = body.data.entity === "section"
    ? await admin.from("homepage_sections").delete().eq("id", body.data.id)
    : body.data.entity === "banner"
      ? await admin.from("homepage_banners").delete().eq("id", body.data.id)
      : body.data.entity === "brand"
        ? await admin.from("homepage_brands").delete().eq("id", body.data.id)
      : body.data.entity === "faq"
        ? await admin.from("faqs").delete().eq("id", body.data.id)
        : body.data.entity === "testimonial"
          ? await admin.from("testimonials").delete().eq("id", body.data.id)
          : await admin.from("site_pages").delete().eq("id", body.data.id);
  if (result.error) return NextResponse.json({ error: "Could not remove this content." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
