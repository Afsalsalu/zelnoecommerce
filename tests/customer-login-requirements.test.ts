import assert from "node:assert/strict";
import test from "node:test";
import {
  customerActionRequiresLogin,
  customerLoginRequirementsSchema,
  DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS,
  resolveCustomerLoginRequirements,
} from "../src/lib/customer-login-requirements";
import { customerLoginPath, readPendingCustomerAction } from "../src/lib/customer-action";

test("login requirements default every customer action to guest access", () => {
  for (const action of ["wishlist", "cart", "checkout", "buy-now", "whatsapp"] as const) {
    assert.equal(customerActionRequiresLogin(action, false, DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS), false);
    assert.equal(customerActionRequiresLogin(action, true, { ...DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, [`require_login_${action.replace("-", "_")}`]: true }), false);
  }
});

test("each toggle protects only its matching guest action", () => {
  const fields = [
    ["require_login_wishlist", "wishlist"],
    ["require_login_cart", "cart"],
    ["require_login_checkout", "checkout"],
    ["require_login_buy_now", "buy-now"],
    ["require_login_whatsapp", "whatsapp"],
  ] as const;
  for (const [field, action] of fields) {
    const requirements = { ...DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, [field]: true };
    assert.equal(customerActionRequiresLogin(action, false, requirements), true, `${field} should protect ${action}`);
    for (const other of ["wishlist", "cart", "checkout", "buy-now", "whatsapp"] as const) {
      if (other !== action && !(field === "require_login_checkout" && other === "buy-now")) assert.equal(customerActionRequiresLogin(other, false, requirements), false, `${field} should not protect ${other}`);
    }
  }
});

test("checkout protection cannot be bypassed by the Buy Now toggle being off", () => {
  const requirements = { ...DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, require_login_checkout: true };
  assert.equal(customerActionRequiresLogin("checkout", false, requirements), true);
  assert.equal(customerActionRequiresLogin("buy-now", false, requirements), true);
});

test("settings are strictly boolean and unknown fields are rejected", () => {
  assert.equal(customerLoginRequirementsSchema.safeParse(DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS).success, true);
  assert.equal(customerLoginRequirementsSchema.safeParse({ ...DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, require_login_cart: "yes" }).success, false);
  assert.equal(customerLoginRequirementsSchema.safeParse({ ...DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, private_setting: true }).success, false);
  assert.deepEqual(resolveCustomerLoginRequirements({ require_login_cart: true }), { ...DEFAULT_CUSTOMER_LOGIN_REQUIREMENTS, require_login_cart: true });
});

test("login redirects stay internal and pending action storage rejects unsafe data", () => {
  assert.equal(customerLoginPath("https://example.com/steal"), "/login?next=%2Fshop");
  assert.equal(customerLoginPath("/checkout?buyNow=1"), "/login?next=%2Fcheckout%3FbuyNow%3D1");
  assert.equal(readPendingCustomerAction(), null);
});
