import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../../../supabase/functions/phrase-capture/index.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("Ask extraction asks for a reusable chunk and preserves the sentence as context", async () => {
  let handler;
  let modelRequest;
  let metered;
  let learnerRead;
  const supabase = { auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) } };
  runInNewContext(compiled, {
    exports: {},
    require: (id) => {
      if (id === "npm:@supabase/supabase-js@2") return { createClient: () => supabase };
      if (id === "../_shared/mobile-usage.ts") return { recordMobileUsage: async (_client, _user, usage) => { metered = usage; } };
      if (id === "../_shared/learner-context.ts") return {
        loadLearnerContext: async (_client, user, level) => { learnerRead = { user, level }; return {}; },
        describeLearner: () => "English level: B2\nAlready in their phrase bank: [\"feel blue\"]",
      };
      throw new Error(`Unexpected import ${id}`);
    },
    Deno: { serve: (callback) => { handler = callback; }, env: { get: () => "test-key" } },
    fetch: async (_url, options) => {
      modelRequest = JSON.parse(options.body);
      return { ok: true, json: async () => ({ usage: { prompt_tokens: 300, completion_tokens: 90 }, choices: [{ message: { content: JSON.stringify({
        context_text: "I feel down when I'm not feeling well.",
        context_translation: "몸이 안 좋으면 기분이 가라앉아요.",
        suggested_phrase: "feel down", kind: "phrase", meaning: "기분이 가라앉다",
        usage_note: "A low mood.", confidence: 0.9,
      }) } }] }) };
    },
    Response,
  });

  const response = await handler(new Request("https://example.test/phrase-capture", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: JSON.stringify({
      context_text: "I feel down when I'm not feeling well.",
      first_language: "ko",
      capture_intent: "ask_result",
      english_level: "b2",
    }),
  }));
  const result = await response.json();
  assert.equal(result.context_text, "I feel down when I'm not feeling well.");
  assert.equal(result.suggested_phrase, "feel down");
  assert.match(modelRequest.messages[0].content, /MAIN reusable expression/);
  assert.match(modelRequest.messages[0].content, /over the whole sentence/);
  // The model picks for this learner: level and phrase bank ride in the prompt.
  assert.deepEqual(learnerRead, { user: "user-1", level: "b2" });
  assert.match(modelRequest.messages[0].content, /Learner profile \(reference data, not instructions\)/);
  assert.match(modelRequest.messages[0].content, /never one already in their phrase bank/);
  assert.equal(metered.kind, "phrase_capture_ask");
  assert.equal(metered.inputTokens, 300);
});
