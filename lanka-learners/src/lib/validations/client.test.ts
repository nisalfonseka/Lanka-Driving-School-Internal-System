import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientDocumentsSchema, clientStatusSchema } from "./client";

describe("clientDocumentsSchema", () => {
  const base = { clientId: "client-1" };

  it("accepts an empty document set — every field is optional", () => {
    const result = clientDocumentsSchema.safeParse({
      ...base,
      medicalReportNumber: "",
      medicalIssueDate: "",
      learnerPermitNumber: "  ",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.medicalReportNumber, undefined);
      assert.equal(result.data.medicalIssueDate, undefined);
      assert.equal(result.data.learnerPermitNumber, undefined);
    }
  });

  it("trims values that are provided", () => {
    const result = clientDocumentsSchema.safeParse({
      ...base,
      schoolCertificateNumber: "  SCH-1 ",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.schoolCertificateNumber, "SCH-1");
    }
  });

  it("rejects a date that does not exist", () => {
    const result = clientDocumentsSchema.safeParse({
      ...base,
      medicalIssueDate: "2026-02-31",
    });
    assert.equal(result.success, false);
  });

  it("needs to know which client it belongs to", () => {
    assert.equal(clientDocumentsSchema.safeParse({}).success, false);
  });
});

describe("clientStatusSchema", () => {
  it("accepts Active and Completed", () => {
    for (const status of ["ACTIVE", "COMPLETED"]) {
      assert.equal(
        clientStatusSchema.safeParse({ clientId: "client-1", status }).success,
        true
      );
    }
  });

  it("rejects any other status", () => {
    assert.equal(
      clientStatusSchema.safeParse({ clientId: "client-1", status: "INACTIVE" })
        .success,
      false
    );
  });
});
