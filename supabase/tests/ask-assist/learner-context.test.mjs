// The light personal layer shared by ask-assist and phrase-capture.
// Run: node --test supabase/tests/ask-assist/learner-context.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

import { asLevel, describeLearner, EMPTY_LEARNER, fromProfile, loadLearnerContext } from "../../functions/_shared/learner-context.ts";

test("nothing known means no profile block at all", () => {
  assert.equal(describeLearner(EMPTY_LEARNER), null);
});

test("the profile block names level, goal, focus, voice and the phrase bank", () => {
  const block = describeLearner({
    level: "b2", objective: "Explain my research clearly", focuses: ["connections — link ideas"],
    voice: "professional", difficulty: "balanced", savedPhrases: ["touch base", "walk on eggshells"],
  });
  assert.match(block, /B2 \(upper intermediate\)/);
  assert.match(block, /Explain my research clearly/);
  assert.match(block, /connections — link ideas/);
  assert.match(block, /professional, difficulty balanced/);
  assert.match(block, /never recommend these again[^\n]*"touch base","walk on eggshells"/);
});

test("a compiled coaching profile becomes context fields; junk is dropped", () => {
  assert.deepEqual(fromProfile({
    objective: "Sound confident in meetings", voice: "professional", difficulty: "simple",
    focuses: [{ category: "verb_patterns", reason: "tense slips" }, { category: "" }, { reason: "orphan" }],
  }), { objective: "Sound confident in meetings", focuses: ["verb patterns — tense slips"], voice: "professional", difficulty: "simple" });
  assert.deepEqual(fromProfile(null), { objective: "", focuses: [], voice: "", difficulty: "" });
  assert.equal(asLevel(" B1 "), "b1");
  assert.equal(asLevel("c2"), null);
});

/** A Supabase stand-in: each table answers with the row(s) given, or an error. */
function fakeSupabase(tables) {
  return {
    from(table) {
      const answer = tables[table] ?? { data: null, error: null };
      const query = {
        select: () => query, eq: () => query, order: () => query, limit: () => Promise.resolve(answer),
        maybeSingle: () => Promise.resolve(answer),
      };
      return query;
    },
  };
}

test("the account's coaching level wins over the device's, and the profile is read", async () => {
  const ctx = await loadLearnerContext(fakeSupabase({
    coaching_preferences: { data: { english_level: "c1", current_profile_version_id: "v1" }, error: null },
    phrase_items: { data: [{ text: "touch base" }, { text: "  " }], error: null },
    coaching_profile_versions: { data: { profile: { objective: "Lead standups", focuses: [], voice: "clear", difficulty: "balanced" } }, error: null },
  }), "user-1", "a2");
  assert.equal(ctx.level, "c1");
  assert.deepEqual(ctx.savedPhrases, ["touch base"]);
  assert.equal(ctx.objective, "Lead standups");
});

test("failed or missing reads leave the layer thin, never broken", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const ctx = await loadLearnerContext(fakeSupabase({
      coaching_preferences: { data: null, error: { message: "denied" } },
      phrase_items: { data: null, error: { message: "denied" } },
    }), "user-1", "b1");
    assert.equal(ctx.level, "b1", "the device's chosen level is the fallback");
    assert.deepEqual(ctx.savedPhrases, []);
    assert.equal(ctx.objective, "");
  } finally {
    console.error = original;
  }
});
