import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import type { AsrProvider, AsrResult, AsrWord } from "./types";
import {
  GROQ_CHUNK_OVERLAP_SECONDS,
  GROQ_CHUNK_SECONDS,
  GROQ_MAX_UPLOAD_BYTES,
  isGroqTooLarge,
  mergeChunkWords,
} from "./groq-chunks";

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL_ID = "whisper-large-v3";

// Groq's Whisper endpoint speaks the OpenAI audio API, which takes an ISO 639-1
// (2-letter) language hint, while the pipeline stores ISO 639-3 codes. Map the
// languages we route to Groq; anything unmapped is sent without a hint (Whisper
// auto-detects), so an unknown code degrades gracefully rather than erroring.
const ISO3_TO_ISO1: Record<string, string> = {
  spa: "es",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt",
  nld: "nl",
  rus: "ru",
  kor: "ko",
  // eng/zh/ja are routed to Scribe, not Groq, so they're intentionally absent.
};

interface GroqWord {
  word: string;
  start: number | null;
  end: number | null;
}

interface GroqVerboseResponse {
  text: string;
  duration?: number;
  words?: GroqWord[];
}

function requireApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  return apiKey;
}

function ffmpegBin(): string {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary for this platform");
  }
  return ffmpegPath as unknown as string;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin(), args);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}\n${stderr.slice(-2000)}`));
    });
  });
}

/** Duration from the container header. Fail open (null) if ffmpeg can't parse it. */
function probeDurationSeconds(inputUrl: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin(), [
      "-reconnect",
      "1",
      "-reconnect_streamed",
      "1",
      "-reconnect_delay_max",
      "5",
      "-i",
      inputUrl,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", () => {
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (!m) return resolve(null);
      resolve(Number(m[1]) * 3600 + Number(m[2]) * 60 + parseFloat(m[3]));
    });
  });
}

function isHttpUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

/**
 * 16 kHz mono 64 kbps MP3 — Whisper downsamples to this anyway, and at this
 * bitrate 10 minutes is ~4.8 MB, safely under Groq's 25 MB attachment cap.
 *
 * `-ss` goes AFTER `-i` so the cut is decoded, not keyframe-approximated.
 * Inaccurate seeks would shift every later chunk's word times off the source.
 */
function extractSpeechMp3(
  input: string,
  output: string,
  ss?: number,
  durationSec?: number,
): Promise<void> {
  const args: string[] = ["-hide_banner", "-loglevel", "error"];
  if (isHttpUrl(input)) {
    args.push(
      "-reconnect",
      "1",
      "-reconnect_streamed",
      "1",
      "-reconnect_delay_max",
      "5",
    );
  }
  args.push("-i", input);
  if (ss != null && ss > 0) args.push("-ss", ss.toFixed(3));
  if (durationSec != null) args.push("-t", durationSec.toFixed(3));
  args.push(
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    "-y",
    output,
  );
  return runFfmpeg(args);
}

function blobFromMp3(filePath: string): Blob {
  const buf = fs.readFileSync(filePath);
  return new Blob([new Uint8Array(buf)], { type: "audio/mpeg" });
}

async function remoteSizeBytes(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    const cl = head.headers.get("content-length");
    if (head.ok && cl && Number.isFinite(Number(cl))) return Number(cl);
  } catch {
    /* fall through to a range GET */
  }
  try {
    const range = await fetch(url, { headers: { Range: "bytes=0-0" } });
    const cr = range.headers.get("content-range");
    const m = cr?.match(/\/(\d+)\s*$/);
    if (m && Number.isFinite(Number(m[1]))) return Number(m[1]);
  } catch {
    /* unknown size */
  }
  return null;
}

function wordsFromGroq(data: GroqVerboseResponse): AsrWord[] {
  return (data.words ?? []).map((w) => ({
    text: w.word,
    start: w.start,
    end: w.end,
    type: "word",
  }));
}

async function groqPost(apiKey: string, body: FormData): Promise<AsrResult> {
  const resp = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Groq ${resp.status}: ${errText.slice(0, 500)}`);
  }
  const data = (await resp.json()) as GroqVerboseResponse;
  return {
    words: wordsFromGroq(data),
    audioDurationSecs: data.duration ?? null,
  };
}

function groqForm(iso1: string | undefined): FormData {
  const form = new FormData();
  form.set("model", GROQ_MODEL_ID);
  form.set("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  if (iso1) form.set("language", iso1);
  return form;
}

async function transcribeFile(
  apiKey: string,
  iso1: string | undefined,
  audio: Blob,
  filename: string,
): Promise<AsrResult> {
  const form = groqForm(iso1);
  form.set("file", audio, filename);
  return groqPost(apiKey, form);
}

async function transcribeChunked(
  signedAudioUrl: string,
  apiKey: string,
  iso1: string | undefined,
): Promise<AsrResult> {
  const duration = await probeDurationSeconds(signedAudioUrl);
  if (duration == null || duration <= 0) {
    throw new Error(
      "Audio is too large for Groq and its duration could not be read, so it cannot be split.",
    );
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp-groq-"));
  try {
    const speechFile = path.join(tmpDir, "speech.mp3");
    await extractSpeechMp3(signedAudioUrl, speechFile);
    if (fs.statSync(speechFile).size <= GROQ_MAX_UPLOAD_BYTES) {
      return transcribeFile(apiKey, iso1, blobFromMp3(speechFile), "speech.mp3");
    }

    const chunks: Array<{
      offsetSec: number;
      overlapSec: number;
      words: AsrWord[];
    }> = [];
    let sourceStart = 0;
    while (sourceStart < duration) {
      const overlapSec = sourceStart === 0 ? 0 : GROQ_CHUNK_OVERLAP_SECONDS;
      const extractStart = sourceStart === 0 ? 0 : sourceStart - overlapSec;
      const extractDur = Math.min(
        GROQ_CHUNK_SECONDS + overlapSec,
        duration - extractStart,
      );
      const outFile = path.join(tmpDir, `chunk-${sourceStart}.mp3`);
      await extractSpeechMp3(speechFile, outFile, extractStart, extractDur);
      const result = await transcribeFile(
        apiKey,
        iso1,
        blobFromMp3(outFile),
        "chunk.mp3",
      );
      chunks.push({
        offsetSec: extractStart,
        overlapSec,
        words: result.words,
      });
      sourceStart += GROQ_CHUNK_SECONDS;
    }
    return { words: mergeChunkWords(chunks), audioDurationSecs: duration };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Groq Whisper large-v3. Cheaper by an order of magnitude than Scribe; used for
 * languages that are not in SCRIBE_LANGS (see pickAsrProvider).
 *
 * Groq rejects multipart attachments over 25 MB (413 request_too_large). Playback
 * audio is 192 kbps CBR — about 17 minutes fills that cap. Small files keep the
 * proven upload path. Larger (or 413'd) files are downsampled to speech bitrate
 * and split into overlapping 10-minute chunks — never sent as one Groq `url`
 * fetch, which completes but drifts word timestamps on long audio.
 */
export const groqProvider: AsrProvider = {
  name: "groq",
  async transcribe(
    signedAudioUrl: string,
    languageCode: string,
  ): Promise<AsrResult> {
    const apiKey = requireApiKey();
    const iso1 = ISO3_TO_ISO1[languageCode];
    const size = await remoteSizeBytes(signedAudioUrl);

    if (size != null && size <= GROQ_MAX_UPLOAD_BYTES) {
      const audioResp = await fetch(signedAudioUrl);
      if (!audioResp.ok) {
        throw new Error(`Failed to fetch audio for Groq (${audioResp.status})`);
      }
      try {
        return await transcribeFile(
          apiKey,
          iso1,
          await audioResp.blob(),
          "audio.mp3",
        );
      } catch (err) {
        if (!isGroqTooLarge(err)) throw err;
      }
    }

    return transcribeChunked(signedAudioUrl, apiKey, iso1);
  },
};

export { GROQ_MODEL_ID };
