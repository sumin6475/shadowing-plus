import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as comparison from "../src/lib/phrase-duplicates.ts";

const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/phrases.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function setup(responses, userId = "owner") {
  const calls = [];
  const subject = {};
  const supabase = {
    auth: { getSession: async () => ({ data: { session: userId ? { user: { id: userId } } : null } }) },
    from(table) {
      const call = { table, filters: [], fields: "", range: null };
      calls.push(call);
      const respond = () => {
        const response = responses.shift();
        return typeof response === "function" ? response(call) : response;
      };
      const query = {
        select(fields) { call.fields = fields; return query; },
        eq(field, value) { call.filters.push([field, value]); return query; },
        order() { return query; },
        range(a, b) { call.range = [a, b]; return query; },
        then(resolve) { return Promise.resolve(respond()).then(resolve); },
        maybeSingle: async () => respond(),
      };
      return query;
    },
  };
  runInNewContext(compiled, {
    exports: subject,
    require(id) {
      if (id === "./supabase") return { supabase };
      if (id === "./phrase-duplicates") return comparison;
      if (id === "./ai-consent") return { aiProcessingAllowed: async () => false };
      if (id === "./phrase-speech") return { prewarmPhraseSpeech: async () => {} };
      throw new Error("Unexpected import: " + id);
    },
  });
  return { api: subject, calls };
}

test("pre-save search pages through older saved phrases and filters every request by owner", async () => {
  const firstPage = Array.from({ length: 500 }, (_, i) => ({ id: String(i), text: "unrelated wording " + i, meaning: null, source_context: {} }));
  const { api, calls } = setup([
    { data: firstPage, error: null },
    { data: [{ id: "old", text: "on the fence", meaning: "Undecided", source_context: { source_label: "Podcast" } }], error: null },
  ]);
  const matches = await api.findSavedPhraseMatches("I'm on the fence");
  assert.equal(matches[0].id, "old");
  assert.equal(matches[0].meaning, "Undecided");
  assert.deepEqual(calls.map(call => call.range), [[0, 499], [500, 999]]);
  for (const call of calls) {
    assert.deepEqual(call.filters, [["user_id", "owner"], ["status", "ready"]]);
  }
});

test("legacy meaning columns remain searchable; query errors block the save", async () => {
  const old = setup([
    { data: null, error: { message: "column phrase_items.meaning does not exist" } },
    { data: [{ id: "old", text: "take the plunge", meaning_ko: "도전하다", source_context: null }], error: null },
  ]);
  assert.equal((await old.api.findSavedPhraseMatches("take the plunge"))[0].meaning, "도전하다");
  assert.match(old.calls[1].fields, /meaning_ko/);
  const failed = setup([{ data: null, error: { message: "offline" } }]);
  await assert.rejects(failed.api.findSavedPhraseMatches("take the plunge"), /Couldn’t check saved phrases/);
});

test("search requires authentication; exact reuse rechecks the item owner and current text", async () => {
  const signedOut = setup([], null);
  await assert.rejects(signedOut.api.findSavedPhraseMatches("phrase"), /signed out/);
  assert.equal(signedOut.calls.length, 0);
  const existing = setup([{ data: { id: "saved", text: "Take the plunge!" }, error: null }]);
  assert.equal((await existing.api.reuseSavedPhrase("saved", { text: "take the plunge", source: "manual" })).result, "already");
  assert.deepEqual(existing.calls[0].filters, [["id", "saved"], ["user_id", "owner"], ["status", "ready"]]);
  const deleted = setup([{ data: null, error: null }]);
  await assert.rejects(deleted.api.reuseSavedPhrase("gone", { text: "phrase", source: "manual" }), /changed/);
});

// Execute equality filters to model the visible collection boundary on the server.
function storedRows(rows, single = false) {
  return call => {
    const visible = rows.filter(row => call.filters.every(([field, value]) => row[field] === value));
    return { data: single ? visible[0] ?? null : visible, error: null };
  };
}

test("failed and pending clip captures are excluded from saved-phrase review", async () => {
  for (const status of ["failed", "pending"]) {
    const hidden = { id: "web-clip", user_id: "owner", status, text: "take the plunge", segment_id: "clip-segment", meaning: null, source_context: {} };
    const { api } = setup([storedRows([hidden])]);
    assert.equal((await api.findSavedPhraseMatches(hidden.text)).length, 0);
  }
  const ready = { id: "ready", user_id: "owner", status: "ready", text: "take the plunge", meaning: null, source_context: {} };
  const { api } = setup([storedRows([ready])]);
  assert.equal((await api.findSavedPhraseMatches(ready.text))[0].id, ready.id);
});

test("a phrase that stops being ready during confirmation cannot be reused", async () => {
  const row = { id: "saved", user_id: "owner", status: "ready", text: "take the plunge", meaning: null, source_context: {} };
  const { api } = setup([storedRows([row]), storedRows([row], true)]);
  assert.equal((await api.findSavedPhraseMatches(row.text))[0].id, row.id);
  row.status = "failed";
  await assert.rejects(api.reuseSavedPhrase(row.id, { text: row.text, source: "manual" }), /changed/);
});
