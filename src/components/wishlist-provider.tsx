"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { isUuid, localWishlistEntries, readWishlistKeys, removeWishlistStorage, toggleWishlistKey, writeWishlistKeys, type WishlistEntry } from "@/lib/wishlist";
import type { Product } from "@/lib/types";
import { clearPendingCustomerAction, readPendingCustomerAction } from "@/lib/customer-action";

type WishlistContextValue = {
  items: WishlistEntry[];
  count: number;
  authenticated: boolean;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  isWishlisted: (key: string) => boolean;
  isPending: (key: string) => boolean;
  toggle: (key: string, product?: Product) => Promise<void>;
  remove: (key: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const FRIENDLY_LOAD_ERROR = "We couldn't load your wishlist. Please try again.";

function entryMatches(entry: WishlistEntry, key: string) {
  return entry.product_id === key || entry.source_key === key || entry.id === key || entry.product?.id === key || entry.product?.slug === key;
}

async function readApiResponse(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : fallback);
  return body ?? {};
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  const loadVersionRef = useRef(0);
  const pendingRef = useRef(new Set<string>());

  const loadForSession = useCallback(async (session: Session | null) => {
    const version = ++loadVersionRef.current;
    const userId = session?.user?.id ?? null;
    sessionUserIdRef.current = userId;
    setAuthenticated(Boolean(userId));
    setLoading(true);
    setError(null);
    const pendingAction = userId ? readPendingCustomerAction() : null;
    const localKeys = [...new Set([...readWishlistKeys(), ...(pendingAction?.type === "wishlist" ? [pendingAction.productKey] : [])])];
    if (!userId) setItems(localWishlistEntries(localKeys));
    try {
      if (userId && localKeys.length) {
        const response = await fetch("/api/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productKeys: localKeys }) });
        const body = await readApiResponse(response, "We couldn't sync your wishlist. Please try again.") as { items?: WishlistEntry[]; acceptedKeys?: string[] };
        if (version !== loadVersionRef.current) return;
        const accepted = new Set(Array.isArray(body.acceptedKeys) ? body.acceptedKeys : localKeys);
        if (pendingAction?.type === "wishlist") clearPendingCustomerAction();
        const remainingLocalKeys = localKeys.filter((key) => !accepted.has(key));
        if (remainingLocalKeys.length) writeWishlistKeys(remainingLocalKeys); else removeWishlistStorage();
        setItems([...(Array.isArray(body.items) ? body.items : []), ...localWishlistEntries(remainingLocalKeys)]);
      } else {
        const query = !userId && localKeys.length ? `?keys=${encodeURIComponent(localKeys.join(","))}` : "";
        const response = await fetch(`/api/wishlist${query}`, { cache: "no-store" });
        const body = await readApiResponse(response, FRIENDLY_LOAD_ERROR) as { authenticated?: boolean; items?: WishlistEntry[] };
        if (version !== loadVersionRef.current) return;
        setAuthenticated(Boolean(body.authenticated));
        setItems(Array.isArray(body.items) ? body.items : []);
      }
    } catch (cause) {
      if (version !== loadVersionRef.current) return;
      setError(cause instanceof Error && cause.message ? cause.message : FRIENDLY_LOAD_ERROR);
      if (userId) setItems((current) => current.length ? current : localWishlistEntries(localKeys));
    } finally {
      if (version === loadVersionRef.current) { setLoading(false); setHydrated(true); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    try { supabaseRef.current = createBrowserSupabase(); } catch {
      if (active) { setLoading(false); setHydrated(true); setItems(localWishlistEntries(readWishlistKeys())); }
      return () => { active = false; };
    }
    const supabase = supabaseRef.current;
    void supabase.auth.getSession().then(({ data }) => { if (active) void loadForSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (active) window.setTimeout(() => { if (active) void loadForSession(session); }, 0); });
    const refreshGuest = () => { if (!sessionUserIdRef.current) void loadForSession(null); };
    window.addEventListener("storage", refreshGuest);
    return () => { active = false; listener.subscription.unsubscribe(); window.removeEventListener("storage", refreshGuest); };
  }, [loadForSession]);

  const isWishlisted = useCallback((key: string) => items.some((entry) => entryMatches(entry, key)), [items]);
  const isPending = useCallback((key: string) => pendingRef.current.has(key), []);

  const toggle = useCallback(async (key: string, product?: Product) => {
    const normalized = key.trim();
    if (!normalized || pendingRef.current.has(normalized)) return;
    const wasWishlisted = items.some((entry) => entryMatches(entry, normalized));
    const snapshot = items;
    pendingRef.current.add(normalized);
    setItems((current) => wasWishlisted
      ? current.filter((entry) => !entryMatches(entry, normalized))
      : [...current, { id: null, product_id: isUuid(normalized) ? normalized : product?.id ?? null, source_key: normalized, created_at: null, product: product ?? null }]);
    setError(null);
    try {
      const matchedEntry = snapshot.find((entry) => entryMatches(entry, normalized));
      const localOnly = Boolean(wasWishlisted && matchedEntry && !matchedEntry.id && !matchedEntry.product_id);
      if (!sessionUserIdRef.current || localOnly) {
        const matchingKeys = new Set([normalized, ...snapshot.filter((entry) => entryMatches(entry, normalized)).flatMap((entry) => [entry.source_key, entry.product_id, entry.product?.id, entry.product?.slug].filter((value): value is string => Boolean(value)))]);
        const next = wasWishlisted ? readWishlistKeys().filter((value) => !matchingKeys.has(value)) : toggleWishlistKey(readWishlistKeys(), normalized);
        writeWishlistKeys(next);
        setItems((current) => wasWishlisted ? current : current.map((entry) => entryMatches(entry, normalized) ? { ...entry, product: product ?? entry.product } : entry));
      } else if (wasWishlisted) {
        const entry = snapshot.find((candidate) => entryMatches(candidate, normalized));
        const payload = entry?.id && !entry.product_id ? { wishlistItemId: entry.id } : { productId: entry?.product_id ?? normalized };
        const response = await fetch("/api/wishlist", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
        const body = await readApiResponse(response, "We couldn't remove that item. Please try again.") as { items?: WishlistEntry[] };
        setItems(Array.isArray(body.items) ? body.items : []);
      } else {
        const response = await fetch("/api/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productKeys: [normalized] }) });
        const body = await readApiResponse(response, "We couldn't save that item. Please try again.") as { items?: WishlistEntry[] };
        setItems(Array.isArray(body.items) ? body.items : []);
      }
    } catch (cause) {
      setItems(snapshot);
      const message = cause instanceof Error && cause.message ? cause.message : "We couldn't update your wishlist. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      pendingRef.current.delete(normalized);
    }
  }, [items]);

  const remove = useCallback(async (key: string) => {
    const entry = items.find((candidate) => entryMatches(candidate, key));
    if (!entry) return;
    if (!sessionUserIdRef.current || (!entry.id && !entry.product_id)) {
      const matchingKeys = new Set([key, entry.source_key, entry.product_id, entry.product?.id, entry.product?.slug].filter((value): value is string => Boolean(value)));
      const next = readWishlistKeys().filter((item) => !matchingKeys.has(item));
      writeWishlistKeys(next);
      setItems((current) => current.filter((candidate) => !entryMatches(candidate, key)));
      return;
    }
    const snapshot = items;
    setItems((current) => current.filter((candidate) => !entryMatches(candidate, key)));
    try {
      const payload = entry.id && !entry.product_id ? { wishlistItemId: entry.id } : { productId: entry.product_id ?? key };
      const response = await fetch("/api/wishlist", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await readApiResponse(response, "We couldn't remove that item. Please try again.") as { items?: WishlistEntry[] };
      setItems(Array.isArray(body.items) ? body.items : []);
    } catch (cause) {
      setItems(snapshot);
      const message = cause instanceof Error && cause.message ? cause.message : "We couldn't remove that item. Please try again.";
      setError(message);
      throw new Error(message);
    }
  }, [items]);

  const refresh = useCallback(async () => {
    const session = supabaseRef.current ? (await supabaseRef.current.auth.getSession()).data.session : null;
    await loadForSession(session);
  }, [loadForSession]);

  const value = useMemo(() => ({ items, count: items.length, authenticated, hydrated, loading, error, isWishlisted, isPending, toggle, remove, refresh }), [items, authenticated, hydrated, loading, error, isWishlisted, isPending, toggle, remove, refresh]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error("useWishlist must be used within WishlistProvider");
  return value;
}
