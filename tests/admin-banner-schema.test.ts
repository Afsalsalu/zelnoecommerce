import assert from "node:assert/strict";
import test from "node:test";
import {
  HERO_BANNER_SCHEMA_COLUMNS,
  HERO_OVERLAY_COLUMNS,
  bannerDatabaseErrorMessage,
  heroBannerDatabaseField,
  heroBannerSchemaStatusFromError,
} from "../src/lib/admin-banner-schema";

test("hero banner schema check uses the exact overlay migration columns", () => {
  assert.deepEqual(HERO_OVERLAY_COLUMNS, ["overlay_enabled", "overlay_color", "overlay_opacity", "overlay_direction"]);
  for (const column of HERO_OVERLAY_COLUMNS) assert.ok(HERO_BANNER_SCHEMA_COLUMNS.includes(column));
});

test("schema-cache errors identify the missing overlay column without exposing raw details", () => {
  const error = {
    code: "PGRST204",
    message: "Could not find the 'overlay_opacity' column of 'homepage_banners' in the schema cache",
    details: "internal database detail",
    hint: "internal database hint",
  };
  const status = heroBannerSchemaStatusFromError(error);
  assert.equal(status.ready, false);
  if (status.ready) return;
  assert.equal(status.kind, "schema-cache");
  assert.equal(status.field, "overlay_opacity");
  assert.match(status.message, /overlay_opacity/);
  assert.doesNotMatch(status.message, /internal database detail|internal database hint|PGRST204/);
});

test("database schema errors and access errors are classified safely", () => {
  const missing = heroBannerSchemaStatusFromError({ code: "42703", message: 'column "overlay_direction" does not exist' });
  assert.equal(missing.ready, false);
  if (!missing.ready) {
    assert.equal(missing.kind, "missing-schema");
    assert.equal(missing.field, "overlay_direction");
    assert.match(missing.message, /20261023140000_hero_banner_overlays\.sql/);
  }

  const denied = heroBannerSchemaStatusFromError({ code: "42501", message: "permission denied for table homepage_banners" });
  assert.equal(denied.ready, false);
  if (!denied.ready) {
    assert.equal(denied.kind, "permission");
    assert.equal(denied.field, undefined);
    assert.equal(denied.message, "Admin database access configuration issue");
  }

  const rejectedServiceKey = heroBannerSchemaStatusFromError({ status: 401, message: "Invalid API key" });
  assert.equal(rejectedServiceKey.ready, false);
  if (!rejectedServiceKey.ready) assert.equal(rejectedServiceKey.message, "Admin database access configuration issue");
});

test("banner database errors remain user-safe while preserving field mapping", () => {
  const error = { code: "23514", message: "new row violates check constraint", details: "overlay_opacity must be between 0 and 80" };
  assert.equal(heroBannerDatabaseField(error), "overlay_opacity");
  assert.equal(bannerDatabaseErrorMessage(error), "Overlay opacity must be between 0% and 80%.");
  assert.doesNotMatch(bannerDatabaseErrorMessage(error), /23514|constraint/);
});
