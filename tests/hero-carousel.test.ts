import assert from "node:assert/strict";
import test from "node:test";
import { heroHasControls, nextHeroIndex, shouldAutoplayHero, swipeStep } from "../src/lib/hero-carousel";

test("zero and one hero banner render without carousel controls or autoplay", () => {
  assert.equal(heroHasControls(0), false);
  assert.equal(heroHasControls(1), false);
  assert.equal(shouldAutoplayHero(0, false, false), false);
  assert.equal(shouldAutoplayHero(1, false, false), false);
  assert.equal(nextHeroIndex(0, 0, 1), 0);
  assert.equal(nextHeroIndex(0, 1, 1), 0);
});

test("two and three hero banners loop infinitely in either direction", () => {
  assert.equal(heroHasControls(2), true);
  assert.equal(heroHasControls(3), true);
  assert.equal(shouldAutoplayHero(2, false, false), true);
  assert.equal(nextHeroIndex(1, 2, 1), 0);
  assert.equal(nextHeroIndex(0, 3, -1), 2);
});

test("autoplay pauses for reduced motion and interaction", () => {
  assert.equal(shouldAutoplayHero(3, true, false), false);
  assert.equal(shouldAutoplayHero(3, false, true), false);
  assert.equal(swipeStep(20), 0);
  assert.equal(swipeStep(-80), 1);
  assert.equal(swipeStep(80), -1);
});
