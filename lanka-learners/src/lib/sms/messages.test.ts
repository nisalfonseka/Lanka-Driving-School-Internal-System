import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSmsMessage, normaliseSriLankanMobile } from "./messages";

describe("normaliseSriLankanMobile", () => {
  it("normalises accepted local and international formats", () => {
    assert.equal(normaliseSriLankanMobile("071 234 5678"), "94712345678");
    assert.equal(normaliseSriLankanMobile("+94 71-234-5678"), "94712345678");
    assert.equal(normaliseSriLankanMobile("94712345678"), "94712345678");
  });

  it("rejects numbers outside the supported Sri Lankan format", () => {
    assert.equal(normaliseSriLankanMobile("07123"), null);
    assert.equal(normaliseSriLankanMobile("441234567890"), null);
  });
});

describe("buildSmsMessage", () => {
  const base = {
    businessName: "Lanka Learners Driving School",
    businessPhone: "077 123 4567",
    businessWebsite: "https://lankadrivingschool.com/",
    clientName: "Nimal Perera",
    admissionNumber: "ADM-1042",
    branchName: "Kekirawa",
  };

  it("builds a registration message with the admission number", () => {
    assert.equal(
      buildSmsMessage("CLIENT_REGISTERED", base),
      [
        "Hi Nimal,",
        "Welcome to Lanka Learners Driving School!",
        "Registration: Complete",
        "Admission No: ADM-1042",
        "Branch: Kekirawa",
        "Information: lankadrivingschool.com",
        "Inquiries: 077 123 4567",
        "Thank you and drive safely!",
        "- Lanka Learners Driving School",
      ].join("\n")
    );
  });

  it("includes complete payment details", () => {
    const result = buildSmsMessage("PAYMENT_RECEIVED", {
      ...base,
      amount: 2130,
      billNumber: "BILL-108",
      date: "2026-10-08",
      paymentType: "INSTALLMENT",
      paymentMethod: "BANK_DEPOSIT",
    });

    assert.match(result, /Bill No: BILL-108/);
    assert.match(result, /Payment Date: 08 Oct 2026/);
    assert.match(result, /Amount: Rs\. 2,130\.00/);
    assert.match(result, /Payment Type: Installment/);
    assert.match(result, /Payment Method: Bank Deposit/);
  });

  it("builds dated and result messages", () => {
    assert.match(
      buildSmsMessage("WRITTEN_EXAM_SCHEDULED", {
        ...base,
        date: "2026-10-04",
      }),
      /04 Oct 2026/
    );
    assert.match(
      buildSmsMessage("PRACTICAL_TRIAL_RESULT", {
        ...base,
        vehicleClasses: "B, A1",
        result: "PASS",
      }),
      /Vehicle Class: B, A1\nResult: Pass/
    );
  });
});
