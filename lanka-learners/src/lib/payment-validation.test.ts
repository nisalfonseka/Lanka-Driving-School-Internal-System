import assert from "node:assert/strict";
import test from "node:test";

import { paymentCreateSchema } from "./validations/operations";

const basePayment = {
  clientId: "cm12345678901234567890123",
  paymentDate: "2026-10-08",
  billNumber: "BILL-001",
  amount: 2500,
  paymentType: "INSTALLMENT" as const,
  description: "Monthly payment",
};

test("accepts every supported payment method", () => {
  for (const paymentMethod of ["CASH", "CARD", "BANK_DEPOSIT"] as const) {
    const result = paymentCreateSchema.safeParse({
      ...basePayment,
      paymentMethod,
    });

    assert.equal(result.success, true, paymentMethod);
  }
});

test("requires a supported payment method", () => {
  assert.equal(paymentCreateSchema.safeParse(basePayment).success, false);
  assert.equal(
    paymentCreateSchema.safeParse({
      ...basePayment,
      paymentMethod: "CHEQUE",
    }).success,
    false
  );
});
