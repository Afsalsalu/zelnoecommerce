import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ACTION_BUTTON_STYLES,
  contrastRatio,
  resolveActionButtonStyles,
  validateActionButtonStyles,
} from "@/lib/action-button-styles";

test("action button defaults match the storefront specification", () => {
  assert.deepEqual(DEFAULT_ACTION_BUTTON_STYLES, {
    add_to_bag: { background: "#242520", text: "#FFFFFF", hover: "#111210" },
    buy_now: { background: "#6B7050", text: "#FFFFFF", hover: "#555A3F" },
    buy_via_whatsapp: { background: "#1F5E47", text: "#FFFFFF", hover: "#174634" },
  });
});

test("valid six-digit colours are normalized and accepted", () => {
  const result = validateActionButtonStyles({
    add_to_bag: { background: "#242520", text: "#ffffff", hover: "#111210" },
    buy_now: { background: "#6b7050", text: "#FFFFFF", hover: "#555a3f" },
    buy_via_whatsapp: { background: "#1f5e47", text: "#ffffff", hover: "#174634" },
  });
  assert.equal(result.valid, true);
  if (result.valid) assert.deepEqual(result.data, DEFAULT_ACTION_BUTTON_STYLES);
});

test("missing or malformed colours fail validation", () => {
  const result = validateActionButtonStyles({ ...DEFAULT_ACTION_BUTTON_STYLES, buy_now: { ...DEFAULT_ACTION_BUTTON_STYLES.buy_now, background: "#fff" } });
  assert.equal(result.valid, false);
  if (!result.valid) assert.match(result.message, /6-digit hex/);
});

test("poor text contrast fails validation", () => {
  const result = validateActionButtonStyles({
    ...DEFAULT_ACTION_BUTTON_STYLES,
    add_to_bag: { background: "#FFFFFF", text: "#FDFDFD", hover: "#111210" },
  });
  assert.equal(result.valid, false);
  if (!result.valid) assert.match(result.message, /contrast/);
  assert.ok(contrastRatio("#FFFFFF", "#242520") >= 4.5);
});

test("invalid persisted settings resolve safely to premium defaults", () => {
  const resolved = resolveActionButtonStyles({ buy_now: { background: "not-a-colour", text: "#FFFFFF", hover: "#555A3F" } });
  assert.deepEqual(resolved.add_to_bag, DEFAULT_ACTION_BUTTON_STYLES.add_to_bag);
  assert.deepEqual(resolved.buy_now, { background: DEFAULT_ACTION_BUTTON_STYLES.buy_now.background, text: "#FFFFFF", hover: "#555A3F" });
  assert.deepEqual(resolved.buy_via_whatsapp, DEFAULT_ACTION_BUTTON_STYLES.buy_via_whatsapp);
});
