import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, getSupabaseCookieOptions, isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";

export async function createServerSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured. Add the public URL and anon key to your local environment.");
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot mutate cookies; route handlers/actions can. */ }
      },
    },
  });
}

export function createServiceSupabase() {
  if (!isServiceRoleConfigured) throw new Error("Supabase service-role access is not configured on the server.");
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
