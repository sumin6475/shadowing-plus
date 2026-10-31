import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/release-flags.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function releaseFlags(isDevelopment) {
  const exports = {};
  runInNewContext(compiled, { exports, __DEV__: isDevelopment });
  return exports;
}

test("Ask entry points remain visible in production TestFlight builds", () => {
  assert.equal(releaseFlags(false).ASK_ENABLED, true);
  assert.equal(releaseFlags(true).ASK_ENABLED, true);
  assert.equal(releaseFlags(false).ASK_MOCK, false);
});
