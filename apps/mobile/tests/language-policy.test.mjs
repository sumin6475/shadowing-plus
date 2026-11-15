import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLanguagePreferences, resolveSurfaceLanguage } from "../src/lib/language-policy.ts";

test("all combinations preserve meanings and independently select each output language", () => {
  for (const l1 of ["en", "ko", "zh-Hant", "ja", "es", "ru"]) {
    for (let mask = 0; mask < 8; mask++) {
      const prefs = { app: Boolean(mask & 1), assistant: Boolean(mask & 2), feedback: Boolean(mask & 4) };
      assert.equal(resolveSurfaceLanguage(l1, prefs, "meaning"), l1);
      for (const surface of ["app", "assistant", "feedback"]) {
        assert.equal(resolveSurfaceLanguage(l1, prefs, surface), prefs[surface] ? l1 : "en");
      }
    }
  }
});

test("old installs and malformed storage get safe defaults without losing explicit false", () => {
  const defaults = { app: true, assistant: true, feedback: true };
  for (const value of [null, undefined, "invalid", {}, { app: "false", assistant: 0 }]) {
    assert.deepEqual(normalizeLanguagePreferences(value), defaults);
  }
  assert.deepEqual(normalizeLanguagePreferences({ app: false, assistant: true, feedback: false, meaning: false }), {
    app: false, assistant: true, feedback: false,
  });
});

// Run the real store with an in-memory device adapter to exercise write ordering
// and restart recovery without loading native React Native modules in Node.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as policy from "../src/lib/language-policy.ts";
function loadStore(storage) {
  const source = readFileSync(new URL("../src/lib/language-preferences.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name.includes("async-storage")) return storage;
      if (name === "react") return { useSyncExternalStore: () => {} };
      if (name === "./first-language") return { firstLanguage: () => "ko" };
      if (name === "./language-policy") return policy;
      throw new Error(name);
    },
  });
  return exports;
}

test("rapid all/individual changes persist the last selection and survive reload", async () => {
  let saved = null;
  const storage = { getItem: async () => saved, setItem: async (_key, value) => { saved = value; } };
  const store = loadStore(storage);
  const off = { app: false, assistant: false, feedback: false };
  const individual = { ...off, assistant: true };
  const first = store.persistLanguagePreferences(off);
  const last = store.persistLanguagePreferences(individual);
  assert.equal(store.surfaceLanguage("meaning"), "ko");
  assert.equal(store.surfaceLanguage("assistant"), "ko");
  assert.equal(store.surfaceLanguage("feedback"), "en");
  await Promise.all([first, last]);
  assert.deepEqual(JSON.parse(saved), individual);
  const restarted = loadStore(storage);
  await restarted.loadLanguagePreferences();
  assert.deepEqual(restarted.languagePreferences(), individual);
});

test("a failed save is reported and does not block later writes", async () => {
  let fail = true;
  let saved;
  const store = loadStore({ getItem: async () => null, setItem: async (_key, value) => {
    if (fail) throw new Error("disk unavailable");
    saved = value;
  } });
  const off = { app: false, assistant: false, feedback: false };
  await assert.rejects(store.persistLanguagePreferences(off), /disk unavailable/);
  assert.equal(store.surfaceLanguage("app"), "en");
  fail = false;
  await store.persistLanguagePreferences({ ...off, app: true });
  assert.equal(JSON.parse(saved).app, true);
});
