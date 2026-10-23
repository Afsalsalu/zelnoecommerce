import test from "node:test";
import assert from "node:assert/strict";
import { buildWhatsAppMessage, createWhatsAppUrl, isWhatsAppEnabled, normalizeWhatsAppNumber } from "../src/lib/whatsapp";

test("normalizes an Indian WhatsApp number to digits only", () => {
  assert.equal(normalizeWhatsAppNumber("+91 98765 43210"), "919876543210");
  assert.equal(normalizeWhatsAppNumber("919876543210"), "919876543210");
  assert.throws(() => normalizeWhatsAppNumber("09876543210"));
  assert.throws(() => normalizeWhatsAppNumber("+91 ABC"));
  assert.throws(() => normalizeWhatsAppNumber("9+1 9876543210"));
});

test("generates a plain text message with optional fields omitted cleanly", () => {
  const message = buildWhatsAppMessage({
    intro: "Hello, I would like to place this order.", orderNumber: "ZK-20261023-ABC1234567",
    customer: { name: "Asha\nMenon", phone: "+91 98765 43210" },
    address: { addressLine: "12 Lake Road", area: "Aluva", city: "Kochi", state: "Kerala", pincode: "682001" },
    items: [{ title: "Stoneware bowl", variantName: "Standard", quantity: 2, unitPrice: 12500, lineTotal: 25000 }], total: 25900,
  });
  assert.match(message, /Order Request: ZK-20261023-ABC1234567/);
  assert.match(message, /Name: Asha Menon/);
  assert.match(message, /Qty: 2 × ₹125.00 = ₹250.00/);
  assert.match(message, /Order Total: ₹259.00/);
  assert.doesNotMatch(message, /Email:/);
  assert.doesNotMatch(message, /Variant: Standard/);
});

test("encodes the message in a standard wa.me click-to-chat URL", () => {
  const url = createWhatsAppUrl("+91 98765 43210", "Hello, order ZK-123");
  assert.equal(url, "https://wa.me/919876543210?text=Hello%2C%20order%20ZK-123");
});

test("disabled WhatsApp settings do not enable storefront actions", () => {
  assert.equal(isWhatsAppEnabled({ whatsapp_enabled: false, whatsapp_number: "919876543210" }), false);
  assert.equal(isWhatsAppEnabled({ whatsapp_enabled: true, whatsapp_number: "" }), false);
  assert.equal(isWhatsAppEnabled({ whatsapp_enabled: true, whatsapp_number: "919876543210" }), true);
});
