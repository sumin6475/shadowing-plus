import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../../../supabase/functions/_shared/mobile-usage.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
runInNewContext(compiled, { exports: api });

test("mobile AI events carry the user, purpose, measured tokens, and estimated cost", async () => {
  let row;
  const supabase = { from(table) {
    assert.equal(table, "usage_events");
    return { insert: async (value) => { row = value; return { error: null }; } };
  } };
  await api.recordMobileUsage(supabase, "learner-1", {
    kind: "phrase_capture_ask", model: "gpt-4o-mini", inputTokens: 300, outputTokens: 90,
  });
  assert.equal(row.user_id, "learner-1");
  assert.equal(row.kind, "phrase_capture_ask");
  assert.equal(row.total_tokens, 390);
  assert.equal(row.cost_usd, 0.000099);
});

test("a usage write failure does not lose an AI answer", async () => {
  const supabase = { from() { return { insert: async () => ({ error: { message: "offline" } }) }; } };
  const original = console.error;
  console.error = () => {};
  try {
    await assert.doesNotReject(api.recordMobileUsage(supabase, "learner-1", { kind: "phrase_embed", model: "text-embedding-3-small", inputTokens: 100 }));
  } finally { console.error = original; }
});
