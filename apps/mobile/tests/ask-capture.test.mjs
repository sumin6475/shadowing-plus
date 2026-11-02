import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/lib/phrase-capture.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("Ask save requests a second extraction pass before opening the review draft", async () => {
  let request = null;
  const subject = {};
  const modules = {
    "./supabase": { supabase: { functions: { invoke: async (name, options) => {
      assert.equal(name, "phrase-capture");
      request = options.body;
      return { data: {
        context_text: "I feel down when I'm not feeling well.",
        context_translation: "몸이 안 좋으면 기분이 가라앉아요.",
        suggested_phrase: "feel down", kind: "phrase",
        meaning: "기분이 가라앉다", usage_note: "A low mood.", confidence: 0.9,
      }, error: null };
    } } } },
    "./first-language": { firstLanguage: () => "ko" },
    "./ai-consent": { requireAiProcessingConsent: async () => {} },
  };
  runInNewContext(compiled, {
    exports: subject,
    require: (id) => {
      assert.ok(id in modules, `unexpected import ${id}`);
      return modules[id];
    },
  });

  const draft = await subject.extractPhraseFromAsk("I feel down when I'm not feeling well.");
  assert.equal(request.capture_intent, "ask_result");
  assert.equal(request.context_text, "I feel down when I'm not feeling well.");
  assert.equal(request.first_language, "ko");
  assert.equal(draft.suggestedPhrase, "feel down");
});
