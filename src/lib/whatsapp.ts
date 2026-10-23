import { formatPrice } from "@/lib/format";

export const DEFAULT_WHATSAPP_PRODUCT_LABEL = "Buy via WhatsApp";
export const DEFAULT_WHATSAPP_ORDER_LABEL = "Order via WhatsApp";
export const DEFAULT_WHATSAPP_MESSAGE_INTRO = "Hello, I would like to place this order.";
export const DEFAULT_WHATSAPP_SUPPORT_MESSAGE = "Hello, I need help with ZELNO.";

export function createWhatsAppRequestKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type WhatsAppMessageItem = {
  title: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type WhatsAppMessageInput = {
  intro: string;
  orderNumber: string;
  customer: { name: string; phone: string; email?: string | null };
  address: { addressLine: string; area: string; city: string; state: string; pincode: string };
  items: WhatsAppMessageItem[];
  total: number;
};

function oneLine(value: string | null | undefined) {
  return (value ?? "").replace(/[\r\n]+/g, " ").trim();
}

export function normalizeWhatsAppNumber(value: string): string {
  const input = value.trim();
  if (!input || !/^\+?[0-9 ()-]+$/.test(input)) throw new Error("Enter a WhatsApp number using country code and digits only.");
  const digits = input.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) throw new Error("Enter a valid WhatsApp number with country code.");
  return digits;
}

export function buildWhatsAppMessage(input: WhatsAppMessageInput): string {
  const lines = [
    oneLine(input.intro) || DEFAULT_WHATSAPP_MESSAGE_INTRO,
    "",
    `Order Request: ${oneLine(input.orderNumber)}`,
    "",
    "Customer:",
    `Name: ${oneLine(input.customer.name)}`,
    `Phone: ${oneLine(input.customer.phone)}`,
  ];
  if (oneLine(input.customer.email)) lines.push(`Email: ${oneLine(input.customer.email)}`);
  lines.push(
    "",
    "Delivery Address:",
    oneLine(input.address.addressLine),
    `${oneLine(input.address.area)}, ${oneLine(input.address.city)}, ${oneLine(input.address.state)} - ${oneLine(input.address.pincode)}`,
    "",
    "Items:",
  );
  input.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${oneLine(item.title)}`);
    if (oneLine(item.variantName) && oneLine(item.variantName) !== "Standard") lines.push(`   Variant: ${oneLine(item.variantName)}`);
    lines.push(`   Qty: ${item.quantity} × ${formatPrice(item.unitPrice)} = ${formatPrice(item.lineTotal)}`);
  });
  lines.push("", `Order Total: ${formatPrice(input.total)}`, "", "Please confirm availability and delivery details.");
  return lines.join("\n");
}

export function createWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(number)}?text=${encodeURIComponent(message)}`;
}

export function createWhatsAppSupportUrl(number: string, message = DEFAULT_WHATSAPP_SUPPORT_MESSAGE): string {
  const supportMessage = oneLine(message);
  if (!supportMessage || supportMessage.length > 240) throw new Error("Enter a valid WhatsApp support message.");
  return createWhatsAppUrl(number, supportMessage);
}

export function isWhatsAppEnabled(settings: { whatsapp_enabled?: boolean; whatsapp_number?: string }) {
  return Boolean(settings.whatsapp_enabled && settings.whatsapp_number);
}
