"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { CartLine } from "@/lib/cart-types";
import { rupeesToPaise } from "@/lib/money";
import { clearPendingCustomerAction, readPendingCustomerAction } from "@/lib/customer-action";

const CART_PREFIX = "zelno-cart-v1";
const GUEST_CART_KEY = `${CART_PREFIX}:guest`;
const USER_CART_PREFIX = `${CART_PREFIX}:user:`;
const LEGACY_CART_KEYS = ["zelno-cart-v2", "zelno-cart-v1"] as const;
const COUPON_PREFIX = "zelno-coupon-v1";
const GUEST_COUPON_KEY = `${COUPON_PREFIX}:guest`;
const USER_COUPON_PREFIX = `${COUPON_PREFIX}:user:`;
const LEGACY_COUPON_KEY = "zelno-coupon-v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CartContextValue = {
  items: CartLine[];
  couponCode: string;
  setCouponCode: (value: string) => void;
  hydrated: boolean;
  add: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  authenticated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function same(a: Pick<CartLine, "productId" | "variantId">, b: Pick<CartLine, "productId" | "variantId">) {
  return a.productId === b.productId && a.variantId === b.variantId;
}

function cartKeyForUser(userId: string | null) {
  return userId ? `${USER_CART_PREFIX}${userId}` : GUEST_CART_KEY;
}

function couponKeyForUser(userId: string | null) {
  return userId ? `${USER_COUPON_PREFIX}${userId}` : GUEST_COUPON_KEY;
}

function readJson(key: string): unknown {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeStorageKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function normalizeCartItems(value: unknown, legacyPriceInRupees = false): CartLine[] {
  if (!Array.isArray(value)) return [];
  const normalized: CartLine[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Partial<CartLine>;
    if (!isUuid(item.productId)) continue;
    if (item.variantId !== null && item.variantId !== undefined && item.variantId !== "" && !isUuid(item.variantId)) continue;
    const quantity = item.quantity;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;

    let unitPrice: number;
    try {
      unitPrice = legacyPriceInRupees ? rupeesToPaise(item.unitPrice, "Cart price") : Number(item.unitPrice);
    } catch {
      continue;
    }
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 0) continue;

    const title = typeof item.title === "string" ? item.title.trim() : "";
    const slug = typeof item.slug === "string" ? item.slug.trim() : "";
    if (!title || !slug) continue;

    const next: CartLine = {
      productId: item.productId,
      variantId: item.variantId || null,
      slug,
      title,
      variantName: typeof item.variantName === "string" && item.variantName.trim() ? item.variantName.trim() : "Standard",
      unitPrice,
      imageUrl: typeof item.imageUrl === "string" && item.imageUrl.trim() ? item.imageUrl : null,
      quantity: Math.min(99, quantity),
    };
    const existing = normalized.find((line) => same(line, next));
    if (existing) existing.quantity = Math.min(99, existing.quantity + next.quantity);
    else normalized.push(next);
  }

  return normalized;
}

function readCart(key: string, legacyPriceInRupees = false) {
  return normalizeCartItems(readJson(key), legacyPriceInRupees);
}

function mergeCartItems(existing: CartLine[], incoming: CartLine[]) {
  const merged = existing.map((item) => ({ ...item }));
  for (const incomingItem of incoming) {
    const current = merged.find((item) => same(item, incomingItem));
    if (current) current.quantity = Math.min(99, current.quantity + incomingItem.quantity);
    else merged.push({ ...incomingItem });
  }
  return merged;
}

function readCoupon(key: string) {
  try {
    const value = window.localStorage.getItem(key)?.trim().toUpperCase() ?? "";
    return value.length <= 40 ? value : "";
  } catch {
    return "";
  }
}

function writeCoupon(key: string, value: string) {
  try {
    const normalized = value.trim().toUpperCase();
    if (normalized && normalized.length <= 40) window.localStorage.setItem(key, normalized);
    else window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function migrateLegacyStorage() {
  let legacyFound = false;
  let guestItems: CartLine[] = [];
  try {
    if (window.localStorage.getItem(GUEST_CART_KEY) !== null) guestItems = readCart(GUEST_CART_KEY);
  } catch {
    return false;
  }

  for (const legacyKey of LEGACY_CART_KEYS) {
    let legacyValue: string | null = null;
    try {
      legacyValue = window.localStorage.getItem(legacyKey);
    } catch {
      continue;
    }
    if (legacyValue === null) continue;
    legacyFound = true;

    const items = normalizeCartItems(readJson(legacyKey), legacyKey === "zelno-cart-v1");
    const migratedItems = mergeCartItems(guestItems, items);
    if (!writeJson(GUEST_CART_KEY, migratedItems)) continue;
    guestItems = migratedItems;
    removeStorageKey(legacyKey);
  }

  let legacyCoupon: string | null = null;
  try {
    legacyCoupon = window.localStorage.getItem(LEGACY_COUPON_KEY);
  } catch {
    legacyCoupon = null;
  }
  if (legacyCoupon !== null) {
    legacyFound = true;
    const guestCoupon = readCoupon(GUEST_COUPON_KEY);
    const moved = guestCoupon || writeCoupon(GUEST_COUPON_KEY, legacyCoupon);
    if (moved) removeStorageKey(LEGACY_COUPON_KEY);
  }

  return legacyFound;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [couponCode, setCoupon] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const activeKeyRef = useRef<string | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  const loadVersionRef = useRef(0);
  const legacyMigrationDoneRef = useRef(false);

  const loadForSession = useCallback(async (session: Session | null, initialLoad = false) => {
    const version = ++loadVersionRef.current;
    const sessionUserId = session?.user?.id && isUuid(session.user.id) ? session.user.id : null;
    const migratedLegacy = initialLoad && !legacyMigrationDoneRef.current ? migrateLegacyStorage() : false;
    if (initialLoad) legacyMigrationDoneRef.current = true;

    sessionUserIdRef.current = sessionUserId;
    setAuthenticated(Boolean(sessionUserId));
    activeKeyRef.current = null;
    loadedKeyRef.current = null;
    setHydrated(false);
    setItems([]);
    setCoupon("");

    const storageKey = cartKeyForUser(sessionUserId);
    const couponKey = couponKeyForUser(sessionUserId);
    const shouldMergeGuest = Boolean(sessionUserId && !migratedLegacy);
    let nextItems = readCart(storageKey);
    let nextCoupon = readCoupon(couponKey);
    const pendingAction = sessionUserId ? readPendingCustomerAction() : null;

    if (shouldMergeGuest) {
      const guestItems = readCart(GUEST_CART_KEY);
      const guestCoupon = readCoupon(GUEST_COUPON_KEY);
      nextItems = mergeCartItems(nextItems, guestItems);
      if (!nextCoupon) nextCoupon = guestCoupon;

      const savedUserCart = writeJson(storageKey, nextItems);
      const savedUserCoupon = writeCoupon(couponKey, nextCoupon);
      if (savedUserCart) removeStorageKey(GUEST_CART_KEY);
      if (savedUserCoupon) removeStorageKey(GUEST_COUPON_KEY);
    } else {
      writeJson(storageKey, nextItems);
      writeCoupon(couponKey, nextCoupon);
    }

    if (sessionUserId && pendingAction?.type === "cart") {
      nextItems = mergeCartItems(nextItems, [pendingAction.line]);
      if (writeJson(storageKey, nextItems)) clearPendingCustomerAction();
    }

    if (version !== loadVersionRef.current) return;
    activeKeyRef.current = storageKey;
    loadedKeyRef.current = storageKey;
    setItems(nextItems);
    setCoupon(nextCoupon);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const storageKey = loadedKeyRef.current;
    if (!storageKey || activeKeyRef.current !== storageKey) return;
    writeJson(storageKey, items);
    writeCoupon(couponKeyForUser(sessionUserIdRef.current), couponCode);
  }, [couponCode, hydrated, items]);

  useEffect(() => {
    let active = true;
    let supabase: SupabaseClient;
    try {
      supabase = createBrowserSupabase();
    } catch {
      void loadForSession(null, true);
      return () => { active = false; };
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (active) void loadForSession(data.session, true);
    }).catch(() => {
      if (active) void loadForSession(null, true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) window.setTimeout(() => { if (active) void loadForSession(session); }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadForSession]);

  const add = useCallback((line: Omit<CartLine, "quantity"> & { quantity?: number }) => {
    setItems((old) => {
      const requestedQuantity = Number.isInteger(line.quantity) ? line.quantity as number : 1;
      const next = { ...line, quantity: Math.max(1, Math.min(99, requestedQuantity)) };
      const existing = old.find((item) => same(item, next));
      return existing ? old.map((item) => same(item, next) ? { ...item, quantity: Math.min(99, item.quantity + next.quantity) } : item) : [...old, next];
    });
  }, []);

  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => {
    setItems((old) => {
      if (!Number.isFinite(quantity)) return old;
      const nextQuantity = Math.floor(quantity);
      return quantity <= 0
        ? old.filter((item) => !same(item, { productId, variantId }))
        : nextQuantity <= 0
          ? old.filter((item) => !same(item, { productId, variantId }))
          : old.map((item) => same(item, { productId, variantId }) ? { ...item, quantity: Math.min(99, nextQuantity) } : item);
    });
  }, []);

  const remove = useCallback((productId: string, variantId: string | null) => {
    setItems((old) => old.filter((item) => !same(item, { productId, variantId })));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCoupon("");
  }, []);

  const setCouponCode = useCallback((value: string) => setCoupon(value.trim().toUpperCase().slice(0, 40)), []);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const value = useMemo(() => ({ items, couponCode, setCouponCode, hydrated, authenticated, add, setQuantity, remove, clear, subtotal, count }), [items, couponCode, setCouponCode, hydrated, authenticated, add, setQuantity, remove, clear, subtotal, count]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
