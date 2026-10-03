// Golden run for ask-assist: calls OpenAI with the exact prompt/schema from
// core.ts (no deploy or auth needed), checks reply type + schema, and writes a
// markdown report for eyeballing naturalness.
//
//   OPENAI_API_KEY=… node supabase/tests/ask-assist/golden.mjs [--only <id>] [--out <file>]
//
// Cost: ~25 gpt-4o-mini calls, well under $0.05 per full run.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  assistantContent,
  buildOpenAIRequest,
  costUsd,
  learnerLanguage,
  MAX_OUTPUT_TOKENS,
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
const out = flag("--out") ?? path.join(repoRoot, "docs/journal/quality", `${today}-ask-golden.md`);
const only = flag("--only");
const { cases } = JSON.parse(await readFile(path.join(here, "golden.json"), "utf8"));

async function turn(mode, messages, l1) {
  const started = performance.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(buildOpenAIRequest({ mode, messages, l1 })),
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
for (const c of cases.filter((c) => !only || c.id === only)) {
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
  const pass = !last.error && last.finish === "stop" && last.reply?.type === c.expect;
  results.push({ c, last, pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${c.id} — ${last.error ?? `${last.reply?.type ?? "unparsed"} (${last.finish}), ${last.output} out, ${last.ms}ms`}`);
}

const ok = results.filter((r) => r.pass).length;
const byMode = (mode) => results.filter((r) => r.c.mode === mode && !r.last.error);
const mean = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const totalCost = results.reduce((sum, r) => sum + costUsd(r.last.input ?? 0, r.last.output ?? 0), 0);

const lines = [
  `# Ask golden run — ${today}`,
  "",
  `Result: **${ok}/${results.length}** reply type + schema pass (bar: 20/20 schema, ≥18/20 type).`,
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
  "Naturalness is judged by eye below. Mark each case ✅ / ⚠️ and add any failure to golden.json.",
  "",
];
for (const { c, last, pass } of results) {
  lines.push(`## ${pass ? "PASS" : "FAIL"} · ${c.id} (${c.mode}, ${c.l1})`, "");
  lines.push(`- Turns: ${c.turns.map((t) => `“${t}”`).join(" → ")}`);
  lines.push(`- Expect: \`${c.expect}\` — check: ${c.check}`);
  lines.push(`- Got: ${last.error ?? `\`${last.reply?.type ?? "unparsed"}\`, finish ${last.finish}, ${last.input} in (${last.cached} cached) / ${last.output} out, ${last.ms}ms`}`);
  lines.push("", "```json", JSON.stringify(last.reply ?? null, null, 2), "```", "");
}
await writeFile(out, lines.join("\n"));
console.log(`\n${ok}/${results.length} passed · report → ${path.relative(repoRoot, out)}`);
process.exit(ok === results.length ? 0 : 1);
