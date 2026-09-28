import test from "node:test";
import assert from "node:assert/strict";
import {
  emailProblem,
  isValidEmail,
  passwordMeetsChecks,
  submitProblem,
} from "../src/lib/auth-form.ts";

test("a space inside the address is named as the problem", () => {
  // Regression: "sumin002 @gmail.com" silently disabled the sign-in button.
  assert.equal(isValidEmail("sumin002 @gmail.com"), false);
  assert.match(emailProblem("sumin002 @gmail.com"), /space/i);
  assert.match(emailProblem("sumin002@ gmail.com"), /space/i);
});

test("surrounding whitespace is forgiven", () => {
  assert.equal(isValidEmail("  sumin002@gmail.com "), true);
  assert.equal(emailProblem("  sumin002@gmail.com "), null);
});

test("other malformed emails get a specific line", () => {
  assert.equal(emailProblem(""), "Enter your email.");
  assert.match(emailProblem("sumin002.gmail.com"), /@/);
  assert.match(emailProblem("sumin002@gmail"), /complete/i);
});

test("submitProblem reports the first blocker in form order", () => {
  assert.match(submitProblem("sign_in", "sumin002 @gmail.com", "x"), /space/i);
  assert.equal(submitProblem("sign_in", "a@b.co", ""), "Enter your password.");
  assert.equal(submitProblem("sign_in", "a@b.co", "weak"), null);
  assert.match(submitProblem("sign_up", "a@b.co", "weak"), /requirements/i);
  assert.equal(submitProblem("sign_up", "a@b.co", "Strong1pw"), null);
  assert.equal(passwordMeetsChecks("Strong1pw"), true);
});
