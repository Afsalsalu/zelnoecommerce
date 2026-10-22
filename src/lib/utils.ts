import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...values: ClassValue[]) { return twMerge(clsx(values)); }
export function formatPrice(value: number | string, currency = "INR") {
  const paise = typeof value === "string" ? Number(value || 0) : value;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format((Number.isFinite(paise) ? paise : 0) / 100);
}
export function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().trim().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
export function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.toString() : null; }
  catch { return null; }
}
export function safeInternalPath(value: string | null | undefined, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
