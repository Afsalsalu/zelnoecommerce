"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/lib/cart-types";
import { rupeesToPaise } from "@/lib/money";
const KEY = "zelno-cart-v2"; const LEGACY_KEY = "zelno-cart-v1"; const COUPON_KEY = "zelno-coupon-v1";
type CartContextValue = { items: CartLine[]; couponCode: string; setCouponCode: (value: string) => void; hydrated: boolean; add: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void; setQuantity: (productId: string, variantId: string | null, quantity: number) => void; remove: (productId: string, variantId: string | null) => void; clear: () => void; subtotal: number; count: number };
const CartContext = createContext<CartContextValue | null>(null);
const same = (a: Pick<CartLine,"productId"|"variantId">, b: Pick<CartLine,"productId"|"variantId">) => a.productId === b.productId && a.variantId === b.variantId;
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]); const [couponCode, setCoupon] = useState(""); const [hydrated, setHydrated] = useState(false);
  useEffect(() => { try { const current = localStorage.getItem(KEY); const legacy = !current ? localStorage.getItem(LEGACY_KEY) : null; const saved = JSON.parse(current ?? legacy ?? "[]") as CartLine[]; const valid = Array.isArray(saved) ? saved.filter((item) => item && typeof item.productId === "string" && Number.isInteger(item.quantity) && item.quantity > 0) : []; setItems(legacy ? valid.map((item) => ({ ...item, unitPrice: rupeesToPaise(item.unitPrice, "Cart price") })) : valid); setCoupon(localStorage.getItem(COUPON_KEY) || ""); } catch { setItems([]); setCoupon(""); } setHydrated(true); }, []);
  useEffect(() => { if (hydrated) { localStorage.setItem(KEY, JSON.stringify(items)); if (couponCode) localStorage.setItem(COUPON_KEY, couponCode); else localStorage.removeItem(COUPON_KEY); } }, [items, couponCode, hydrated]);
  const add = useCallback((line: Omit<CartLine,"quantity"> & { quantity?: number }) => setItems((old) => { const next = { ...line, quantity: Math.max(1, Math.min(99, line.quantity ?? 1)) }; const existing = old.find((item) => same(item, next)); return existing ? old.map((item) => same(item, next) ? { ...item, quantity: Math.min(99, item.quantity + next.quantity) } : item) : [...old, next]; }), []);
  const setQuantity = useCallback((productId: string, variantId: string | null, quantity: number) => setItems((old) => quantity <= 0 ? old.filter((item) => !same(item,{productId,variantId})) : old.map((item) => same(item,{productId,variantId}) ? { ...item, quantity: Math.min(99,quantity) } : item)), []);
  const remove = useCallback((productId: string, variantId: string | null) => setItems((old) => old.filter((item) => !same(item,{productId,variantId}))), []);
  const clear = useCallback(() => { setItems([]); setCoupon(""); }, []);
  const setCouponCode = useCallback((value: string) => setCoupon(value.trim().toUpperCase()), []);
  const subtotal = items.reduce((sum,item) => sum + item.unitPrice * item.quantity,0); const count = items.reduce((sum,item) => sum + item.quantity,0);
  const value = useMemo(() => ({ items,couponCode,setCouponCode,hydrated,add,setQuantity,remove,clear,subtotal,count }), [items,couponCode,setCouponCode,hydrated,add,setQuantity,remove,clear,subtotal,count]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error("useCart must be used within CartProvider"); return value; }
