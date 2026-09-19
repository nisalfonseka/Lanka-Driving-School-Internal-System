import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countCompletedTrainingDays,
  diffClassLinks,
  summariseClassStatuses,
} from "./training-status";

describe("countCompletedTrainingDays", () => {
  it("counts a day when at least one of its classes was completed", () => {
    const days = [
      { vehicleClasses: [{ status: "COMPLETED" }, { status: "ABSENT" }] },
      { vehicleClasses: [{ status: "ABSENT" }] },
      { vehicleClasses: [{ status: "PENDING" }, { status: "CANCELLED" }] },
      { vehicleClasses: [{ status: "COMPLETED" }] },
    ];
    assert.equal(countCompletedTrainingDays(days), 2);
  });

  it("is zero when there are no training days", () => {
    assert.equal(countCompletedTrainingDays([]), 0);
  });
});

describe("diffClassLinks", () => {
  const existing = [
    { vehicleClassId: "b", status: "ABSENT" },
    { vehicleClassId: "a", status: "COMPLETED" },
  ];

  it("keeps classes that stay, so their status is never reset", () => {
    const { remove, add } = diffClassLinks(existing, ["a", "b"]);
    assert.deepEqual(remove, []);
    assert.deepEqual(add, []);
  });

  it("removes dropped classes and adds new ones", () => {
    const { remove, add } = diffClassLinks(existing, ["b", "g"]);
    assert.deepEqual(
      remove.map((link) => link.vehicleClassId),
      ["a"]
    );
    assert.deepEqual(add, ["g"]);
  });

  it("ignores duplicate ids in the request", () => {
    assert.deepEqual(diffClassLinks([], ["a", "a", "b"]).add, ["a", "b"]);
  });
});

describe("summariseClassStatuses", () => {
  it("reads as 'CODE: Status', ordered by class code", () => {
    assert.deepEqual(
      summariseClassStatuses([
        { code: "B", status: "ABSENT" },
        { code: "A", status: "COMPLETED" },
      ]),
      ["A: Completed", "B: Absent"]
    );
  });
});
