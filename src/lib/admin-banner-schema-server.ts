import "server-only";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  HERO_BANNER_SCHEMA_COLUMNS,
  HERO_BANNER_TABLE,
  heroBannerSchemaStatusFromError,
  isHeroBannerSchemaError,
  logHeroBannerDatabaseError,
  type HeroBannerSchemaStatus,
} from "@/lib/admin-banner-schema";

type AdminSupabase = ReturnType<typeof createServiceSupabase>;

export async function checkHeroBannerSchema(admin: AdminSupabase): Promise<HeroBannerSchemaStatus> {
  const select = HERO_BANNER_SCHEMA_COLUMNS.join(",");
  let result = await admin.from(HERO_BANNER_TABLE).select(select).limit(0);
  if (!result.error) return { ready: true };

  logHeroBannerDatabaseError("schema check failed", result.error);
  if (isHeroBannerSchemaError(result.error)) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    result = await admin.from(HERO_BANNER_TABLE).select(select).limit(0);
    if (!result.error) return { ready: true };
    logHeroBannerDatabaseError("schema check retry failed", result.error);
  }
  return heroBannerSchemaStatusFromError(result.error);
}
