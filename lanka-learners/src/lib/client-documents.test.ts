import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  changedFields,
  filledFields,
  lockedFieldsChanged,
  toDocumentValues,
  type DocumentValues,
} from "./client-documents";

const blank: DocumentValues = {
  medicalReportNumber: null,
  medicalIssueDate: null,
  schoolCertificateNumber: null,
  dmtBarcodeNumber: null,
  learnerPermitNumber: null,
  learnerPermitIssueDate: null,
};

describe("lockedFieldsChanged — what an employee may not do", () => {
  it("allows filling fields that are still blank", () => {
    const next = {
      ...blank,
      medicalReportNumber: "MED-1",
      learnerPermitIssueDate: "2026-08-15",
    };
    assert.deepEqual(lockedFieldsChanged(blank, next), []);
  });

  it("rejects changing a field that already has a value", () => {
    const current = { ...blank, medicalReportNumber: "MED-1" };
    const next = { ...current, medicalReportNumber: "MED-2" };
    assert.deepEqual(lockedFieldsChanged(current, next), ["medicalReportNumber"]);
  });

  it("rejects clearing a field that already has a value", () => {
    const current = { ...blank, dmtBarcodeNumber: "DMT-9" };
    const next = { ...current, dmtBarcodeNumber: null };
    assert.deepEqual(lockedFieldsChanged(current, next), ["dmtBarcodeNumber"]);
  });

  it("accepts resubmitting filled fields unchanged while filling a blank one", () => {
    const current = { ...blank, medicalReportNumber: "MED-1" };
    const next = { ...current, schoolCertificateNumber: "SCH-1" };
    assert.deepEqual(lockedFieldsChanged(current, next), []);
  });

  it("treats whitespace-only values as blank", () => {
    const current = { ...blank, learnerPermitNumber: "   " };
    const next = { ...blank, learnerPermitNumber: "LP-1" };
    assert.deepEqual(lockedFieldsChanged(current, next), []);
  });

  it("reports every locked field, in form order", () => {
    const current = {
      ...blank,
      medicalReportNumber: "A",
      learnerPermitNumber: "B",
    };
    const next = { ...current, medicalReportNumber: "X", learnerPermitNumber: "Y" };
    assert.deepEqual(lockedFieldsChanged(current, next), [
      "medicalReportNumber",
      "learnerPermitNumber",
    ]);
  });
});

describe("filledFields", () => {
  it("lists the fields that already hold a value", () => {
    const current = {
      ...blank,
      medicalIssueDate: "2026-08-01",
      dmtBarcodeNumber: "DMT-9",
      schoolCertificateNumber: "  ",
    };
    assert.deepEqual(filledFields(current), [
      "medicalIssueDate",
      "dmtBarcodeNumber",
    ]);
  });
});

describe("changedFields", () => {
  it("lists only fields whose value differs, treating blank and whitespace alike", () => {
    const current = {
      ...blank,
      medicalReportNumber: "MED-1",
      dmtBarcodeNumber: "  ",
    };
    const next = {
      ...current,
      schoolCertificateNumber: "SCH-1",
      dmtBarcodeNumber: null,
    };
    assert.deepEqual(changedFields(current, next), ["schoolCertificateNumber"]);
  });
});

describe("toDocumentValues", () => {
  it("returns all blanks when the client has no document row", () => {
    assert.deepEqual(toDocumentValues(null), blank);
  });

  it("turns dates into YYYY-MM-DD strings and trims text", () => {
    const values = toDocumentValues({
      medicalReportNumber: " MED-1 ",
      medicalIssueDate: new Date("2026-08-01T00:00:00.000Z"),
      schoolCertificateNumber: null,
      dmtBarcodeNumber: "",
      learnerPermitNumber: null,
      learnerPermitIssueDate: null,
    });
    assert.equal(values.medicalReportNumber, "MED-1");
    assert.equal(values.medicalIssueDate, "2026-08-01");
    assert.equal(values.dmtBarcodeNumber, null);
  });
});
