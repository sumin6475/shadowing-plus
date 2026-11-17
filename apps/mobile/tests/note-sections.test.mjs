import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));
const compiled = ts.transpileModule(readFileSync(join(here, "../src/lib/note-sections.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
runInNewContext(compiled, { module: mod, exports: mod.exports });
const tones = (sections) => [...mod.exports.sectionTones(sections.map((section) => ({ section })))];

test("named sections keep their part wherever they sit", () => {
  assert.deepEqual(tones(["Opening", "Body", "Body", "Closing"]), ["opening", "body", "body", "closing"]);
  assert.deepEqual(tones(["Intro", "Main points", "Wrap-up"]), ["opening", "body", "closing"]);
  assert.deepEqual(tones(["Body", "Conclusion"]), ["body", "closing"]);
});

test("unnamed sections fall back to position", () => {
  assert.deepEqual(tones(["Why", "Why", "How", "So what"]), ["opening", "opening", "body", "closing"]);
  assert.deepEqual(tones(["Why", "So what"]), ["opening", "closing"]);
});

test("a single unnamed section is all body; points without a section have no part", () => {
  assert.deepEqual(tones(["Notes", "Notes"]), ["body", "body"]);
  assert.deepEqual(tones([null, null]), [null, null]);
  assert.deepEqual(tones([null, "Opening", "Body"]), [null, "opening", "body"]);
});
