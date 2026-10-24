import type { Product } from "@/lib/types";

export const WISHLIST_STORAGE_KEY = "zelno-wishlist-v1";

export type WishlistEntry = {
  id: string | null;
  product_id: string | null;
  source_key?: string | null;
  created_at: string | null;
  product: Product | null;
};

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isProductSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120;
}

export function isWishlistKey(value: string) {
  return isUuid(value) || isProductSlug(value);
}

export function normalizeWishlistKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(isWishlistKey))].slice(0, 200);
}

export function readWishlistKeys() {
  if (typeof window === "undefined") return [];
  try { return normalizeWishlistKeys(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) ?? "[]")); }
  catch { return []; }
}

export function writeWishlistKeys(keys: string[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalizeWishlistKeys(keys))); }
  catch { /* Keep the in-memory wishlist usable when storage is unavailable. */ }
}

export function removeWishlistStorage() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(WISHLIST_STORAGE_KEY); }
  catch { /* Ignore storage cleanup failures. */ }
}

export function toggleWishlistKey(keys: string[], key: string) {
  const normalized = key.trim();
  const current = normalizeWishlistKeys(keys);
  return current.includes(normalized) ? current.filter((item) => item !== normalized) : [...current, normalized];
}

export function wishlistEntryKey(entry: Pick<WishlistEntry, "id" | "product_id" | "source_key">) {
  return entry.product_id || entry.source_key || entry.id || "";
}

export function localWishlistEntries(keys: string[]): WishlistEntry[] {
  return normalizeWishlistKeys(keys).map((key) => ({
    id: null,
    product_id: isUuid(key) ? key : null,
    source_key: key,
    created_at: null,
    product: null,
  }));
}
