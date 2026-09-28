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
    clientName: "Nimal Perera",
    admissionNumber: "ADM-1042",
  };

  it("builds a registration message with the admission number", () => {
    assert.equal(
      buildSmsMessage("CLIENT_REGISTERED", base),
      "Welcome Nimal. Your registration is complete. Admission No: ADM-1042. - Lanka Learners Driving School"
    );
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
      /\(B, A1\) is Pass/
    );
  });
});
