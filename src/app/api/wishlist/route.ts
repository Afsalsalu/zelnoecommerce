import { NextResponse } from "next/server";
import { z } from "zod";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import { isProductSlug, isUuid, isWishlistKey, localWishlistEntries, normalizeWishlistKeys, type WishlistEntry } from "@/lib/wishlist";
import { PRODUCT_JOIN } from "@/lib/store";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/types";
import { getServerCustomerLoginRequirements } from "@/lib/customer-login-requirements-server";

const keysSchema = z.object({ productKeys: z.array(z.string().trim()).max(200) });
type WishlistRow = { id: string; product_id: string | null; created_at: string };

function logWishlistError(operation: string, error: unknown, fields: string[]) {
  if (process.env.NODE_ENV !== "development") return;
  const value = error && typeof error === "object" ? error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown } : {};
  console.warn("[wishlist] Supabase operation failed", JSON.stringify({
    operation,
    table: "wishlist_items",
    fields,
    code: typeof value.code === "string" ? value.code : null,
    message: typeof value.message === "string" ? value.message : String(error ?? "Unknown error"),
    details: typeof value.details === "string" ? value.details : null,
    hint: typeof value.hint === "string" ? value.hint : null,
  }));
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

async function queryPublishedProducts(supabase: SupabaseClient, keys: string[]) {
  const ids = keys.filter(isUuid);
  const slugs = keys.filter(isProductSlug);
  const results = await Promise.all([
    ids.length ? supabase.from("products").select(PRODUCT_JOIN).eq("status", "published").in("id", ids) : Promise.resolve({ data: [], error: null }),
    slugs.length ? supabase.from("products").select(PRODUCT_JOIN).eq("status", "published").in("slug", slugs) : Promise.resolve({ data: [], error: null }),
  ]);
  const error = results.find((result) => result.error)?.error;
  if (error) return { products: [] as Product[], error };
  return { products: results.flatMap((result) => (result.data ?? []) as unknown as Product[]), error: null };
}

async function getPublishedProducts(supabase: SupabaseClient, keys: string[]) {
  const result = await queryPublishedProducts(supabase, keys);
  // Some existing deployments revoke anon execution on public.is_admin(), even though
  // published products are public. Product lookup remains server-only and is limited
  // to published rows; customer-owned wishlist rows always use the session client.
  if (result.error && result.error.code === "42501" && isServiceRoleConfigured) {
    try { return await queryPublishedProducts(createServiceSupabase(), keys); }
    catch (error) { logWishlistError("read-public-products-service-fallback", error, ["products.id", "products.slug", "products.status", PRODUCT_JOIN]); }
  }
  return result;
}

function entriesFromRows(rows: WishlistRow[], products: Product[]): WishlistEntry[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  return rows.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    source_key: row.product_id,
    created_at: row.created_at,
    product: row.product_id ? productsById.get(row.product_id) ?? null : null,
  }));
}

async function readOwnedEntries(supabase: SupabaseClient, userId: string) {
  const { data: rows, error } = await supabase
    .from("wishlist_items")
    .select("id,product_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    logWishlistError("read", error, ["id", "product_id", "created_at", "user_id"]);
    return { entries: [] as WishlistEntry[], error };
  }
  const typedRows = (rows ?? []) as WishlistRow[];
  const ids = typedRows.flatMap((row) => row.product_id && isUuid(row.product_id) ? [row.product_id] : []);
  if (!ids.length) return { entries: entriesFromRows(typedRows, []), error: null };
  const { data: products, error: productsError } = await supabase.from("products").select(PRODUCT_JOIN).eq("status", "published").in("id", ids);
  if (productsError) {
    logWishlistError("read-products", productsError, ["products.id", "products.status", PRODUCT_JOIN]);
    return { entries: [] as WishlistEntry[], error: productsError };
  }
  return { entries: entriesFromRows(typedRows, (products ?? []) as unknown as Product[]), error: null };
}

async function getAuthenticatedUser() {
  if (!isSupabaseConfigured) return { user: null, supabase: null };
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function GET(request: Request) {
  const keys = normalizeWishlistKeys(new URL(request.url).searchParams.get("keys")?.split(",") ?? []);
  if (!isSupabaseConfigured) return response({ authenticated: false, items: localWishlistEntries(keys) });
  const { user, supabase } = await getAuthenticatedUser();
  if (user && supabase) {
    const result = await readOwnedEntries(supabase, user.id);
    if (result.error) return response({ error: "We couldn't load your wishlist. Please try again." }, 503);
    return response({ authenticated: true, items: result.entries });
  }
  const { products, error } = await getPublishedProducts(supabase ?? await createServerSupabase(), keys);
  if (error) {
    logWishlistError("read-guest-products", error, ["products.id", "products.slug", "products.status", PRODUCT_JOIN]);
    return response({ error: "We couldn't load your wishlist. Please try again." }, 503);
  }
  const productsByKey = new Map<string, Product>();
  for (const product of products) { productsByKey.set(product.id, product); productsByKey.set(product.slug, product); }
  return response({ authenticated: false, items: keys.map((key) => ({ id: null, product_id: isUuid(key) ? key : productsByKey.get(key)?.id ?? null, source_key: key, created_at: null, product: productsByKey.get(key) ?? null })) });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) return response({ error: "Wishlist sync is not configured yet." }, 503);
  const parsed = keysSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Your wishlist data is invalid. Please refresh and try again." }, 400);
  const productKeys = normalizeWishlistKeys(parsed.data.productKeys);
  if (productKeys.length !== parsed.data.productKeys.length || productKeys.some((key) => !isWishlistKey(key))) return response({ error: "Your wishlist contains an invalid product." }, 400);
  const { user, supabase } = await getAuthenticatedUser();
  const requirements = await getServerCustomerLoginRequirements();
  if (!user || !supabase) return response({ error: "Please sign in to sync your wishlist.", loginRequired: requirements.require_login_wishlist }, 401);
  const { products, error: productsError } = await getPublishedProducts(supabase, productKeys);
  if (productsError) {
    logWishlistError("sync-products", productsError, ["products.id", "products.slug", "products.status", PRODUCT_JOIN]);
    return response({ error: "We couldn't sync your wishlist. Please try again." }, 503);
  }
  const byKey = new Map<string, Product>();
  for (const product of products) { byKey.set(product.id, product); byKey.set(product.slug, product); }
  const resolvedIds = [...new Set(productKeys.flatMap((key) => byKey.get(key)?.id ?? []))];
  if (resolvedIds.length) {
    const { error } = await supabase.from("wishlist_items").upsert(resolvedIds.map((product_id) => ({ user_id: user.id, product_id })), { onConflict: "user_id,product_id", ignoreDuplicates: true });
    if (error) {
      logWishlistError("sync", error, ["user_id", "product_id"]);
      return response({ error: "We couldn't save your wishlist. Please try again." }, 503);
    }
  }
  const result = await readOwnedEntries(supabase, user.id);
  if (result.error) return response({ error: "We couldn't load your wishlist. Please try again." }, 503);
  return response({ authenticated: true, items: result.entries, acceptedKeys: productKeys.filter((key) => byKey.has(key)) });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured) return response({ error: "Wishlist sync is not configured yet." }, 503);
  const parsed = z.object({ wishlistItemId: z.string().uuid().optional(), productId: z.string().uuid().optional() }).refine((value) => Boolean(value.wishlistItemId || value.productId)).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "The wishlist item is invalid." }, 400);
  const { user, supabase } = await getAuthenticatedUser();
  if (!user || !supabase) return response({ error: "Please sign in to manage your wishlist." }, 401);
  let query = supabase.from("wishlist_items").delete().eq("user_id", user.id);
  query = parsed.data.wishlistItemId ? query.eq("id", parsed.data.wishlistItemId) : query.eq("product_id", parsed.data.productId!);
  const { error } = await query;
  if (error) {
    logWishlistError("delete", error, ["id", "product_id", "user_id"]);
    return response({ error: "We couldn't remove that item. Please try again." }, 503);
  }
  const result = await readOwnedEntries(supabase, user.id);
  if (result.error) return response({ error: "We couldn't load your wishlist. Please try again." }, 503);
  return response({ authenticated: true, items: result.entries });
}
