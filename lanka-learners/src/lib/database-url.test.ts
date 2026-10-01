import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { enforceVerifiedPostgresSsl } from "./database-url";

describe("enforceVerifiedPostgresSsl", () => {
  it("upgrades legacy SSL aliases to explicit verification", () => {
    const result = enforceVerifiedPostgresSsl(
      "postgresql://user:pass@example.com/db?sslmode=require&schema=public"
    );

    const url = new URL(result);
    assert.equal(url.searchParams.get("sslmode"), "verify-full");
    assert.equal(url.searchParams.get("schema"), "public");
  });

  it("leaves local and already explicit URLs unchanged", () => {
    const local = "postgresql://user:pass@localhost:5432/db?schema=public";
    const verified = "postgresql://user:pass@example.com/db?sslmode=verify-full";

    assert.equal(enforceVerifiedPostgresSsl(local), local);
    assert.equal(enforceVerifiedPostgresSsl(verified), verified);
  });
});
