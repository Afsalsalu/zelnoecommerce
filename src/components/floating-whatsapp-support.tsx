"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import type { StoreSettings } from "@/lib/types";
import { createFloatingWhatsAppUrl, isPublicStorefrontPath, isWhatsAppSupportEnabled } from "@/lib/whatsapp-support";

export function FloatingWhatsAppSupport({ settings }: { settings: Pick<StoreSettings, "whatsapp_support_enabled" | "whatsapp_support_message" | "whatsapp_number"> }) {
  const pathname = usePathname();
  if (pathname && !isPublicStorefrontPath(pathname)) return null;
  if (!isWhatsAppSupportEnabled(settings)) return null;

  let href: string;
  try {
    href = createFloatingWhatsAppUrl(settings);
  } catch {
    return null;
  }

  return (
    <a href={href} className="floating-whatsapp-support" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
      <MessageCircle aria-hidden="true" size={23} strokeWidth={1.8} />
      <span className="sr-only">Chat on WhatsApp</span>
    </a>
  );
}
