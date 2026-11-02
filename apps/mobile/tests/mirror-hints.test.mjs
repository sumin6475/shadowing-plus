import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/lib/mvp.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadWithUsedToday(usedToday) {
  const rows = ["used", "fresh", "later"].map((id, index) => ({
    id, text: id, translation: null, usageNote: null, source: "Saved phrase",
    createdAt: new Date(2026, 9, index + 1, 9).toISOString(),
  }));
  const outside = { ...rows[0], id: "outside", text: "outside" };
  const supabase = {
    from(table) {
      assert.equal(table, "phrase_examples");
      const query = {
        select() { return query; }, in() { return query; },
        order: async () => ({ data: [], error: null }),
      };
      return query;
    },
  };
  const modules = {
    "./supabase": { supabase },
    "./talk-audio": {},
    "./mvp-model": {},
    "./mirror-used": { usedInMirrorToday: async () => usedToday },
    "./daily-phrases": { todaysPhrases: async () => rows },
    "./phrases": { fetchPhraseById: async (id) => id === "outside" ? outside : null },
  };
  const subject = {};
  runInNewContext(compiled, {
    exports: subject,
    require: (id) => {
      assert.ok(id in modules, `unexpected import ${id}`);
      return modules[id];
    },
  });
  return subject.loadHintPhrases;
}

test("Talk keeps today's queue but puts unused cards first and marks earlier use", async () => {
  const load = loadWithUsedToday(["used"]);
  const next = await load(3);
  assert.deepEqual(Array.from(next, (card) => card.id), ["fresh", "later", "used"]);
  assert.deepEqual(Array.from(next, (card) => card.usedToday), [false, false, true]);
  const forced = await load(2, "used");
  assert.equal(forced[0].id, "used");
  assert.equal(forced[0].usedToday, true);
  assert.equal(forced[1].usedToday, false);
});

test("a phrase opened from detail leads even when outside today's queue", async () => {
  const load = loadWithUsedToday(["outside"]);
  const cards = await load(2, "outside");
  assert.deepEqual(Array.from(cards, (card) => card.id), ["outside", "used"]);
  assert.equal(cards[0].usedToday, true);
});
