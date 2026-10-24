import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isProductSlug, isUuid, localWishlistEntries, normalizeWishlistKeys, toggleWishlistKey, wishlistEntryKey } from "@/lib/wishlist";

const productId = "123e4567-e89b-42d3-a456-426614174000";

test("wishlist keys accept product ids and legacy slugs while removing invalid values", () => {
  assert.equal(isUuid(productId), true);
  assert.equal(isProductSlug("handmade-bowl"), true);
  assert.deepEqual(normalizeWishlistKeys([productId, "handmade-bowl", productId, "not valid", ""]), [productId, "handmade-bowl"]);
});

test("wishlist toggle is deterministic and deduplicated", () => {
  assert.deepEqual(toggleWishlistKey([productId], productId), []);
  assert.deepEqual(toggleWishlistKey([], productId), [productId]);
  assert.deepEqual(toggleWishlistKey([productId, "handmade-bowl"], "handmade-bowl"), [productId]);
});

test("local wishlist entries preserve the source key for guest refresh and migration", () => {
  const [entry] = localWishlistEntries([productId]);
  assert.equal(entry.product_id, productId);
  assert.equal(wishlistEntryKey(entry), productId);
  const [legacy] = localWishlistEntries(["handmade-bowl"]);
  assert.equal(legacy.product_id, null);
  assert.equal(wishlistEntryKey(legacy), "handmade-bowl");
});

test("wishlist migration keeps ownership inside auth.uid and preserves deleted-product rows safely", () => {
  const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261023150000_wishlist_items.sql"), "utf8");
  assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/i);
  assert.match(migration, /product_id uuid references public\.products\(id\) on delete set null/i);
  assert.match(migration, /unique \(user_id, product_id\)/i);
  assert.match(migration, /for select to authenticated[\s\S]*using \(user_id = auth\.uid\(\)\)/i);
  assert.match(migration, /for insert to authenticated[\s\S]*with check \(user_id = auth\.uid\(\)\)/i);
  assert.match(migration, /for delete to authenticated[\s\S]*using \(user_id = auth\.uid\(\)\)/i);
});
