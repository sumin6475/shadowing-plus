import type { AsrProvider } from "./types";
import { scribeProvider } from "./scribe";
import { groqProvider } from "./groq";

// Languages (ISO 639-3) that go to ElevenLabs Scribe. English is the product's
// main shadowing language — word timestamps have to land on the mouth, so it
// stays on Scribe (Groq Whisper drifted on long clips). Chinese and Japanese
// are tonal / non-space-delimited and Scribe segments them far better than
// Whisper. Everything else routes to Groq, which is ~an order of magnitude cheaper.
const SCRIBE_LANGS = new Set<string>(["eng", "cmn", "zho", "chi", "jpn"]);

/**
 * Choose the ASR backend for a source language. eng/zh/ja → Scribe (quality),
 * everything else → Groq (cost). Add a code here if Groq quality is not enough
 * — stage 2 only talks to the returned provider.
 */
export function pickAsrProvider(sourceLang: string): AsrProvider {
  return SCRIBE_LANGS.has(sourceLang) ? scribeProvider : groqProvider;
}
