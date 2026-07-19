import type { AsrProvider } from "./types";
import { scribeProvider } from "./scribe";
import { groqProvider } from "./groq";

// Languages (ISO 639-3) that go to ElevenLabs Scribe. Chinese and Japanese are
// tonal / non-space-delimited and Scribe handles their word segmentation far
// better than Whisper, so the cost premium is worth it there. Everything else
// routes to Groq Whisper, which is ~an order of magnitude cheaper.
const SCRIBE_LANGS = new Set<string>(["cmn", "zho", "chi", "jpn"]);

/**
 * Choose the ASR backend for a source language. zh/ja → Scribe (quality),
 * everything else → Groq (cost). If Groq quality proves insufficient for a
 * given language during A4 validation, add it to SCRIBE_LANGS — no other code
 * changes, since stage 2 only talks to the returned provider.
 */
export function pickAsrProvider(sourceLang: string): AsrProvider {
  return SCRIBE_LANGS.has(sourceLang) ? scribeProvider : groqProvider;
}
