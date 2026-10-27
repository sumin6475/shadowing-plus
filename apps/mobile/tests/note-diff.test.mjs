import test from "node:test";
import assert from "node:assert/strict";
import { noteWordDiff } from "../src/lib/note-diff.ts";

test("review highlights only changed words and keeps the user's unchanged claim", () => {
  const diff = noteWordDiff("I built the app for learners", "I built the speaking app for learners");
  assert.equal(diff.before.filter((part) => part.changed).length, 0);
  assert.deepEqual(diff.after.filter((part) => part.changed).map((part) => part.text.trim()), ["speaking"]);
});

test("review marks removed claims before applying a new version", () => {
  const diff = noteWordDiff("We reached ten customers", "We have internal testers");
  assert.ok(diff.before.some((part) => part.changed && part.text.includes("customers")));
  assert.ok(diff.after.some((part) => part.changed && part.text.includes("testers")));
});
