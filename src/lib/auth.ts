import "server-only";
import { forbidden, redirect } from "next/navigation";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireCustomer() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return user;
}

export async function requireAdmin() {
  if (!isSupabaseConfigured) redirect("/login?next=/admin");
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isServiceRoleConfigured) redirect("/account");
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (error || data?.role !== "admin") forbidden();
  return { user, supabase };
}
