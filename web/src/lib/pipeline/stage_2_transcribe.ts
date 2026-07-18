import { audioKeyFor, getJob, updateJobProgress } from "./jobs";
import {
  getSignedDownloadUrl,
  jobKey,
  putJson,
} from "@/lib/r2";
import type { PipelineSegment, PipelineWord } from "@/lib/types";
import { AUDIO_LANGUAGE } from "./languages";
import { recordUsage } from "@/lib/usage";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ELEVENLABS_MODEL_ID = "scribe_v2";

const GAP_SPLIT_SEC = 1.0;
const MAX_SEGMENT_DURATION_SEC = 30.0;
const SENTENCE_END_PUNCT = new Set([".", "!", "?", "…"]);
const TRAILING_QUOTES = "\"')]}»”’";

interface ElevenLabsWord {
  text: string;
  start: number | null;
  end: number | null;
  type?: "word" | "spacing" | "audio_event";
}

interface ElevenLabsResponse {
  text: string;
  language_code: string;
  words: ElevenLabsWord[];
  audio_duration_secs?: number;
}

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

function groupWordsIntoSegments(raw: ElevenLabsWord[]): PipelineSegment[] {
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
    const text = cur.map((w) => w.word).join(" ").trim();
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

async function callElevenLabs(
  audioUrl: string,
  apiKey: string,
): Promise<ElevenLabsResponse> {
  const body = new FormData();
  body.set("model_id", ELEVENLABS_MODEL_ID);
  body.set("timestamps_granularity", "word");
  body.set("language_code", AUDIO_LANGUAGE.code);
  body.set("tag_audio_events", "false");
  body.set("diarize", "false");
  body.set("cloud_storage_url", audioUrl);

  const resp = await fetch(ELEVENLABS_API_URL, {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`ElevenLabs ${resp.status}: ${errText.slice(0, 500)}`);
  }
  return resp.json() as Promise<ElevenLabsResponse>;
}

/**
 * Stage 2: Cloud transcription via ElevenLabs Scribe v2.
 * Reads audio from R2 (via signed URL fed to ElevenLabs' cloud_storage_url),
 * groups the returned word stream into segments, and writes raw_transcript.json.
 */
export async function stage2Transcribe(jobId: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);
  await updateJobProgress(jobId, "transcribe", 0);

  const audioUrl = await getSignedDownloadUrl(audioKeyFor(job), 3600);
  await updateJobProgress(jobId, "transcribe", 10);

  const data = await callElevenLabs(audioUrl, apiKey);
  await updateJobProgress(jobId, "transcribe", 80);

  await recordUsage({
    jobId,
    userId: job.user_id,
    label: job.title,
    provider: "elevenlabs",
    model: ELEVENLABS_MODEL_ID,
    kind: "transcribe",
    audioSeconds: data.audio_duration_secs ?? 0,
  });

  const segments = groupWordsIntoSegments(data.words ?? []);
  const out: RawTranscript = {
    audio_duration_secs: data.audio_duration_secs ?? null,
    segments,
  };
  await putJson(jobKey(jobId, "raw_transcript.json"), out);
  await updateJobProgress(jobId, "transcribe", 100);
}
