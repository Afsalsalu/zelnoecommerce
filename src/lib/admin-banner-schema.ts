export const HERO_BANNER_TABLE = "homepage_banners" as const;
export const HERO_OVERLAY_MIGRATION = "20261023140000_hero_banner_overlays.sql" as const;

export const HERO_BANNER_SCHEMA_COLUMNS = [
  "id",
  "banner_type",
  "heading",
  "description",
  "cta_label",
  "cta_href",
  "desktop_image_url",
  "mobile_image_url",
  "image_alt",
  "offer_badge",
  "alignment",
  "starts_at",
  "ends_at",
  "overlay_enabled",
  "overlay_color",
  "overlay_opacity",
  "overlay_direction",
  "is_active",
  "sort_order",
] as const;

export const HERO_OVERLAY_COLUMNS = [
  "overlay_enabled",
  "overlay_color",
  "overlay_opacity",
  "overlay_direction",
] as const;

export type HeroBannerSchemaField = (typeof HERO_BANNER_SCHEMA_COLUMNS)[number];
export type SupabaseDatabaseError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  constraint?: string;
  status?: number;
};

export type HeroBannerSchemaStatus =
  | { ready: true }
  | {
      ready: false;
      kind: "missing-schema" | "schema-cache" | "permission" | "database";
      field?: HeroBannerSchemaField;
      message: string;
    };

const fieldLabels: Partial<Record<HeroBannerSchemaField, string>> = {
  heading: "Heading",
  description: "Description",
  cta_label: "Button label",
  cta_href: "Button path",
  desktop_image_url: "Desktop image URL",
  mobile_image_url: "Mobile image URL",
  image_alt: "Image alt text",
  overlay_enabled: "Overlay enabled",
  overlay_color: "Overlay color",
  overlay_opacity: "Overlay opacity",
  overlay_direction: "Overlay direction",
  sort_order: "Display order",
};

function databaseText(error: SupabaseDatabaseError) {
  return [error.constraint, error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
}

export function heroBannerDatabaseField(error: SupabaseDatabaseError): HeroBannerSchemaField | undefined {
  const text = databaseText(error);
  const quotedColumn = text.match(/(?:column|field)\s+["']([a-z_][a-z0-9_]*)["']/i)?.[1]
    || text.match(/["']([a-z_][a-z0-9_]*)["']\s+column/i)?.[1];
  if (quotedColumn && (HERO_BANNER_SCHEMA_COLUMNS as readonly string[]).includes(quotedColumn)) return quotedColumn as HeroBannerSchemaField;
  return HERO_BANNER_SCHEMA_COLUMNS.find((field) => text.includes(field));
}

export function isHeroBannerSchemaError(error: SupabaseDatabaseError) {
  return ["PGRST204", "PGRST205", "42703", "42P01"].includes(error.code || "")
    || /schema cache|does not exist|could not find the .* column/i.test(databaseText(error));
}

export function isHeroBannerPermissionError(error: SupabaseDatabaseError) {
  return ["401", "403", "42501"].includes(error.code || "")
    || error.status === 401
    || error.status === 403
    || /invalid api key|invalid jwt|permission denied|not authorized|unauthorized/i.test(databaseText(error));
}

export function logHeroBannerDatabaseError(operation: string, error: SupabaseDatabaseError) {
  if (process.env.NODE_ENV === "production") return;
  // Keep this a warning so recoverable local schema diagnostics do not become a blocking Next.js overlay.
  console.warn(`[admin-content:hero-banner] ${operation}`, {
    table: HERO_BANNER_TABLE,
    fields: HERO_BANNER_SCHEMA_COLUMNS,
    code: error.code,
    status: error.status,
    message: error.message,
    details: error.details,
    hint: error.hint,
    constraint: error.constraint,
  });
}

function migrationForField(field?: HeroBannerSchemaField) {
  if (field && (HERO_OVERLAY_COLUMNS as readonly string[]).includes(field)) return HERO_OVERLAY_MIGRATION;
  if (field && ["banner_type", "offer_badge", "alignment", "starts_at", "ends_at"].includes(field)) return "0002_offer_banners.sql";
  return "0001_initial_schema.sql";
}

export function heroBannerSchemaStatusFromError(error: SupabaseDatabaseError): HeroBannerSchemaStatus {
  const field = heroBannerDatabaseField(error);
  if (isHeroBannerPermissionError(error)) {
    return { ready: false, kind: "permission", field, message: "Admin database access configuration issue" };
  }
  if (isHeroBannerSchemaError(error)) {
    const migration = migrationForField(field);
    const column = field ? ` required column \`${field}\`` : " required columns";
    const cache = error.code === "PGRST204" || /schema cache/i.test(databaseText(error));
    return {
      ready: false,
      kind: cache ? "schema-cache" : "missing-schema",
      field,
      message: cache
        ? `Supabase's schema cache does not expose${column}. Refresh the schema cache after applying ${migration}.`
        : `The hero banner schema is missing${column}. Apply ${migration} in Supabase.`,
    };
  }
  return { ready: false, kind: "database", field, message: "The hero banner schema could not be checked. Please try again." };
}

export function bannerDatabaseErrorMessage(error: SupabaseDatabaseError) {
  const field = heroBannerDatabaseField(error);
  const label = (field ? fieldLabels[field] : undefined) || "Hero banner";
  if (isHeroBannerSchemaError(error) || isHeroBannerPermissionError(error)) {
    const status = heroBannerSchemaStatusFromError(error);
    return status.ready ? "The hero banner schema could not be checked. Please try again." : status.message;
  }
  if (error.code === "23505") return field === "sort_order" ? "Display order already used." : `${label} must be unique.`;
  if (error.code === "23502") return `${label} is required.`;
  if (error.code === "23514") return field === "overlay_opacity" ? "Overlay opacity must be between 0% and 80%." : `${label} has an invalid value.`;
  return field ? `${label} could not be saved. Check this value.` : "Could not save this hero banner. Check the highlighted fields.";
}
