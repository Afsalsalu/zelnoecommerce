import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

export const env = serverSchema.parse(process.env);
function isUsable(value: string | undefined): value is string {
  return Boolean(value && !/YOUR_(?:PROJECT|[A-Z0-9_]+)/.test(value));
}
export const isSupabaseConfigured = isUsable(env.NEXT_PUBLIC_SUPABASE_URL) && isUsable(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const isServiceRoleConfigured = isUsable(env.NEXT_PUBLIC_SUPABASE_URL) && isUsable(env.SUPABASE_SERVICE_ROLE_KEY);
export const isCloudinaryConfigured = isUsable(env.CLOUDINARY_CLOUD_NAME) && isUsable(env.CLOUDINARY_API_KEY) && isUsable(env.CLOUDINARY_API_SECRET);
export const isRazorpayConfigured = isUsable(env.RAZORPAY_KEY_ID) && isUsable(env.RAZORPAY_KEY_SECRET) && isUsable(env.RAZORPAY_WEBHOOK_SECRET);

export function isSecureCookieContext(): boolean {
  // Local development must be able to persist auth cookies over http://localhost.
  // Production deployments should use secure cookies even when a proxy terminates TLS.
  if (process.env.NODE_ENV !== "production") return false;
  const configuredOrigin = env.NEXT_PUBLIC_SITE_URL;
  return configuredOrigin ? new URL(configuredOrigin).protocol === "https:" : true;
}

export function getSupabaseCookieOptions() {
  return { path: "/", sameSite: "lax" as const, secure: isSecureCookieContext() };
}
