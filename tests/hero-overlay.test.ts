import assert from "node:assert/strict";
import test from "node:test";
import { HERO_OVERLAY_DEFAULTS, heroOverlayStyle, normalizeHeroOverlaySettings } from "../src/lib/hero-overlay";

test("hero overlays use safe defaults when older banners have no settings", () => {
  assert.deepEqual(normalizeHeroOverlaySettings(), HERO_OVERLAY_DEFAULTS);
  assert.deepEqual(heroOverlayStyle(), { backgroundImage: "linear-gradient(to top, rgba(0, 0, 0, 0.35), transparent)" });
});

test("hero overlay settings produce the selected color, opacity, and direction", () => {
  assert.deepEqual(heroOverlayStyle({ overlay_color: "dark", overlay_opacity: 15, overlay_direction: "full" }), { backgroundColor: "rgba(0, 0, 0, 0.15)" });
  assert.deepEqual(heroOverlayStyle({ overlay_color: "dark", overlay_opacity: 55, overlay_direction: "bottom-to-top" }), { backgroundImage: "linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent)" });
  assert.deepEqual(heroOverlayStyle({ overlay_color: "light", overlay_opacity: 25, overlay_direction: "left-to-right" }), { backgroundImage: "linear-gradient(to right, rgba(255, 255, 255, 0.25), transparent)" });
});

test("disabled and zero-opacity overlays do not cover banner content or controls", () => {
  assert.deepEqual(heroOverlayStyle({ overlay_enabled: false }), {});
  assert.deepEqual(heroOverlayStyle({ overlay_opacity: 0 }), {});
});
