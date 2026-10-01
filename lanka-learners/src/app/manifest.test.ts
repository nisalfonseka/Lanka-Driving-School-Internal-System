import assert from "node:assert/strict";
import { describe, it } from "node:test";

import manifest from "./manifest";

describe("PWA manifest", () => {
  it("is installable with standard and maskable icons", () => {
    const value = manifest();

    assert.equal(value.start_url, "/");
    assert.equal(value.scope, "/");
    assert.equal(value.display, "standalone");
    assert.ok(value.name);
    assert.ok(value.short_name);
    assert.ok(
      value.icons?.some(
        (icon) => icon.sizes === "192x192" && icon.purpose === "any"
      )
    );
    assert.ok(
      value.icons?.some(
        (icon) => icon.sizes === "512x512" && icon.purpose === "any"
      )
    );
    assert.ok(
      value.icons?.some(
        (icon) => icon.sizes === "512x512" && icon.purpose === "maskable"
      )
    );
  });
});
