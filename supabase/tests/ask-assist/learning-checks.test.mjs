import assert from "node:assert/strict";
import test from "node:test";
import { checkLearningConstraints } from "./learning-checks.mjs";

test("flags the meaning-changing short replies seen in the simulator", () => {
  const c = { learning_constraints: { forbidden_expressions: ["On my way!", "Late!"] } };
  assert.equal(checkLearningConstraints(c, { expressions: [{ en: "On my way!" }] }).length, 1);
  assert.equal(checkLearningConstraints(c, { expressions: [{ en: "Late!" }] }).length, 1);
  assert.deepEqual(checkLearningConstraints(c, { expressions: [{ en: "I'll be a bit late." }] }), []);
});

test("a one-sentence Note uses only Body", () => {
  const c = { learning_constraints: { single_sentence_draft: true } };
  assert.deepEqual(checkLearningConstraints(c, { draft: { opening: "", body: "Hi, I'm Sam!", closing: "" } }), []);
  assert.equal(checkLearningConstraints(c, { draft: { opening: "Hi.", body: "I'm Sam.", closing: "" } }).length, 1);
  assert.equal(checkLearningConstraints(c, { draft: { opening: "", body: "Hi. I'm Sam.", closing: "" } }).length, 1);
});

test("flags excessively formal wording for ordinary workplace lateness", () => {
  const c = { learning_constraints: { forbidden_expression_prefixes: ["I regret to inform you"] } };
  assert.equal(checkLearningConstraints(c, { expressions: [{ en: "I regret to inform you that I will be late." }] }).length, 1);
  assert.deepEqual(checkLearningConstraints(c, { expressions: [{ en: "Sorry, I may be a little late." }] }), []);
});
