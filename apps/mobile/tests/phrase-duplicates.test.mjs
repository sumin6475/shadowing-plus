import test from "node:test";
import assert from "node:assert/strict";
import { compareSavedPhrases, rankSavedPhraseMatches } from "../src/lib/phrase-duplicates.ts";

test("exact matches ignore case, spacing, punctuation and curly apostrophes", () => {
  for (const [a, b] of [["  Take   the plunge! ", "take the plunge"], ["I’m on the fence.", "I'm on the fence"], ["café", "CAFÉ"]]) {
    assert.equal(compareSavedPhrases(a, b)?.match, "exact", a);
  }
});

test("similar matches cover contractions, possessives, contained expressions and small typos", () => {
  for (const [a, b] of [["I'm on the fence", "on the fence"], ["I am on the fence", "I'm on the fence"], ["make up my mind", "make up your mind"], ["take the pluge", "take the plunge"]]) {
    assert.equal(compareSavedPhrases(a, b)?.match, "similar", a);
    assert.equal(compareSavedPhrases(b, a)?.match, "similar", b);
  }
});

test("negation, reordered words, short overlaps and unrelated phrases do not interrupt saving", () => {
  for (const [a, b] of [["I can make it", "I can't make it"], ["never give up", "give up"], ["on the fence", "the fence was on fire"], ["get in", "get on"], ["I am tired", "I am hired"], ["take a break", "take a picture"], ["I feel uncertain", "on the fence"], ["", "anything"]]) {
    assert.equal(compareSavedPhrases(a, b), null, a);
  }
});

test("exact matches rank before similar ones, even across sources; self excluded; top three only", () => {
  const candidates = [
    { id: "1", text: "on the fence", meaning: "Undecided", source: "Podcast" },
    { id: "2", text: "I'm on the fence", meaning: null, source: "Ask" },
    { id: "3", text: "I am on the fence", meaning: null, source: "Manual" },
    { id: "4", text: "I'm on the fence!", meaning: null, source: "Clip" },
    { id: "5", text: "I'm on the fence.", meaning: null, source: "Photo" },
  ];
  const matches = rankSavedPhraseMatches("I'm on the fence", candidates, "2");
  assert.deepEqual(matches.map(item => item.id), ["4", "5", "3"]);
  assert.equal(matches[0].source, "Clip");
});
