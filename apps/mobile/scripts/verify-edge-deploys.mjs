#!/usr/bin/env node
// verify-edge-deploys.mjs — does every deployed edge function run the code
// that is in this checkout?
//
// Edge functions deploy by hand, apart from app builds. In November 2026 the
// app started sending `responseLanguage` to talk-advanced-feedback, but the
// function itself was never redeployed: the live v1 rejected every request as
// feedback_bad_request and every speaking review showed "Something went wrong"
// in TestFlight 51. Run this before a TestFlight build and after merging
// server changes.
//
// It downloads each deployed function's source into a temporary folder (never
// into this repo) and compares it file by file with supabase/functions here.
// Commit dates can't answer this: functions are often deployed from a working
// tree before the commit that records them.
//
// Usage (from apps/mobile): npm run verify:edge-deploys [-- --remote=<ref>] [-- <slug> ...]
// Exits 1 when a function differs. Read-only: it never deploys.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const ref = args.find((a) => a.startsWith("--remote="))?.slice(9) ??
  process.env.SUPABASE_PROJECT_REF ?? "hetcnrmzrksbjoeczeze";
const only = args.filter((a) => !a.startsWith("--"));

const cli = (cliArgs, cwd) => {
  const out = execFileSync("npx", ["supabase", ...cliArgs, `--remote=${ref}`], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out.slice(out.indexOf("{")));
};

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const deployed = cli(["functions", "list"], repo).functions ?? [];
const work = mkdtempSync(join(tmpdir(), "edge-deploys-"));
const differ = [];
let checked = 0;
for (const fn of deployed) {
  if (only.length && !only.includes(fn.slug)) continue;
  if (!existsSync(join(repo, "supabase/functions", fn.slug, "index.ts"))) continue;
  const dir = join(work, fn.slug);
  execFileSync("mkdir", ["-p", join(dir, "supabase")]);
  cli(["functions", "download", fn.slug, "--use-api", "--workdir", dir], dir);
  const liveRoot = join(dir, "supabase/functions");
  const changed = files(liveRoot).flatMap((live) => {
    const rel = relative(liveRoot, live);
    const local = join(repo, "supabase/functions", rel);
    if (!existsSync(local)) return [`${rel} (deleted here)`];
    return readFileSync(live, "utf8") === readFileSync(local, "utf8") ? [] : [rel];
  });
  checked++;
  if (changed.length) differ.push({ fn, changed });
}

if (!differ.length) {
  console.log(`${checked} deployed edge functions match this checkout.`);
} else {
  console.error("Deployed edge functions that differ from this checkout:");
  for (const { fn, changed } of differ) {
    console.error(`  ${fn.slug} v${fn.version}: ${changed.join(", ")}`);
  }
  console.error(
    "If this checkout is what should be live, deploy each with:\n" +
      "  npx supabase functions deploy <slug> --remote=<ref>",
  );
  process.exit(1);
}
