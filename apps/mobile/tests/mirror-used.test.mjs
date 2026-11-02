import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";
import * as model from "../src/lib/mvp-model.ts";
import * as phraseUse from "../src/lib/phrase-use.ts";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/lib/mirror-used.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("same-day evidence merges cloud uses and local ticks, with undo and day rollover", async () => {
  const at = (hour) => new Date(2026, 9, 11, hour).toISOString();
  const phrases = [
    { id: "a", text: "call it a day" },
    { id: "b", text: "on the fence" },
    { id: "c", text: "play it by ear" },
  ];
  let user = "user-1";
  let cloudDown = false;
  const storage = new Map();
  const events = [
    { user_id: "user-1", phrase_item_id: "a", created_at: at(9), event: "used", talk_session_id: "talk-1" },
    { user_id: "user-1", phrase_item_id: "c", created_at: at(8), event: "used", talk_session_id: null },
  ];
  const sessions = [{ user_id: "user-1", transcript: "I'm on the fence.", created_at: at(10) }];
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: user } } } }) },
    from(table) {
      const filters = [];
      const query = {
        select() { return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        not(key, operator, value) { assert.equal(operator, "is"); filters.push((row) => row[key] !== value); return query; },
        gte(key, value) { filters.push((row) => row[key] >= value); return query; },
        lt(key, value) { filters.push((row) => row[key] < value); return query; },
        order() { return query; },
        async range(start, end) {
          if (cloudDown) return { data: null, error: { message: "offline" } };
          const sourceRows = table === "phrase_events" ? events : sessions;
          return { data: sourceRows.filter((row) => row.user_id === user && filters.every((filter) => filter(row))).slice(start, end + 1), error: null };
        },
      };
      return query;
    },
  };
  const asyncStorage = {
    getItem: async (key) => storage.get(key) ?? null,
    setItem: async (key, value) => { storage.set(key, value); },
  };
  const modules = {
    "@react-native-async-storage/async-storage": asyncStorage,
    "./mvp-model": model,
    "./phrase-use": phraseUse,
    "./supabase": { supabase },
  };
  const subject = {};
  runInNewContext(compiled, {
    exports: subject,
    require: (id) => {
      assert.ok(id in modules, `unexpected import ${id}`);
      return modules[id];
    },
  });

  await subject.markMirrorUsed(["c"], "attempt-1", new Date(2026, 9, 11, 11));
  assert.deepEqual(await subject.usedInMirrorToday(phrases, new Date(2026, 9, 11, 12)), ["a", "b", "c"]);
  await Promise.all([
    subject.markMirrorUsed(["c"], "attempt-1", new Date(2026, 9, 11, 11)),
    subject.unmarkMirrorUsed(["c"], "attempt-1", new Date(2026, 9, 11, 11)),
  ]);
  assert.deepEqual(await subject.usedInMirrorToday(phrases, new Date(2026, 9, 11, 12)), ["a", "b"]);
  await subject.markMirrorUsed(["c"], "attempt-1", new Date(2026, 9, 11, 11));
  await subject.unmarkMirrorUsed(["c"], "another-attempt", new Date(2026, 9, 11, 11));
  assert.deepEqual(await subject.usedInMirrorToday(phrases, new Date(2026, 9, 11, 12)), ["a", "b", "c"]);
  cloudDown = true;
  assert.deepEqual(await subject.usedInMirrorToday(phrases, new Date(2026, 9, 11, 12)), ["c"]);
  cloudDown = false;
  assert.deepEqual(await subject.usedInMirrorToday(phrases, new Date(2026, 9, 12, 12)), []);
  user = "user-2";
  assert.deepEqual(await subject.usedInMirrorToday(phrases, new Date(2026, 9, 11, 12)), []);
});
