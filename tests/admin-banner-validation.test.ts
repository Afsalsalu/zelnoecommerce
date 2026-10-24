import assert from "node:assert/strict";
import test from "node:test";
import { validateHeroBannerDraft, type HeroBannerDraft } from "../src/lib/admin-banner-validation";

const validBanner = (): HeroBannerDraft => ({
  heading: "A considered collection",
  description: "Objects for everyday living.",
  cta_label: "Shop the edit",
  cta_href: "/shop",
  desktop_image_url: "https://images.example.com/hero.jpg",
  mobile_image_url: "",
  image_alt: "",
  overlay_enabled: true,
  overlay_color: "dark",
  overlay_opacity: 35,
  overlay_direction: "bottom-to-top",
  sort_order: 0,
  is_active: true,
});

test("valid existing banner values allow overlay-only edits and optional alt text", () => {
  const banner = validBanner();
  banner.overlay_color = "light";
  banner.overlay_opacity = 25;
  banner.overlay_direction = "left-to-right";
  assert.deepEqual(validateHeroBannerDraft(banner), {});
});

test("browser validation reports each missing or malformed banner field", () => {
  const errors = validateHeroBannerDraft({ ...validBanner(), heading: "", cta_label: "", cta_href: "https://example.com", desktop_image_url: "not-an-image", overlay_opacity: 81 });
  assert.equal(errors.heading, "Heading is required.");
  assert.equal(errors.cta_label, "Button label is required.");
  assert.equal(errors.cta_href, "Use a site-relative path such as /shop.");
  assert.equal(errors.desktop_image_url, "Desktop image URL must be valid.");
  assert.equal(errors.overlay_opacity, "Opacity must be between 0% and 80%.");
  assert.equal(errors.image_alt, undefined);
});
