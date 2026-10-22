import { formatPrice } from "@/lib/utils";
export { formatPrice };
export function discountPercent(price: number, compareAt: number | null) {
  return compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : null;
}
