import { z } from "zod";
import { DEFAULT_WHATSAPP_SUPPORT_MESSAGE, normalizeWhatsAppNumber } from "@/lib/whatsapp";

export const DEFAULT_WHATSAPP_ADMIN_SETTINGS = {
  whatsapp_enabled: false,
  whatsapp_number: "",
  whatsapp_product_enabled: false,
  whatsapp_cart_enabled: false,
  whatsapp_checkout_enabled: false,
  whatsapp_product_button_label: "Buy via WhatsApp",
  whatsapp_order_button_label: "Order via WhatsApp",
  whatsapp_message_intro: "Hello, I would like to place this order.",
  whatsapp_support_enabled: false,
  whatsapp_support_message: DEFAULT_WHATSAPP_SUPPORT_MESSAGE,
} as const;

export const whatsappAdminSettingsSchema = z.object({
  whatsapp_enabled: z.boolean(),
  whatsapp_number: z.string().trim().max(60),
  whatsapp_product_enabled: z.boolean(),
  whatsapp_cart_enabled: z.boolean(),
  whatsapp_checkout_enabled: z.boolean(),
  whatsapp_product_button_label: z.string().trim().min(1).max(80),
  whatsapp_order_button_label: z.string().trim().min(1).max(80),
  whatsapp_message_intro: z.string().trim().min(1).max(240),
  whatsapp_support_enabled: z.boolean(),
  whatsapp_support_message: z.string().trim().max(240),
}).superRefine((value, context) => {
  if (value.whatsapp_number) {
    try { normalizeWhatsAppNumber(value.whatsapp_number); }
    catch (error) { context.addIssue({ code: "custom", path: ["whatsapp_number"], message: error instanceof Error ? error.message : "Enter a valid WhatsApp number." }); }
  }
  if ((value.whatsapp_enabled || value.whatsapp_support_enabled) && !value.whatsapp_number) context.addIssue({ code: "custom", path: ["whatsapp_number"], message: "A WhatsApp business number is required when WhatsApp ordering or support is enabled." });
  if (value.whatsapp_support_enabled && !value.whatsapp_support_message) context.addIssue({ code: "custom", path: ["whatsapp_support_message"], message: "A support message is required when the floating support button is enabled." });
});

export type WhatsAppAdminSettings = z.infer<typeof whatsappAdminSettingsSchema>;

export function resolveWhatsAppAdminSettings(value: unknown): WhatsAppAdminSettings {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<WhatsAppAdminSettings> : {};
  return {
    whatsapp_enabled: typeof source.whatsapp_enabled === "boolean" ? source.whatsapp_enabled : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_enabled,
    whatsapp_number: typeof source.whatsapp_number === "string" ? source.whatsapp_number : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_number,
    whatsapp_product_enabled: typeof source.whatsapp_product_enabled === "boolean" ? source.whatsapp_product_enabled : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_product_enabled,
    whatsapp_cart_enabled: typeof source.whatsapp_cart_enabled === "boolean" ? source.whatsapp_cart_enabled : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_cart_enabled,
    whatsapp_checkout_enabled: typeof source.whatsapp_checkout_enabled === "boolean" ? source.whatsapp_checkout_enabled : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_checkout_enabled,
    whatsapp_product_button_label: typeof source.whatsapp_product_button_label === "string" && source.whatsapp_product_button_label.trim() ? source.whatsapp_product_button_label : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_product_button_label,
    whatsapp_order_button_label: typeof source.whatsapp_order_button_label === "string" && source.whatsapp_order_button_label.trim() ? source.whatsapp_order_button_label : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_order_button_label,
    whatsapp_message_intro: typeof source.whatsapp_message_intro === "string" && source.whatsapp_message_intro.trim() ? source.whatsapp_message_intro : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_message_intro,
    whatsapp_support_enabled: typeof source.whatsapp_support_enabled === "boolean" ? source.whatsapp_support_enabled : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_support_enabled,
    whatsapp_support_message: typeof source.whatsapp_support_message === "string" && source.whatsapp_support_message.trim() ? source.whatsapp_support_message : DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_support_message,
  };
}

export function normalizeWhatsAppAdminSettings(value: WhatsAppAdminSettings): WhatsAppAdminSettings {
  return {
    ...value,
    whatsapp_number: value.whatsapp_number ? normalizeWhatsAppNumber(value.whatsapp_number) : "",
    whatsapp_product_button_label: value.whatsapp_product_button_label.trim(),
    whatsapp_order_button_label: value.whatsapp_order_button_label.trim(),
    whatsapp_message_intro: value.whatsapp_message_intro.trim(),
    whatsapp_support_message: value.whatsapp_support_message.trim(),
  };
}
