const DECIMAL_AMOUNT = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const HUNDRED = BigInt(100);
const TEN_THOUSAND = BigInt(10000);
const HALF_PERCENT_BASIS = BigInt(5000);

function decimalParts(value: number | string, label: string) {
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!DECIMAL_AMOUNT.test(text)) throw new Error(`${label} must be a non-negative amount with up to two decimal places.`);
  const [whole, fraction = ""] = text.split(".");
  return { whole: BigInt(whole), fraction: BigInt((fraction + "00").slice(0, 2)) };
}

export function rupeesToPaise(value: number | string | undefined, label = "Amount"): number {
  if (value == null) throw new Error(`${label} is required.`);
  const parts = decimalParts(value, label);
  const paise = parts.whole * HUNDRED + parts.fraction;
  if (paise > MAX_SAFE_INTEGER_BIGINT) throw new Error(`${label} is too large.`);
  return Number(paise);
}

export function percentageToBasisPoints(value: number | string, label = "Discount"): number {
  const parts = decimalParts(value, label);
  const basisPoints = parts.whole * HUNDRED + parts.fraction;
  if (basisPoints > TEN_THOUSAND) throw new Error(`${label} cannot exceed 100%.`);
  return Number(basisPoints);
}

export function paiseToRupeesInput(value: number): number {
  return Number((value / 100).toFixed(2));
}

export function percentageDiscountPaise(subtotalPaise: number, basisPoints: number): number {
  const discount = (BigInt(subtotalPaise) * BigInt(basisPoints) + HALF_PERCENT_BASIS) / TEN_THOUSAND;
  if (discount > MAX_SAFE_INTEGER_BIGINT) throw new Error("Discount is too large.");
  return Number(discount);
}
