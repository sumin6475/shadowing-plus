import test from "node:test";
import assert from "node:assert/strict";
import {
  completedSteps,
  phraseStage,
  readyAt,
  durationLabel,
  isBlankNote,
  NOTE_TEMPLATE,
  dateLabel,
  dateTimeLabel,
  tickCountsAsSpeaking,
  SPEECH_IDLE_GRACE_MS,
  todaysPicks,
  practicedOn,
  periodOf,
  hintPicks,
  outlinePoints,
  compactDuration,
  sessionStats,
} from "../src/lib/mvp-model.ts";
import { splitFigures } from "../src/lib/figures.ts";
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
  // Past an hour, hours and minutes — "77 min 31s" was unreadable.
  assert.equal(durationLabel(3600), "1 h");
  assert.equal(durationLabel(4651), "1 h 17 min");
  assert.equal(durationLabel(7260), "2 h 1 min");
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

test("dates read the same everywhere, with the year only when it differs", () => {
  const now = new Date(2026, 8, 20);
  assert.equal(dateLabel(new Date(2026, 8, 12), now), "Sep 12");
  assert.equal(dateLabel(new Date(2025, 11, 31), now), "Dec 31, 2025");
  assert.equal(dateLabel("not a date", now), "");
  assert.match(dateTimeLabel(new Date(2026, 8, 12, 13, 5), now), /^Sep 12 · /);
});

test("a silent mirror stops banking speaking time", () => {
  const now = 1_000_000;
  assert.equal(tickCountsAsSpeaking(now, now), true);
  assert.equal(tickCountsAsSpeaking(now, now - 3000), true, "a pause between sentences still counts");
  assert.equal(tickCountsAsSpeaking(now, now - SPEECH_IDLE_GRACE_MS - 1), false);
  // The 59-minute silent session: only the grace window could ever be counted.
  assert.equal(tickCountsAsSpeaking(now, now - 59 * 60_000), false);
});

test("before the first words, no second counts as speaking", () => {
  // heardAt starts at 0 ("never heard"): a mirror finished in silence saves
  // 0 seconds instead of the old start-up grace (the "1s, no words" screen).
  assert.equal(tickCountsAsSpeaking(Date.now(), 0), false);
});

test("mirror cards: the phrase you came from, then today's picks, then Ready", () => {
  const now = new Date(2026, 8, 26, 12);
  const at = (d) => new Date(2026, 8, d, 9).toISOString();
  const done = (d) => ({ pronounced_at: at(d), examples_seen_at: at(d), own_example_at: at(d) });
  const mk = (id, created, steps = {}) => ({ ...empty, id, createdAt: at(created), ...steps });
  const phrases = [
    mk("ready-old", 1, done(10)),
    mk("ready-new", 2, done(20)),
    mk("learning", 3, { pronounced_at: at(4) }),
    mk("collected", 5),
  ];
  assert.deepEqual(
    hintPicks(phrases, 5, now).map((p) => p.id),
    ["learning", "collected", "ready-new", "ready-old"],
    "picks first, then Ready by recency — every phrase is eligible",
  );
  assert.deepEqual(hintPicks(phrases, 2, now).map((p) => p.id), ["learning", "collected"]);
  assert.deepEqual(
    hintPicks(phrases, 3, now, "ready-old").map((p) => p.id),
    ["ready-old", "learning", "collected"],
    "the phrase you came from leads, once",
  );
  assert.deepEqual(hintPicks([], 5, now), []);
});

test("a note outline keeps its points, labelled by section", () => {
  assert.deepEqual(outlinePoints(NOTE_TEMPLATE.split("\n")), [], "the untouched template has no points");
  assert.deepEqual(
    outlinePoints(["Opening", "- say hi", "", "Body", "-  ", "- the project", "a loose line"]),
    [
      { section: "Opening", text: "say hi" },
      { section: "Body", text: "the project" },
      { section: "Body", text: "a loose line" },
    ],
  );
});

test("session stats: words, different words, and a pace only once it means something", () => {
  const stats = sessionStats("So I went, and I went again. It’s fine!", 60);
  assert.equal(stats.words, 9);
  assert.equal(stats.distinct, 7, "case and punctuation don't make a word new");
  assert.equal(stats.wpm, 9);
  assert.equal(sessionStats("three quick words", 2).wpm, null, "under 15 seconds");
  assert.deepEqual(sessionStats("", 0), { words: 0, distinct: 0, wpm: null });
});

test("stat durations stay short enough for a grid cell", () => {
  assert.equal(compactDuration(0), "0s");
  assert.equal(compactDuration(48.9), "48s");
  assert.equal(compactDuration(60), "1m");
  assert.equal(compactDuration(192), "3m 12s");
  assert.equal(compactDuration(4651), "1h 17m");
  assert.equal(compactDuration(7200), "2h");
});

test("figures split out of serif text so a 1 never reads as an l", () => {
  assert.deepEqual(splitFigures("11 min 4s"), [
    { text: "11", figure: true },
    { text: " min ", figure: false },
    { text: "4", figure: true },
    { text: "s", figure: false },
  ]);
  assert.deepEqual(splitFigures("at 1:05, 24/7"), [
    { text: "at ", figure: false },
    { text: "1:05", figure: true },
    { text: ", ", figure: false },
    { text: "24/7", figure: true },
  ]);
  assert.deepEqual(splitFigures("Phrases"), [{ text: "Phrases", figure: false }]);
});
