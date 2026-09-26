import test from "node:test";
import assert from "node:assert/strict";
import { normalize, rank, scoreMatch, snippet } from "../src/lib/search-model.ts";

test("title matches outrank secondary ones, in a fixed order", () => {
  assert.equal(scoreMatch("as it", "As it is"), 100, "title starts with the query");
  assert.equal(scoreMatch("it is", "As it is"), 80, "a title word starts with it");
  assert.equal(scoreMatch("s it", "As it is"), 60, "title contains it mid-word");
  assert.equal(scoreMatch("is as", "As it is"), 40, "every word is in the title, out of order");
  assert.equal(scoreMatch("그대로", "As it is", ["있는 그대로"]), 20, "only the translation matches");
  assert.equal(scoreMatch("sorry", "As it is", ["있는 그대로"]), 0, "no match");
  assert.equal(scoreMatch("   ", "As it is"), 0, "blank query matches nothing");
});

test("every query word must appear somewhere", () => {
  assert.equal(scoreMatch("as sorry", "As it is"), 0);
  assert.ok(scoreMatch("as 그대로", "As it is", ["있는 그대로"]) > 0);
});

test("normalize folds case, width and spacing", () => {
  assert.equal(normalize("  AS   It\nIS "), "as it is");
  assert.equal(normalize("ＡＢＣ"), "abc");
});

test("rank keeps best first and loader order on ties", () => {
  const items = ["b as it", "as it is", "c as it"];
  assert.deepEqual(rank(items, (s) => scoreMatch("as it", s)), ["as it is", "b as it", "c as it"]);
});

test("snippet centres on the first query word", () => {
  const text = "Opening a long line before the word meetup and a long line after it too";
  assert.match(snippet(text, "meetup", 10), /^….*meetup.*…$/);
  assert.equal(snippet(null, "x"), null);
});
