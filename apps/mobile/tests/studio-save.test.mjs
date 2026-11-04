import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as model from "../src/lib/mvp-model.ts";

function load(name, modules) {
  const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/" + name + ".ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const subject = {};
  runInNewContext(compiled, { exports: subject, __DEV__: false, require(id) {
    if (id in modules) return modules[id];
    throw new Error("Unexpected module: " + id);
  } });
  return subject;
}
function notesWithRpc(result) {
  const calls = [];
  const api = load("mvp", {
    "./supabase": { supabase: { rpc: async (name, input) => { calls.push({ name, input }); return result; } } },
    "./mvp-model": model, "./talk-audio": {}, "./mirror-used": {}, "./daily-phrases": {}, "./phrases": {},
  });
  return { api, calls };
}
test("an autosave writes the edited note and immutable history in one transaction", async () => {
  const { api, calls } = notesWithRpc({ data: "version", error: null });
  const body = "Body\n- A point\n  > My detailed example";
  await api.saveNote("note", "My title", body);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "apply_note_version");
  assert.equal(calls[0].input.p_note_id, "note");
  assert.equal(calls[0].input.p_body, body);
  assert.equal(calls[0].input.p_origin, "manual");
});
test("a failed history transaction reports failure instead of claiming the edit was saved", async () => {
  const { api } = notesWithRpc({ data: null, error: { message: "Could not save version" } });
  await assert.rejects(api.saveNote("note", "title", "body"), /Could not save version/);
});
test("history pages are scoped to the note and keep a stable newest-first order", async () => {
  const calls = [];
  const query = {
    select() { return query; },
    eq(...args) { calls.push(["eq", ...args]); return query; },
    order(...args) { calls.push(["order", args[0], args[1].ascending]); return query; },
    range(...args) { calls.push(["range", ...args]); return query; },
    then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
  };
  const api = load("note-growth", { "./supabase": { supabase: { from(table) { assert.equal(table, "note_versions"); return query; } } }, "./ask-model": {} });
  await api.loadNoteVersions("note", 50);
  assert.deepEqual(calls, [["eq", "note_id", "note"], ["order", "created_at", false], ["order", "id", false], ["range", 50, 99]]);
});
