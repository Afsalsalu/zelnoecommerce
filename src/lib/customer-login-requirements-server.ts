import "server-only";

import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, resolveCustomerLoginRequirements, type CustomerLoginRequirements } from "@/lib/customer-login-requirements";

function logSettingsError(error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  const value = error && typeof error === "object" ? error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown } : {};
  console.error("[customer-login-requirements] loading store setting failed", {
    code: value.code,
    message: value.message ?? String(error),
    details: value.details,
    hint: value.hint,
  });
}

export async function getServerCustomerLoginRequirements(): Promise<CustomerLoginRequirements> {
  if (!isSupabaseConfigured) return DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS;
  try {
    const supabase = isServiceRoleConfigured ? createServiceSupabase() : await createServerSupabase();
    const { data, error } = await supabase.from("site_settings").select("value").eq("setting_key", "store").maybeSingle();
    if (error) {
      logSettingsError(error);
      return DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS;
    }
    const value = data?.value && typeof data.value === "object" && !Array.isArray(data.value) ? data.value as Record<string, unknown> : {};
    return resolveCustomerLoginRequirements(value.customer_login_requirements);
  } catch (error) {
    logSettingsError(error);
    return DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS;
  }
}
