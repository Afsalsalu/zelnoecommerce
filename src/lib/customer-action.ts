import { safeInternalPath } from "@/lib/utils";
import type { CartLine } from "@/lib/cart-types";

const PENDING_ACTION_KEY = "zelno-pending-customer-action";

export type PendingCustomerAction =
  | { type: "wishlist"; productKey: string; returnTo: string }
  | { type: "cart"; line: CartLine; returnTo: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCartLine(value: unknown): value is CartLine {
  if (!isRecord(value)) return false;
  return typeof value.productId === "string"
    && (typeof value.variantId === "string" || value.variantId === null)
    && typeof value.slug === "string"
    && typeof value.title === "string"
    && typeof value.variantName === "string"
    && Number.isSafeInteger(value.unitPrice) && Number(value.unitPrice) >= 0
    && (typeof value.imageUrl === "string" || value.imageUrl === null)
    && Number.isInteger(value.quantity) && Number(value.quantity) >= 1 && Number(value.quantity) <= 99;
}

export function readPendingCustomerAction(): PendingCustomerAction | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || typeof value.type !== "string" || typeof value.returnTo !== "string") return null;
    const returnTo = safeInternalPath(value.returnTo, "/shop");
    if (value.type === "wishlist" && typeof value.productKey === "string" && value.productKey.trim()) return { type: "wishlist", productKey: value.productKey.trim(), returnTo };
    if (value.type === "cart" && isCartLine(value.line)) return { type: "cart", line: value.line, returnTo };
    return null;
  } catch {
    return null;
  }
}

export function writePendingCustomerAction(action: PendingCustomerAction) {
  try { sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action)); } catch { /* Login still works if session storage is unavailable. */ }
}

export function clearPendingCustomerAction() {
  try { sessionStorage.removeItem(PENDING_ACTION_KEY); } catch { /* Storage can be unavailable in privacy-restricted contexts. */ }
}

export function customerLoginPath(returnTo: string) {
  return `/login?next=${encodeURIComponent(safeInternalPath(returnTo, "/shop"))}`;
}
