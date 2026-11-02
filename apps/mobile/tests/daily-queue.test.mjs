import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";
import * as ranking from "../src/lib/daily-phrase-ranking.ts";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/lib/daily-phrases.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("the balanced daily queue stays frozen after a phrase is used in Talk", async () => {
  const now = Date.now();
  const at = (daysAgo) => new Date(now - daysAgo * 86_400_000).toISOString();
  const phrase = (id, intervalDays, reviewed) => ({
    id, text: id, learningStatus: reviewed ? "practicing" : "new",
    createdAt: at(40), dueAt: at(1), intervalDays,
    lastReviewedAt: reviewed ? at(3) : null,
    lastPracticedAt: reviewed ? at(3) : null,
    lapses: 0, reviewPinUntil: null,
  });
  const bank = [
    phrase("new", 0, false), phrase("month", 30, true),
    phrase("one", 1, true), phrase("three", 3, true), phrase("seven", 7, true),
  ];
  const storage = new Map();
  let usedAt = {};
  const modules = {
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      removeItem: async (key) => { storage.delete(key); },
    },
    "react-native": { Alert: {} },
    "./phrases": {
      fetchPhrases: async () => bank,
      fetchLastSelfTalkUsedAt: async () => usedAt,
    },
    "./daily-phrase-ranking": ranking,
  };
  const subject = {};
  runInNewContext(compiled, {
    exports: subject,
    require: (id) => {
      assert.ok(id in modules, `unexpected import ${id}`);
      return modules[id];
    },
  });
  subject.setPhrasesPerDay(3);

  const first = await subject.todaysPhrases();
  assert.equal(first.length, 3);
  assert.equal(first.filter(ranking.isDiscoveryPhrase).length, 1);
  usedAt = { [first[0].id]: new Date().toISOString() };
  const second = await subject.todaysPhrases();
  assert.deepEqual(Array.from(second, (item) => item.id), Array.from(first, (item) => item.id));
  assert.equal(JSON.parse(storage.get("daily_phrase_queue")).strategy, 2);
});
