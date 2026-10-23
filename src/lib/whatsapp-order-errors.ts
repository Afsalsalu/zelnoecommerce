type ErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error || "");
  const value = error as ErrorLike;
  return [value.code, value.message, value.details, value.hint].filter(Boolean).join(" ");
}

export function isWhatsAppSchemaError(error: unknown): boolean {
  const text = errorText(error).toLowerCase();
  return text.includes("pgrst202")
    || text.includes("schema cache")
    || text.includes("could not find the function")
    || text.includes("does not exist")
    || text.includes("column") && text.includes("does not exist");
}

export function isWhatsAppAccessError(error: unknown): boolean {
  const text = errorText(error).toLowerCase();
  return text.includes("permission denied")
    || text.includes("row-level security")
    || text.includes("not authorized")
    || text.includes("insufficient privilege");
}

export function whatsappOrderErrorMessage(error: unknown): string {
  const text = errorText(error);
  if (text.includes("WHATSAPP_DISABLED")) return "WhatsApp ordering is not available right now.";
  if (text.includes("OUT_OF_STOCK") || text.includes("PRODUCT_UNAVAILABLE") || text.includes("VARIANT_UNAVAILABLE")) {
    return "An item is unavailable or has changed. Please review your bag and try again.";
  }
  if (text.includes("COUPON")) return "That offer is no longer valid for this order.";
  if (text.includes("INVALID_CUSTOMER") || text.includes("INVALID_ITEMS") || text.includes("INVALID_QUANTITY")) {
    return "Please review your details and try again.";
  }
  if (isWhatsAppSchemaError(error) || isWhatsAppAccessError(error)) {
    return "WhatsApp ordering is temporarily unavailable. Please contact the store.";
  }
  return "We couldn't create the WhatsApp order request. Please try again.";
}

export function whatsappOrderErrorStatus(error: unknown): number {
  return isWhatsAppSchemaError(error) || isWhatsAppAccessError(error) ? 503 : 409;
}

export function supabaseErrorDetails(error: unknown): ErrorLike {
  if (!error || typeof error !== "object") return { message: String(error || "Unknown error") };
  const value = error as ErrorLike;
  return { code: value.code ?? null, message: value.message ?? null, details: value.details ?? null, hint: value.hint ?? null };
}
