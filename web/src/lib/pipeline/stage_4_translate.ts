import OpenAI from "openai";
import { getJson, jobKey, putJson } from "@/lib/r2";
import { updateJobProgress } from "./jobs";
import type { PipelineSegment } from "@/lib/types";
import { AUDIO_LANGUAGE, TRANSLATION_LANGUAGE } from "./languages";

const MODEL = "gpt-4o-mini";
const BATCH_SIZE = 5;

interface PostprocessedTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
}

interface TranslatedTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
}

function buildPrompt(
  batch: PipelineSegment[],
  contextBefore: string,
  contextAfter: string,
): string {
  const list = batch.map((s) => `- ${s.text}`).join("\n");
  return `You are a translation assistant for ${AUDIO_LANGUAGE.name} language learners (${TRANSLATION_LANGUAGE} speakers).

For each segment, provide a natural ${TRANSLATION_LANGUAGE} translation that captures the context and nuance (NOT machine-literal translation).

Context before: ${contextBefore}
Context after: ${contextAfter}

Segments:
${list}

Output format (JSON only, no markdown):
Return segments in the SAME ORDER as the input. Do not reorder or skip any.
{
  "segments": [
    { "translation": "${TRANSLATION_LANGUAGE} translation here" }
  ]
}

Rules:
- Translation should sound natural in ${TRANSLATION_LANGUAGE}, not word-by-word
- Consider surrounding sentences for context`;
}

/**
 * Stage 4: Batched GPT-4o-mini translation.
 * Reads segments.json → adds `translation` to each segment → writes segments_translated.json.
 * Translation index is matched by batch position, not by GPT's returned index,
 * to defend against the model dropping or reordering entries.
 */
export async function stage4Translate(jobId: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const openai = new OpenAI({ apiKey });

  await updateJobProgress(jobId, "translate", 0);
  const input = await getJson<PostprocessedTranscript>(
    jobKey(jobId, "segments.json"),
  );
  const segments = input.segments;
  const out: PipelineSegment[] = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    const contextBefore = i > 0 ? segments[i - 1].text : "";
    const contextAfter =
      i + batch.length < segments.length ? segments[i + batch.length].text : "";

    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: buildPrompt(batch, contextBefore, contextAfter) }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = resp.choices[0]?.message?.content ?? "{}";
    let parsed: { segments?: Array<{ translation?: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }
    const items = parsed.segments ?? [];

    for (let k = 0; k < batch.length; k++) {
      const seg = batch[k];
      const translation = items[k]?.translation ?? "[translation failed]";
      out.push({ ...seg, translation });
    }

    const done = Math.min(i + BATCH_SIZE, segments.length);
    const pct = Math.round((done / segments.length) * 100);
    await updateJobProgress(jobId, "translate", pct);
  }

  const result: TranslatedTranscript = {
    audio_duration_secs: input.audio_duration_secs,
    segments: out,
  };
  await putJson(jobKey(jobId, "segments_translated.json"), result);
  await updateJobProgress(jobId, "translate", 100);
}
