// Golden run for ask-assist: calls OpenAI with the exact prompt/schema from
// core.ts (no deploy or auth needed), checks reply type + schema and explicit
// learning constraints, then writes a review sheet for educational quality.
//
//   OPENAI_API_KEY=… node supabase/tests/ask-assist/golden.mjs [--model <id>] [--only <id>] [--out <file>]
//
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkLearningConstraints } from "./learning-checks.mjs";

import {
  assistantContent,
  buildOpenAIRequest,
  costUsd,
  learnerLanguage,
  MAX_OUTPUT_TOKENS,
  MODEL,
  normalizeReply,
} from "../../functions/ask-assist/core.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Set OPENAI_API_KEY to run the golden set.");
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const model = flag("--model") ?? MODEL;
const out = flag("--out") ?? path.join(repoRoot, "docs/journal/quality", `${today}-ask-golden-${model}.md`);
const only = flag("--only");
const { cases } = JSON.parse(await readFile(path.join(here, "golden.json"), "utf8"));
const selectedCases = cases.filter((c) => !only || c.id === only);
if (!selectedCases.length) throw new Error(`No golden case matches --only ${only}`);

async function turn(mode, messages, l1) {
  const started = performance.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(buildOpenAIRequest({ mode, messages, l1 }, model)),
  });
  const ms = Math.round(performance.now() - started);
  if (!res.ok) return { ms, error: `OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}` };
  const payload = await res.json();
  const choice = payload.choices?.[0];
  return {
    ms,
    finish: choice?.finish_reason,
    input: payload.usage?.prompt_tokens ?? 0,
    cached: payload.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    output: payload.usage?.completion_tokens ?? 0,
    reply: normalizeReply(mode, choice?.message?.content ?? ""),
  };
}

const results = [];
for (const c of selectedCases) {
  const l1 = learnerLanguage(c.l1);
  const messages = [];
  let last;
  for (const [i, content] of c.turns.entries()) {
    const isLast = i === c.turns.length - 1;
    const mode = isLast ? c.mode : (c.history_mode ?? c.mode);
    messages.push({ role: "user", content });
    last = await turn(mode, messages, l1);
    if (last.error || !last.reply) break;
    if (!isLast) messages.push({ role: "assistant", content: assistantContent(last.reply) });
  }
  const expected = [c.expect].flat();
  const technicalPass = !last.error && last.finish === "stop" && expected.includes(last.reply?.type);
  const learningFailures = technicalPass ? checkLearningConstraints(c, last.reply) : [];
  const pass = technicalPass && learningFailures.length === 0;
  results.push({ c, last, pass, technicalPass, learningFailures });
  const detail = last.error ?? (learningFailures.length
    ? learningFailures.join("; ")
    : `${last.reply?.type ?? "unparsed"} (${last.finish}), ${last.output} out, ${last.ms}ms`);
  console.log(`${pass ? "PASS" : "FAIL"} ${c.id} — ${detail}`);
}

const ok = results.filter((r) => r.pass).length;
const technicalOk = results.filter((r) => r.technicalPass).length;
const byMode = (mode) => results.filter((r) => r.c.mode === mode && !r.last.error);
const mean = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const totalCost = results.reduce((sum, r) => sum + costUsd(r.last.input ?? 0, r.last.output ?? 0, model), 0);

const lines = [
  `# Ask golden run — ${today} · ${model}`,
  "",
  `Result: **${technicalOk}/${results.length}** schema + reply type; **${ok}/${results.length}** including deterministic learning checks. Human learning review remains open.`,
  "",
  "| mode | mean out tokens (target) | cap | p50 latency | mean cached input |",
  "|---|---|---|---|---|",
  ...["how_to_say", "note"].map((mode) => {
    const rs = byMode(mode);
    return `| ${mode} | ${mean(rs.map((r) => r.last.output))} (${mode === "note" ? 700 : 350}) | ${MAX_OUTPUT_TOKENS[mode]} | ${median(rs.map((r) => r.last.ms))}ms | ${mean(rs.map((r) => r.last.cached))} |`;
  }),
  "",
  `Last-turn cost for the run: $${totalCost.toFixed(5)}.`,
  "",
  "Use [learning-rubric.md](../../../supabase/tests/ask-assist/learning-rubric.md) to review each case. Automated checks catch only explicit constraints; a PASS here does not approve the language for learners.",
  "Reviewer: [ ] · review date: [ ] · languages reviewed: [ ] · release decision: [ ]",
  "",
];
for (const { c, last, pass, learningFailures } of results) {
  lines.push(`## ${pass ? "PASS" : "FAIL"} · ${c.id} (${c.mode}, ${c.l1})`, "");
  lines.push(`- Turns: ${c.turns.map((t) => `“${t}”`).join(" → ")}`);
  lines.push(`- Expect: \`${[c.expect].flat().join(" | ")}\` — check: ${c.check}`);
  lines.push(`- Got: ${last.error ?? `\`${last.reply?.type ?? "unparsed"}\`, finish ${last.finish}, ${last.input} in (${last.cached} cached) / ${last.output} out, ${last.ms}ms`}`);
  lines.push(`- Deterministic learning checks: ${learningFailures.length ? learningFailures.join("; ") : "pass or none configured"}`);
  lines.push("- Human review (0 harmful/wrong · 1 usable with revision · 2 good): intent/meaning [ ] · naturalness/register [ ] · L1 explanation [ ] · examples/transfer [ ] · length/load [ ]");
  lines.push("- Learner-facing issue and revised expression, if any: ");
  lines.push("", "```json", JSON.stringify(last.reply ?? null, null, 2), "```", "");
}
await writeFile(out, lines.join("\n"));
console.log(`\n${ok}/${results.length} passed · report → ${path.relative(repoRoot, out)}`);
process.exit(ok === results.length ? 0 : 1);
