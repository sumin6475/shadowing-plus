import { audioKeyFor, getJob, updateJobProgress } from "./jobs";
import {
  getSignedDownloadUrl,
  jobKey,
  putJson,
} from "@/lib/r2";
import type { PipelineSegment, PipelineWord } from "@/lib/types";
import { languagePairForJob } from "./languages";
import { pickAsrProvider } from "@/lib/asr/provider";
import type { AsrWord } from "@/lib/asr/types";
import { recordUsage } from "@/lib/usage";
import { SENTENCE_END_PUNCT, joinWords } from "./text";

const GAP_SPLIT_SEC = 1.0;
const MAX_SEGMENT_DURATION_SEC = 30.0;
const TRAILING_QUOTES = "\"')]}»”’";

interface RawTranscript {
  audio_duration_secs: number | null;
  segments: PipelineSegment[];
}

function isPunctOnly(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return [...t].every((c) => !/\p{L}|\p{N}/u.test(c));
}

function endsSentence(word: string): boolean {
  let stripped = word.trim();
  while (stripped.length > 0 && TRAILING_QUOTES.includes(stripped.slice(-1))) {
    stripped = stripped.slice(0, -1);
  }
  if (!stripped) return false;
  return SENTENCE_END_PUNCT.has(stripped.slice(-1));
}

function groupWordsIntoSegments(raw: AsrWord[]): PipelineSegment[] {
  // Filter + attach punctuation-only entries to previous word.
  const clean: PipelineWord[] = [];
  for (const w of raw) {
    if (w.type !== undefined && w.type !== "word") continue;
    const text = (w.text ?? "").trim();
    if (!text) continue;
    if (clean.length > 0 && isPunctOnly(text)) {
      const prev = clean[clean.length - 1];
      prev.word = prev.word + text;
      if (w.end !== null && w.end !== undefined) prev.end = w.end;
      continue;
    }
    clean.push({ word: text, start: w.start, end: w.end });
  }
  if (clean.length === 0) return [];

  const segments: PipelineSegment[] = [];
  let cur: PipelineWord[] = [];

  const flush = () => {
    if (cur.length === 0) return;
    const text = joinWords(cur.map((w) => w.word));
    if (!text) {
      cur = [];
      return;
    }
    segments.push({
      text,
      start: cur[0].start ?? 0,
      end: cur[cur.length - 1].end ?? cur[0].start ?? 0,
      words: cur.map((w) => ({ word: w.word, start: w.start, end: w.end })),
    });
    cur = [];
  };

  for (let i = 0; i < clean.length; i++) {
    const w = clean[i];
    cur.push(w);
    let split = false;

    if (endsSentence(w.word)) {
      split = true;
    } else if (i + 1 < clean.length) {
      const nextStart = clean[i + 1].start;
      const thisEnd = w.end;
      if (
        thisEnd !== null &&
        nextStart !== null &&
        thisEnd !== undefined &&
        nextStart !== undefined &&
        nextStart - thisEnd >= GAP_SPLIT_SEC
      ) {
        split = true;
      }
    }
    if (!split) {
      const segStart = cur[0].start;
      const segEnd = w.end;
      if (
        segStart !== null &&
        segEnd !== null &&
        segStart !== undefined &&
        segEnd !== undefined &&
        segEnd - segStart >= MAX_SEGMENT_DURATION_SEC
      ) {
        split = true;
      }
    }
    if (split) flush();
  }
  flush();

  return segments;
}

/**
 * Stage 2: Cloud transcription. The source language (migration 011) selects the
 * provider — zh/ja → ElevenLabs Scribe, everything else → Groq Whisper (see
 * pickAsrProvider). Reads audio from R2 via a signed URL, groups the returned
 * word stream into segments, and writes raw_transcript.json. Grouping is shared
 * across providers so segmentation behaves identically regardless of backend.
 */
export async function stage2Transcribe(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await updateJobProgress(jobId, "transcribe", 0);

  const audioUrl = await getSignedDownloadUrl(audioKeyFor(job), 3600);
  await updateJobProgress(jobId, "transcribe", 10);

  const { sourceCode } = languagePairForJob(job);
  const provider = pickAsrProvider(sourceCode);
  const data = await provider.transcribe(audioUrl, sourceCode);
  await updateJobProgress(jobId, "transcribe", 80);

  await recordUsage({
    jobId,
    userId: job.user_id,
    label: job.title,
    // Record which backend actually ran so the cost report attributes spend
    // correctly (Scribe and Groq have very different unit prices).
    provider: provider.name === "scribe" ? "elevenlabs" : "groq",
    model: provider.name === "scribe" ? "scribe_v2" : "whisper-large-v3",
    kind: "transcribe",
    audioSeconds: data.audioDurationSecs ?? 0,
  });

  const segments = groupWordsIntoSegments(data.words ?? []);
  const out: RawTranscript = {
    audio_duration_secs: data.audioDurationSecs ?? null,
    segments,
  };
  await putJson(jobKey(jobId, "raw_transcript.json"), out);
  await updateJobProgress(jobId, "transcribe", 100);
}
