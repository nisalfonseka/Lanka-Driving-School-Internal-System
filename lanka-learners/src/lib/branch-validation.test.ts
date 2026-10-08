import assert from "node:assert/strict";
import test from "node:test";

import { branchCreateSchema, employeeCreateSchema } from "./validations/admin";

test("an employee account requires a branch", () => {
  const employee = {
    fullName: "Test Employee",
    username: "test.employee",
    email: "",
    mobile: "",
    password: "Password123",
  };

  assert.equal(employeeCreateSchema.safeParse(employee).success, false);
  assert.equal(
    employeeCreateSchema.safeParse({
      ...employee,
      branchId: "branch_kekirawa",
    }).success,
    true
  );
});

test("branch codes are normalised and unsafe codes are rejected", () => {
  const valid = branchCreateSchema.safeParse({ code: " kek ", name: "Kekirawa" });
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.code, "KEK");

  assert.equal(
    branchCreateSchema.safeParse({ code: "KEK/01", name: "Invalid" }).success,
    false
  );
});
