import {
  createWhatsAppSupportUrl,
  DEFAULT_WHATSAPP_SUPPORT_MESSAGE,
} from "@/lib/whatsapp";

export type WhatsAppSupportSettings = {
  whatsapp_support_enabled?: boolean;
  whatsapp_number?: string;
  whatsapp_support_message?: string;
};

export function isWhatsAppSupportEnabled(settings: WhatsAppSupportSettings): boolean {
  return settings.whatsapp_support_enabled === true && Boolean(settings.whatsapp_number?.trim());
}

export function createFloatingWhatsAppUrl(settings: WhatsAppSupportSettings): string {
  if (!isWhatsAppSupportEnabled(settings)) throw new Error("WhatsApp support is not enabled.");
  return createWhatsAppSupportUrl(settings.whatsapp_number as string, settings.whatsapp_support_message || DEFAULT_WHATSAPP_SUPPORT_MESSAGE);
}

export function isPublicStorefrontPath(pathname: string): boolean {
  return !/^\/(?:admin(?:\/|$)|login(?:\/|$)|register(?:\/|$)|reset-password(?:\/|$)|forgot-password(?:\/|$)|auth(?:\/|$)|dashboard(?:\/|$)|account(?:\/|$))/.test(pathname);
}
