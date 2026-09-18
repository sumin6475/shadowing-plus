import test from "node:test";
import assert from "node:assert/strict";
import {
  completedSteps,
  phraseStage,
  readyAt,
  durationLabel,
  isBlankNote,
  NOTE_TEMPLATE,
  todaysPicks,
  practicedOn,
  periodOf,
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

test("today's picks are the oldest unfinished phrases and stay put once practiced", () => {
  const now = new Date(2026, 8, 18, 15);
  const at = (d) => new Date(2026, 8, d, 9).toISOString();
  const mk = (id, created, steps = {}) => ({ ...empty, id, createdAt: at(created), ...steps });
  const all = at(10);
  const phrases = [
    mk("new", 17),
    mk("ready-long-ago", 1, { pronounced_at: all, examples_seen_at: all, own_example_at: all }),
    mk("old", 2),
    mk("mid", 5),
    mk("finished-today", 3, {
      pronounced_at: all,
      examples_seen_at: all,
      own_example_at: now.toISOString(),
    }),
  ];
  assert.deepEqual(todaysPicks(phrases, 3, now).map((p) => p.id), ["old", "finished-today", "mid"]);
  assert.equal(practicedOn(phrases[4], now), true);
  assert.equal(practicedOn(phrases[2], now), false);
});

test("periods follow calendar days, not 24-hour windows", () => {
  const now = new Date(2026, 8, 18, 0, 30);
  const at = (d, h = 23) => new Date(2026, 8, d, h).toISOString();
  assert.equal(periodOf(at(18, 0), now), "Today");
  assert.equal(periodOf(at(17), now), "Yesterday");
  assert.equal(periodOf(at(11), now), "Last 7 days");
  assert.equal(periodOf(at(10), now), "Last 30 days");
  assert.equal(periodOf(new Date(2026, 7, 19, 12).toISOString(), now), "Last 30 days");
  assert.equal(periodOf(new Date(2026, 7, 18, 12).toISOString(), now), "Earlier");
});
