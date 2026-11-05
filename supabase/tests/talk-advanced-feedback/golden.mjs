import { textCostUsd } from "../../functions/_shared/mobile-usage.ts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  analysisRequest,
  parseFeedback,
} from "../../functions/talk-advanced-feedback/core.ts";
import {
  defaultProfile,
  MODEL,
  parseProfile,
  profileRequest,
} from "../../functions/coaching-profile/core.ts";
import { context, goldenCases } from "./fixtures.mjs";
const { values } = parseArgs({
  options: {
    model: { type: "string", default: MODEL },
    out: { type: "string" },
    keyFile: { type: "string" },
    limit: { type: "string", default: "20" },
  },
});
if (textCostUsd(values.model, 1_000_000, 0) <= 0) {
  throw new Error("No evaluation price configured for this model.");
}
if (!values.out) {
  throw new Error("Pass --out pointing to an ignored local quality directory.");
}
let key = process.env.OPENAI_API_KEY;
if (!key && values.keyFile) {
  const text = await readFile(values.keyFile, "utf8");
  key = text.split("\n").find((line) => line.startsWith("OPENAI_API_KEY="))
    ?.slice(15).trim().replace(/^['"]|['"]$/g, "");
}
if (!key) throw new Error("Evaluation key is not configured.");
const results = [];
let inputTokens = 0, outputTokens = 0;
async function call(body) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(`upstream_${response.status}`);
  const data = await response.json();
  inputTokens += data.usage?.prompt_tokens ?? 0;
  outputTokens += data.usage?.completion_tokens ?? 0;
  const choice = data.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message.refusal) {
    throw new Error("incomplete");
  }
  return choice.message.content;
}
for (
  const [index, [id, transcript, source]] of goldenCases.slice(
    0,
    Number(values.limit),
  ).entries()
) {
  const language = ["en", "ko", "zh-Hant", "ja", "es", "ru"][index % 6];
  try {
    const profile = parseProfile(
      await call(profileRequest(source, "b2", language, values.model)),
      source,
    );
    const c = { ...context(transcript), sourceText: source, language, profile };
    const report = parseFeedback(
      await call(analysisRequest(c, values.model)),
      c,
    );
    results.push({
      id,
      language,
      transcript,
      source,
      profile,
      report,
      status: "structural_pass",
      semantic_review: "pending",
    });
    process.stdout.write(`${id}: structural PASS\n`);
  } catch (error) {
    results.push({ id, language, status: "FAIL", error: error.message });
    process.stdout.write(`${id}: FAIL ${error.message}\n`);
    if (error.message.startsWith("upstream_")) break;
  }
}
const output = resolve(values.out);
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  JSON.stringify(
    {
      model: values.model,
      inputTokens,
      outputTokens,
      costUsd: textCostUsd(values.model, inputTokens, outputTokens),
      semantic_rubric: [
        "Meaning, actor, negation and uncertainty preserved",
        "No invented listener context or research claims",
        "Unclear/ASR text asks before repairing",
        "Correct selected explanation language",
        "0–2 focused findings, not forced errors",
        "Small reusable chunk and learner-first retry",
      ],
      results,
    },
    null,
    2,
  ),
);
console.log(
  `Saved ${results.length} cases; ${
    results.filter((r) => r.status === "FAIL").length
  } failures. Semantic review remains required.`,
);
if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
