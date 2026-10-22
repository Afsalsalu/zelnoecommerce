import assert from "node:assert/strict";
import test from "node:test";
import { authenticateWithPassword, getLoginRedirectPath, parseLoginFormData } from "../src/lib/auth-flow";

test("successful password authentication returns no failure and keeps an internal redirect", async () => {
  const client = { auth: { signInWithPassword: async () => ({ error: null }) } };
  const failure = await authenticateWithPassword(client, { email: "member@example.com", password: "correct-password" });

  assert.equal(failure, null);
  assert.equal(getLoginRedirectPath("/account"), "/account");
});

test("invalid credentials return a visible failure", async () => {
  const client = { auth: { signInWithPassword: async () => ({ error: new Error("invalid login") }) } };
  const failure = await authenticateWithPassword(client, { email: "member@example.com", password: "wrong-password" });

  assert.deepEqual(failure, { error: "That email and password combination could not be verified." });
});

test("unsafe next paths are rejected and form parsing falls back to account", () => {
  assert.equal(getLoginRedirectPath("https://example.com/account"), "/account");
  assert.equal(getLoginRedirectPath("//example.com/account"), "/account");

  const formData = new FormData();
  formData.set("email", "member@example.com");
  formData.set("password", "correct-password");
  formData.set("next", "https://example.com/account");
  const parsed = parseLoginFormData(formData);

  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.value.nextPath, "/account");
});
