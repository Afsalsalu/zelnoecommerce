import test from "node:test";
import assert from "node:assert/strict";
import { isWhatsAppAccessError, isWhatsAppSchemaError, supabaseErrorDetails, whatsappOrderErrorMessage, whatsappOrderErrorStatus } from "../src/lib/whatsapp-order-errors";
import { createWhatsAppRequestKey } from "../src/lib/whatsapp";

test("maps the missing WhatsApp RPC to a safe server-unavailable message", () => {
  const error = { code: "PGRST202", message: "Could not find the function public.create_whatsapp_order_request in the schema cache", details: "raw database detail" };
  assert.equal(isWhatsAppSchemaError(error), true);
  assert.equal(whatsappOrderErrorStatus(error), 503);
  assert.equal(whatsappOrderErrorMessage(error), "WhatsApp ordering is temporarily unavailable. Please contact the store.");
  assert.doesNotMatch(whatsappOrderErrorMessage(error), /PGRST202|schema cache|raw database detail/);
});

test("maps database access failures without exposing Supabase details", () => {
  const error = { code: "42501", message: "permission denied for function create_whatsapp_order_request" };
  assert.equal(isWhatsAppAccessError(error), true);
  assert.equal(whatsappOrderErrorStatus(error), 503);
  assert.equal(whatsappOrderErrorMessage(error), "WhatsApp ordering is temporarily unavailable. Please contact the store.");
});

test("extracts Supabase diagnostics without relying on object serialization", () => {
  const details = supabaseErrorDetails(Object.assign(new Error("column addresses.email does not exist"), {
    code: "42703", details: "missing column", hint: "Run the saved-address migration.",
  }));
  assert.deepEqual(details, {
    code: "42703",
    message: "column addresses.email does not exist",
    details: "missing column",
    hint: "Run the saved-address migration.",
  });
});

test("maps validation and inventory failures to actionable checkout messages", () => {
  assert.equal(whatsappOrderErrorMessage({ message: "INVALID_CUSTOMER" }), "Please review your details and try again.");
  assert.equal(whatsappOrderErrorMessage({ message: "OUT_OF_STOCK" }), "An item is unavailable or has changed. Please review your bag and try again.");
  assert.equal(whatsappOrderErrorStatus({ message: "OUT_OF_STOCK" }), 409);
});

test("generates UUID request keys for idempotent duplicate-click protection", () => {
  const first = createWhatsAppRequestKey();
  const second = createWhatsAppRequestKey();
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(first, second);
});
