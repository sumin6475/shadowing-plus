import test from "node:test";
import assert from "node:assert/strict";
import {
  completedSteps,
  phraseStage,
  readyAt,
  durationLabel,
  isBlankNote,
  NOTE_TEMPLATE,
} from "../src/lib/mvp-model.ts";
const empty = {
  pronounced_at: null,
  examples_seen_at: null,
  own_example_at: null,
};
test("all eight completion combinations derive a stage without enforcing order", () => {
  for (let bits = 0; bits < 8; bits++) {
    const p = {
      pronounced_at: bits & 1 ? "2026-09-12T10:00:00Z" : null,
      examples_seen_at: bits & 2 ? "2026-09-15T10:00:00Z" : null,
      own_example_at: bits & 4 ? "2026-09-14T10:00:00Z" : null,
    };
    const count = [1, 2, 4].filter((b) => bits & b).length;
    assert.equal(completedSteps(p), count);
    assert.equal(
      phraseStage(p),
      count === 3 ? "Ready" : count === 0 ? "Collected" : "Learning",
    );
    assert.equal(
      readyAt(p),
      count === 3 ? Date.parse("2026-09-15T10:00:00Z") : 0,
    );
  }
});
test("unchecking a step removes ready eligibility and rechecking moves recency", () => {
  const ready = {
    ...empty,
    pronounced_at: "2026-09-12",
    examples_seen_at: "2026-09-13",
    own_example_at: "2026-09-14",
  };
  assert.equal(readyAt({ ...ready, pronounced_at: null }), 0);
  assert.ok(
    readyAt({ ...ready, pronounced_at: "2026-09-17" }) > readyAt(ready),
  );
});
test("duration reflects seconds without rounding a minute up", () => {
  assert.equal(durationLabel(0), "0s");
  assert.equal(durationLabel(59.9), "59s");
  assert.equal(durationLabel(60), "1 min");
  assert.equal(durationLabel(192), "3 min 12s");
});

test("an untouched new note is blank, any real word is not", () => {
  assert.equal(isBlankNote("", NOTE_TEMPLATE), true);
  assert.equal(isBlankNote("  ", ""), true);
  assert.equal(isBlankNote("", "Opening\n-\n•  \n\nClosing"), true);
  assert.equal(isBlankNote("meetup", NOTE_TEMPLATE), false);
  assert.equal(isBlankNote("", "Opening\n- aa"), false);
  assert.equal(isBlankNote("", "The starting point"), false);
});
