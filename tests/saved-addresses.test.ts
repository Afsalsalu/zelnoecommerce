import assert from "node:assert/strict";
import test from "node:test";
import {
  addressBelongsToUser,
  checkoutUserMatchesAccount,
  checkoutValuesFromAddress,
  mergeSavedAddresses,
  savedAddressFromOrder,
  sameCheckoutAddress,
  shouldSaveCheckoutAddress,
  shouldShowSavedAddresses,
  sortSavedAddresses,
  visibleSavedAddresses,
  type SavedAddress,
} from "../src/lib/saved-addresses";

function address(overrides: Partial<SavedAddress> = {}): SavedAddress {
  return {
    id: "address-1", label: "Home", full_name: "Asha Menon", email: "asha@example.com", phone: "+91 98765 43210",
    address_line: "12 Lake Road", area: "Aluva", city: "Kochi", state: "Kerala", pincode: "682001", is_default: false,
    last_used_at: "2026-10-23T10:00:00.000Z", created_at: "2026-10-20T10:00:00.000Z", ...overrides,
  };
}

test("the most recently used saved address sorts first", () => {
  const sorted = sortSavedAddresses([
    address({ id: "older", last_used_at: "2026-10-20T10:00:00.000Z" }),
    address({ id: "latest", last_used_at: "2026-10-23T10:00:00.000Z" }),
  ]);
  assert.equal(sorted[0]?.id, "latest");
});

test("more addresses expands the visible address list", () => {
  const addresses = [address({ id: "first" }), address({ id: "second" })];
  assert.deepEqual(visibleSavedAddresses(addresses, false).map((item) => item.id), ["first"]);
  assert.deepEqual(visibleSavedAddresses(addresses, true).map((item) => item.id), ["first", "second"]);
});

test("selecting an address maps every checkout contact and delivery field", () => {
  assert.deepEqual(checkoutValuesFromAddress(address()), {
    name: "Asha Menon", email: "asha@example.com", phone: "+91 98765 43210", addressLine: "12 Lake Road",
    area: "Aluva", city: "Kochi", state: "Kerala", pincode: "682001",
  });
});

test("address history is saved only after a successful order", () => {
  assert.equal(shouldSaveCheckoutAddress(false), false);
  assert.equal(shouldSaveCheckoutAddress(true), true);
});

test("identical contact and delivery details are treated as one address", () => {
  const first = { name: "Asha  Menon", email: "ASHA@example.com", phone: "+91 98765 43210", addressLine: "12 Lake Road", area: "Aluva", city: "Kochi", state: "Kerala", pincode: "682001" };
  const same = { ...first, phone: "919876543210" };
  assert.equal(sameCheckoutAddress(first, same), true);
  assert.equal(sameCheckoutAddress(first, { ...first, pincode: "682002" }), false);
});

test("guest users do not see saved addresses and ownership is exact", () => {
  assert.equal(shouldShowSavedAddresses(false, 3), false);
  assert.equal(shouldShowSavedAddresses(true, 0), false);
  assert.equal(shouldShowSavedAddresses(true, 1), true);
  assert.equal(addressBelongsToUser("user-a", "user-a"), true);
  assert.equal(addressBelongsToUser("user-b", "user-a"), false);
});

test("the authenticated checkout identity matches the account identity after refresh", () => {
  assert.equal(checkoutUserMatchesAccount("user-a", "user-a"), true);
  assert.equal(checkoutUserMatchesAccount("user-a", "user-b"), false);
  assert.equal(checkoutUserMatchesAccount("user-a", null), false);
});

test("a valid own order becomes a saved-address fallback and is newest first", () => {
  const fallback = savedAddressFromOrder({
    id: "order-1", customer_name: "Asha Menon", customer_email: "asha@example.com", customer_phone: "+91 98765 43210",
    shipping_address: { address_line: "12 Lake Road", area: "Aluva", city: "Kochi", state: "Kerala", pincode: "682001" },
    placed_at: "2026-10-24T10:00:00.000Z",
  });
  assert.equal(fallback?.id, "order-order-1");
  assert.equal(mergeSavedAddresses([], fallback ? [{
    id: "order-1", customer_name: "Asha Menon", customer_email: "asha@example.com", customer_phone: "+91 98765 43210",
    shipping_address: { address_line: "12 Lake Road", area: "Aluva", city: "Kochi", state: "Kerala", pincode: "682001" },
    placed_at: "2026-10-24T10:00:00.000Z",
  }] : [])[0]?.id, "order-order-1");
  assert.equal(savedAddressFromOrder({
    id: "invalid", customer_name: "Asha", customer_email: "asha@example.com", customer_phone: "123",
    shipping_address: {}, placed_at: "2026-10-24T10:00:00.000Z",
  }), null);
});

test("an existing saved address is not duplicated by an identical successful order", () => {
  const saved = address();
  const merged = mergeSavedAddresses([saved], [{
    id: "order-1", customer_name: saved.full_name, customer_email: saved.email, customer_phone: saved.phone,
    shipping_address: { address_line: saved.address_line, area: saved.area, city: saved.city, state: saved.state, pincode: saved.pincode },
    placed_at: "2026-10-24T10:00:00.000Z",
  }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.id, saved.id);
  assert.equal(merged[0]?.last_used_at, "2026-10-24T10:00:00.000Z");
});
