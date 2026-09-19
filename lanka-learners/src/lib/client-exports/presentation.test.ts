import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { countTrainingsWithStatus, trainingStatusText } from "./presentation";
import type { ExportTraining } from "./types";

const base = {
  trainingDate: "2026-09-02T00:00:00.000Z",
  notes: null,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  createdBy: { fullName: null },
  updatedBy: { fullName: null },
};

// Snapshots captured before per-class status carry one status for the whole day
// and stay in storage unchanged, so they must keep rendering.
const oldSnapshotDay = (status: string): ExportTraining => ({
  ...base,
  status,
  vehicleClasses: [{ code: "B", name: "Light Vehicles" }],
});

const classWiseDay = (classes: [string, string][]): ExportTraining => ({
  ...base,
  vehicleClasses: classes.map(([code, status]) => ({ code, name: code, status })),
});

describe("trainingStatusText", () => {
  it("describes the single status of an older snapshot", () => {
    assert.equal(trainingStatusText(oldSnapshotDay("COMPLETED")), "Completed");
  });

  it("describes each class of a newer snapshot, ordered by code", () => {
    assert.equal(
      trainingStatusText(
        classWiseDay([
          ["B", "COMPLETED"],
          ["A", "ABSENT"],
        ])
      ),
      "A: Absent, B: Completed"
    );
  });
});

describe("countTrainingsWithStatus", () => {
  it("counts an older day by its status and a newer day when any class has it", () => {
    const days = [
      oldSnapshotDay("COMPLETED"),
      oldSnapshotDay("ABSENT"),
      classWiseDay([
        ["B", "COMPLETED"],
        ["A", "ABSENT"],
      ]),
      classWiseDay([["A", "PENDING"]]),
    ];

    assert.equal(countTrainingsWithStatus(days, "COMPLETED"), 2);
    assert.equal(countTrainingsWithStatus(days, "ABSENT"), 2);
    assert.equal(countTrainingsWithStatus(days, "CANCELLED"), 0);
  });
});
