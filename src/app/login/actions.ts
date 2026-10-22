"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import {
  authenticateWithPassword,
  getLoginRedirectPath,
  parseLoginFormData,
  type LoginActionState,
} from "@/lib/auth-flow";
import { createServerSupabase } from "@/lib/supabase/server";

export async function loginAction(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const parsed = parseLoginFormData(formData);
  if (!parsed.ok) return { error: parsed.error };
  if (!isSupabaseConfigured) return { error: "Sign in is not configured yet. Please try again later." };

  try {
    const supabase = await createServerSupabase();
    const failure = await authenticateWithPassword(supabase, parsed.value);
    if (failure) return failure;
  } catch {
    return { error: "Sign in is temporarily unavailable. Please try again later." };
  }

  redirect(getLoginRedirectPath(parsed.value.nextPath));
}
