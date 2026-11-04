import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync(new URL("../src/hooks/use-phrase-save-review.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(matches = [], searchError = null, os = "android") {
  const writes = [];
  let shown = null;
  let cleanup;
  const subject = {};
  runInNewContext(compiled, {
    exports: subject,
    Promise,
    require(id) {
      if (id === "react") return {
        useState: () => [null, value => { shown = value; }],
        useRef: value => ({ current: value }),
        useEffect: effect => { cleanup = effect(); },
      };
      if (id === "react-native") return { Keyboard: { dismiss() {} }, Platform: { OS: os } };
      if (id === "@/lib/phrases") return {
        findSavedPhraseMatches: async () => { if (searchError) throw searchError; return matches; },
        createPhrase: async input => { writes.push({ action: "create", input }); return { result: "saved", id: "new" }; },
        reuseSavedPhrase: async (id, input) => { writes.push({ action: "reuse", id, input }); return { result: "already", id }; },
      };
      throw new Error("Unexpected import: " + id);
    },
  });
  return { api: subject.usePhraseSaveReview(), writes, shown: () => shown, unmount: () => cleanup() };
}
const input = { text: "I'm on the fence", source: "manual", meaning: "Undecided" };
const match = { id: "existing", text: "on the fence", match: "similar" };
const tick = () => new Promise(resolve => setImmediate(resolve));

test("a similar phrase waits for confirmation before any mutation", async () => {
  const { api, writes, shown } = setup([match]);
  const saving = api.savePhrase(input);
  await tick();
  assert.equal(writes.length, 0);
  assert.equal(shown().text, input.text);
  api.onConfirm();
  assert.equal((await saving).result, "saved");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].input.text, input.text);
  assert.equal(writes[0].input.meaning, input.meaning);
  assert.equal(writes[0].input.source, input.source);
  assert.equal(shown(), null);
});

test("editing cancels without changing the draft or saving", async () => {
  const { api, writes } = setup([match]);
  const saving = api.savePhrase(input);
  await tick();
  api.onEdit();
  assert.equal(await saving, null);
  assert.equal(writes.length, 0);
  assert.equal(input.meaning, "Undecided");
});

test("an exact match uses the existing item and does not create a copy", async () => {
  const { api, writes } = setup([{ ...match, match: "exact" }]);
  const saving = api.savePhrase(input);
  await tick();
  api.onConfirm();
  assert.equal((await saving).id, "existing");
  assert.equal(writes[0].action, "reuse");
});

test("no match saves immediately; a failed search never saves unchecked", async () => {
  const clear = setup();
  assert.equal((await clear.api.savePhrase(input)).result, "saved");
  const failed = setup([], new Error("offline"));
  await assert.rejects(failed.api.savePhrase(input), /offline/);
  assert.equal(failed.writes.length, 0);
});

test("double taps and closing the screen cannot save an unconfirmed phrase", async () => {
  const { api, writes, unmount } = setup([match]);
  const first = api.savePhrase(input);
  assert.equal(await api.savePhrase(input), null);
  await tick();
  unmount();
  assert.equal(await first, null);
  assert.equal(writes.length, 0);
});

test("iOS waits for the review modal to dismiss before saving and presenting success", async () => {
  const { api, writes } = setup([match], null, "ios");
  const saving = api.savePhrase(input);
  await tick();
  api.onConfirm();
  await tick();
  assert.equal(writes.length, 0);
  api.onDismiss();
  assert.equal((await saving).result, "saved");
  assert.equal(writes.length, 1);
});
