import assert from "node:assert/strict";
import test from "node:test";
import {
  createFloatingWhatsAppUrl,
  isPublicStorefrontPath,
  isWhatsAppSupportEnabled,
} from "../src/lib/whatsapp-support";

test("support visibility requires its own toggle and a business number", () => {
  assert.equal(isWhatsAppSupportEnabled({ whatsapp_support_enabled: false, whatsapp_number: "919876543210" }), false);
  assert.equal(isWhatsAppSupportEnabled({ whatsapp_support_enabled: true, whatsapp_number: "" }), false);
  assert.equal(isWhatsAppSupportEnabled({ whatsapp_support_enabled: true, whatsapp_number: "919876543210" }), true);
});

test("support creates a valid wa.me URL without creating an order payload", () => {
  assert.equal(createFloatingWhatsAppUrl({ whatsapp_support_enabled: true, whatsapp_number: "+91 98765 43210", whatsapp_support_message: "Hello, I need help with ZELNO." }), "https://wa.me/919876543210?text=Hello%2C%20I%20need%20help%20with%20ZELNO.");
});

test("support URL rejects invalid or disabled settings", () => {
  assert.throws(() => createFloatingWhatsAppUrl({ whatsapp_support_enabled: false, whatsapp_number: "919876543210" }));
  assert.throws(() => createFloatingWhatsAppUrl({ whatsapp_support_enabled: true, whatsapp_number: "123" }));
  assert.throws(() => createFloatingWhatsAppUrl({ whatsapp_support_enabled: true, whatsapp_number: "919876543210", whatsapp_support_message: "\n" }));
});

test("support route policy excludes admin and auth paths", () => {
  for (const pathname of ["/admin", "/admin/orders", "/login", "/register", "/reset-password", "/auth/callback", "/dashboard", "/account", "/account/orders/ABC-123"]) {
    assert.equal(isPublicStorefrontPath(pathname), false, pathname);
  }
  for (const pathname of ["/", "/shop", "/shop/phone", "/cart", "/checkout", "/about"]) {
    assert.equal(isPublicStorefrontPath(pathname), true, pathname);
  }
});
