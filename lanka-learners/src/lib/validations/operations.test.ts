import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  trainingResultSchema,
  trialCreateSchema,
  trialUpdateSchema,
} from "./operations";

describe("trialCreateSchema", () => {
  const base = { clientId: "client-1", trialDate: "2026-09-10" };

  it("needs at least one vehicle class", () => {
    assert.equal(
      trialCreateSchema.safeParse({ ...base, vehicleClassIds: [] }).success,
      false
    );
  });

  it("keeps every vehicle class it is given", () => {
    const result = trialCreateSchema.safeParse({
      ...base,
      vehicleClassIds: ["a", "b"],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data.vehicleClassIds, ["a", "b"]);
    }
  });
});

describe("trialUpdateSchema", () => {
  const base = { id: "trial-1", clientId: "client-1", trialDate: "2026-09-10" };

  it("needs exactly one vehicle class", () => {
    assert.equal(trialUpdateSchema.safeParse(base).success, false);
    assert.equal(
      trialUpdateSchema.safeParse({ ...base, vehicleClassId: "a" }).success,
      true
    );
  });
});

describe("trainingResultSchema", () => {
  const base = { id: "training-1" };
  // Each rejection below starts from a payload that is known to be valid, so a
  // test can only pass by rejecting the one thing it changes.
  const valid = {
    ...base,
    classStatuses: [{ vehicleClassId: "a", status: "COMPLETED" }],
  };

  it("needs at least one class status", () => {
    assert.equal(trainingResultSchema.safeParse(valid).success, true);
    assert.equal(
      trainingResultSchema.safeParse({ ...base, classStatuses: [] }).success,
      false
    );
  });

  it("rejects the same class twice", () => {
    assert.equal(trainingResultSchema.safeParse(valid).success, true);
    const result = trainingResultSchema.safeParse({
      ...base,
      classStatuses: [
        { vehicleClassId: "a", status: "COMPLETED" },
        { vehicleClassId: "a", status: "ABSENT" },
      ],
    });
    assert.equal(result.success, false);
  });

  it("rejects an unknown status", () => {
    assert.equal(trainingResultSchema.safeParse(valid).success, true);
    const result = trainingResultSchema.safeParse({
      ...base,
      classStatuses: [{ vehicleClassId: "a", status: "DONE" }],
    });
    assert.equal(result.success, false);
  });

  it("accepts a status per class with optional notes", () => {
    const result = trainingResultSchema.safeParse({
      ...base,
      classStatuses: [
        { vehicleClassId: "a", status: "COMPLETED" },
        { vehicleClassId: "b", status: "ABSENT" },
      ],
      notes: "  rained off  ",
    });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.notes, "rained off");
  });
});
