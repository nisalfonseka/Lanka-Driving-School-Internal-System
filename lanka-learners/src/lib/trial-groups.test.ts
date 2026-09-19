import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupTrialsByClass } from "./trial-groups";

const A = { id: "a", code: "A", name: "Motorcycles" };
const B = { id: "b", code: "B", name: "Light Vehicles" };
const G = { id: "g", code: "G", name: "Tractors" };

const trial = (id: string, vehicleClass: typeof A | null) => ({
  id,
  vehicleClass,
});

describe("groupTrialsByClass", () => {
  it("groups trials under their class, ordered by class code", () => {
    const groups = groupTrialsByClass(
      [trial("t1", B), trial("t2", A), trial("t3", B)],
      [A, B]
    );
    assert.deepEqual(
      groups.map((group) => [
        group.classRef?.code,
        group.trials.map((row) => row.id),
      ]),
      [
        ["A", ["t2"]],
        ["B", ["t1", "t3"]],
      ]
    );
  });

  it("still lists an assigned class that has no trials yet", () => {
    const groups = groupTrialsByClass([trial("t1", A)], [A, B]);
    assert.deepEqual(
      groups.map((group) => [group.classRef?.code, group.trials.length]),
      [
        ["A", 1],
        ["B", 0],
      ]
    );
  });

  it("shows a class that has trials even when it is no longer assigned", () => {
    const groups = groupTrialsByClass([trial("t1", G)], [A]);
    assert.deepEqual(
      groups.map((group) => group.classRef?.code),
      ["A", "G"]
    );
  });

  it("puts trials with no class in a final group, only when there are any", () => {
    const withLegacy = groupTrialsByClass(
      [trial("t1", null), trial("t2", A)],
      [A]
    );
    assert.deepEqual(
      withLegacy.map((group) => group.classRef?.code ?? null),
      ["A", null]
    );

    const without = groupTrialsByClass([trial("t2", A)], [A]);
    assert.deepEqual(
      without.map((group) => group.classRef?.code ?? null),
      ["A"]
    );
  });
});
