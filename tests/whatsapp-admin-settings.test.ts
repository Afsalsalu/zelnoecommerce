import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WHATSAPP_ADMIN_SETTINGS,
  normalizeWhatsAppAdminSettings,
  resolveWhatsAppAdminSettings,
  whatsappAdminSettingsSchema,
} from "@/lib/whatsapp-admin-settings";

test("WhatsApp admin settings resolve legacy or missing fields without resetting stored values", () => {
  const resolved = resolveWhatsAppAdminSettings({ whatsapp_enabled: true, whatsapp_number: "+91 98765 43210", whatsapp_product_enabled: true });
  assert.equal(resolved.whatsapp_enabled, true);
  assert.equal(resolved.whatsapp_number, "+91 98765 43210");
  assert.equal(resolved.whatsapp_product_enabled, true);
  assert.equal(resolved.whatsapp_order_button_label, DEFAULT_WHATSAPP_ADMIN_SETTINGS.whatsapp_order_button_label);
});

test("WhatsApp admin settings retain the existing number validation", () => {
  const result = whatsappAdminSettingsSchema.safeParse({ ...DEFAULT_WHATSAPP_ADMIN_SETTINGS, whatsapp_enabled: true, whatsapp_number: "123" });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.issues[0]?.message || "", /valid WhatsApp number|country code/);
});

test("WhatsApp admin settings normalize the number only when saving", () => {
  const parsed = whatsappAdminSettingsSchema.parse({ ...DEFAULT_WHATSAPP_ADMIN_SETTINGS, whatsapp_enabled: true, whatsapp_number: "+91 98765 43210" });
  assert.equal(normalizeWhatsAppAdminSettings(parsed).whatsapp_number, "919876543210");
});
