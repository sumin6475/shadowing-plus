import OpenAI from "openai";
import { getJson, jobKey, putJson } from "@/lib/r2";
import { updateJobProgress } from "./jobs";
import type { PipelineSegment } from "@/lib/types";
import { AUDIO_LANGUAGE, TRANSLATION_LANGUAGE } from "./languages";

const MODEL = "gpt-4o-mini";
const BATCH_SIZE = 5;

/**
 * Sentences of surrounding context shown to the model on each batch. 5–7 is
 * the sweet spot:
 * - ≤4: polysemous phrases like "work in" can't anchor to a domain (gym vs.
 *   workplace), so the translator picks the wrong sense.
 * - ≥10: token cost climbs without measurable quality gain.
 */
const CONTEXT_WINDOW = 6;

interface PostprocessedTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
}

/**
 * Per-video metadata extracted in Stage A. Every field is short prose that
 * gets injected verbatim into Stage B's prompt so the model keeps tone,
 * vocabulary, and speaker relationships consistent across batches.
 *
 * Intentionally does NOT force a specific register (formal/informal). GPT
 * inspects the video and chooses the natural register itself, so the same
 * pipeline handles talk shows, TED talks, drama clips, documentaries, news,
 * vlogs, and so on without genre-specific tuning.
 */
interface VideoProfile {
  /** One-line summary: setting, situation, who is talking to whom. */
  context: string;
  /** Short label such as "talk show interview", "TED talk", "scripted drama
   *  dialogue", "documentary narration", "news report", "vlog monologue". */
  genre: string;
  /** Translator's guidance on default register (e.g. "polite conversational
   *  Korean, 해요체", "formal lecture register", "casual peer-to-peer
   *  dialogue"). */
  register: string;
  /** Named entities to preserve verbatim (people, places, products,
   *  fictional names). */
  named_entities: string[];
  /** Domain-specific words where a literal translation would mislead, paired
   *  with the contextual gloss.
   *  e.g. `"work in (gym) → (기구) 같이 쓰다"`,
   *       `"the floor (legislature) → 본회의장"`. */
  domain_terms: string[];
}

interface TranslatedTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
  /** Stage A profile. Stored alongside segments for audit / debug / reuse. */
  profile?: VideoProfile;
}

/**
 * Stage A — Profile the video in one GPT call.
 *
 * Samples the first 30 + last 30 segments from the transcript and asks the
 * model to extract the video's setting, register, named entities, and domain
 * vocabulary in a single shot. The result is injected into every Stage B
 * batch prompt so segment-level translations keep macro context that
 * batch-only translation easily loses.
 */
async function profileVideo(
  openai: OpenAI,
  segments: PipelineSegment[],
): Promise<VideoProfile> {
  const sample =
    segments.length <= 60
      ? segments.map((s) => s.text).join(" ")
      : [
          ...segments.slice(0, 30).map((s) => s.text),
          "... [middle omitted for brevity] ...",
          ...segments.slice(-30).map((s) => s.text),
        ].join(" ");

  const prompt = `You will profile a video transcript so that a translator can render it naturally into ${TRANSLATION_LANGUAGE}. Read the transcript and infer the following.

Transcript (${AUDIO_LANGUAGE.name}):
${sample}

Return JSON with these fields:
- "context": one or two sentences describing the setting, situation, and who is speaking to whom.
- "genre": a short label for the video type (e.g. "talk show interview", "TED talk", "scripted drama dialogue", "documentary narration", "news report", "vlog monologue", "podcast conversation"). Be specific.
- "register": one sentence telling the translator what default register/tone to use in ${TRANSLATION_LANGUAGE}, based on the speaker's relationship to the audience. For Korean output, name the speech level explicitly (해요체 / 합쇼체 / 반말 / 혼합) and the overall tone (conversational, formal, lecturing, intimate, journalistic, etc.). Do NOT default to polite Korean — match what fits the genre and audience. E.g. friends chatting in a sitcom → 반말; a news anchor → 합쇼체; a TED speaker → 해요체 with formal-lecture tone.
- "named_entities": array of proper nouns to preserve verbatim (people, brands, places, fictional names, song titles). Include nicknames or placeholder names if the speaker flags them as such (e.g. "Brandon, which is not his name").
- "domain_terms": array of domain-specific words or idioms where a literal translation would mislead, paired with the contextual gloss in ${TRANSLATION_LANGUAGE}. Format each entry as "english_term → ${TRANSLATION_LANGUAGE}_gloss". Include only terms that actually appear in the transcript. Examples: "work in (gym) → (기구) 같이 쓰다", "hit on (someone) → ~한테 수작 걸다", "the floor (legislature) → 본회의장".

Output JSON only, no commentary.`;

  const resp = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = resp.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<VideoProfile>;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  return {
    context: parsed.context ?? "",
    genre: parsed.genre ?? "",
    register: parsed.register ?? "",
    named_entities: Array.isArray(parsed.named_entities) ? parsed.named_entities : [],
    domain_terms: Array.isArray(parsed.domain_terms) ? parsed.domain_terms : [],
  };
}

/**
 * Stage B — Translate one batch with surrounding context and the video
 * profile injected.
 *
 * The prompt teaches general translation craft (natural word order,
 * discourse markers, quotation conventions, self-corrections) and then
 * defers to the profile for register and domain vocabulary. The profile
 * carries the genre-specific choices instead of the prompt hard-coding any
 * particular register or tone.
 */
function buildPrompt(
  batch: PipelineSegment[],
  contextBefore: string,
  contextAfter: string,
  profile: VideoProfile,
): string {
  const list = batch.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
  const entities = profile.named_entities.length
    ? profile.named_entities.join(", ")
    : "(none identified)";
  const terms = profile.domain_terms.length
    ? profile.domain_terms.map((t) => `  - ${t}`).join("\n")
    : "  (none identified)";

  return `You are translating ${AUDIO_LANGUAGE.name} into ${TRANSLATION_LANGUAGE} for language learners. Produce translations that sound like a native ${TRANSLATION_LANGUAGE} speaker naturally re-telling what was said — never a word-by-word conversion.

## Video profile (applies to every line in this video)
- Context: ${profile.context || "(no context inferred)"}
- Genre: ${profile.genre || "(unspecified)"}
- Register to use: ${profile.register || `default to natural conversational ${TRANSLATION_LANGUAGE}`}
- Named entities to preserve: ${entities}
- Domain terms (use the gloss, not the literal meaning):
${terms}

## General translation principles
1. **Natural target-language word order.** Restructure freely. Do not preserve source sentence structure if it sounds unnatural in ${TRANSLATION_LANGUAGE}.
2. **Register consistency.** Follow the "Register to use" above throughout the batch. Do not drift between speech levels mid-segment unless the source clearly switches voice (see principle 5).
3. **Discourse markers.** Convert filler words idiomatically rather than dropping them. They carry tone. Choose target-language equivalents that fit the genre and register from the profile.
4. **Self-corrections and stutters.** Render the speaker's intended meaning smoothly. Do not transcribe stutter marks like "th-" or "m-" into the translation.
5. **Voice within voice (quoted speech and inner monologue).** When the speaker quotes someone else, their past self, or a hypothetical voice, mark the quotation clearly using ${TRANSLATION_LANGUAGE}'s natural conventions (quotation marks, reporting verbs, or speech-level shifts). For Korean specifically: when narration is polite and the quoted inner-thought is casual, using a plain-form verb inside quotes (그래, ~지, ~다고) often reads more naturally than forcing polite form throughout — but only if the source clearly signals an inward shift.
6. **Cultural and idiomatic references.** Translate the meaning, not the surface form. Keep culturally specific names (Thor's trainer, The Avengers) but add a connector if needed so the target-language sentence flows.
7. **Disambiguation via context.** Use the surrounding sentences and the video profile to pick the right sense of polysemous words. Always prefer the domain-appropriate reading over the most common dictionary meaning.
8. **Audience interjections.** If the transcript embeds an off-speaker interjection (e.g. "(Right.)" from a host), keep it in parentheses in the translation.

## Surrounding context (for reference only — do NOT translate these)
Before this batch: ${contextBefore || "(start of transcript)"}
After this batch: ${contextAfter || "(end of transcript)"}

## Segments to translate (in order)
${list}

## Output format (JSON only, no markdown)
Return translations in the SAME ORDER as the input. Do not reorder, skip, or merge segments. If a segment is a single filler word, translate that filler word — do not return an empty string.
{
  "segments": [
    { "translation": "natural ${TRANSLATION_LANGUAGE} translation here" }
  ]
}`;
}

/**
 * Stage 4: Batched GPT-4o-mini translation with a video-level profile.
 *
 * Pipeline:
 *   1. profileVideo()      — 1 GPT call, extracts genre/register/entities/domain terms
 *   2. translateBatch × N  — batched translation with wide context window + profile injection
 *
 * Translation index is matched by batch position (not GPT's returned index)
 * to defend against the model dropping or reordering entries. The pipeline
 * contract is unchanged: input is segments.json, output is
 * segments_translated.json with the same `segments` shape plus an optional
 * `profile` field for auditing.
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

  // ── Step A: one-shot video profile ──────────────────────────
  const profile = await profileVideo(openai, segments);
  await updateJobProgress(jobId, "translate", 5);

  // ── Step B: batched translation with wide context + profile ──
  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);

    const contextBefore = segments
      .slice(Math.max(0, i - CONTEXT_WINDOW), i)
      .map((s) => s.text)
      .join(" ");
    const contextAfter = segments
      .slice(i + batch.length, i + batch.length + CONTEXT_WINDOW)
      .map((s) => s.text)
      .join(" ");

    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: buildPrompt(batch, contextBefore, contextAfter, profile),
        },
      ],
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
    // 5% spent on profile; remaining 95% is for batch translation
    const pct = 5 + Math.round((done / segments.length) * 95);
    await updateJobProgress(jobId, "translate", pct);
  }

  const result: TranslatedTranscript = {
    audio_duration_secs: input.audio_duration_secs,
    segments: out,
    profile,
  };
  await putJson(jobKey(jobId, "segments_translated.json"), result);
  await updateJobProgress(jobId, "translate", 100);
}
