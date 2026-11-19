// Regression guard for the blank Studio Notes list (2026-11-17).
//
// The whole Notes list (rows, empty state) sits in one Reanimated.View. Its
// mount-time FadeIn was cut off by an app reload and froze part-way, so a
// loaded list stayed invisible until the Folders / Notes tab was switched.
// The list may fade only after the learner switches view — never as it mounts.
// See docs/journal/postmortems/2026-11-17-studio-notes-list-invisible.md.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/screens/mvp/index.tsx", import.meta.url), "utf8");
const start = source.indexOf("export function NotesStudio(");
const end = source.indexOf("\nexport function ", start + 1);
const studio = source.slice(start, end);

test("the Studio list never runs an entering animation as it mounts", () => {
  assert.ok(start > 0, "NotesStudio is where this test expects it");
  const entering = studio.match(/entering=\{[^\n]*/g) ?? [];
  assert.ok(entering.length > 0, "the list wrapper is still found");
  for (const prop of entering) {
    assert.match(prop, /^entering=\{fadeOnSwitch \? /, `unguarded mount-time animation: ${prop}`);
  }
  assert.match(studio, /\[fadeOnSwitch, setFadeOnSwitch\] = useState\(false\)/, "no fade on the first mount");
});

test("every view switch goes through switchView, which turns the fade on", () => {
  const calls = studio.match(/\bsetView\(/g) ?? [];
  assert.equal(calls.length, 1, "setView is called only inside switchView");
  assert.match(studio, /const switchView = \(next: string\) => \{\s*setFadeOnSwitch\(true\);\s*setView\(next\);/);
});
