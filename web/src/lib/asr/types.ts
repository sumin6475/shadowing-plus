/**
 * Provider-agnostic ASR output. Each provider (ElevenLabs Scribe, Groq
 * whisper) returns the transcript as a flat word stream with timings; stage 2
 * owns the word → segment grouping so that logic stays shared across providers.
 */

/** One recognized token with its timing. `start`/`end` are seconds, or null
 *  when the provider omits them (rare — handled downstream). */
export interface AsrWord {
  text: string;
  start: number | null;
  end: number | null;
  /** Providers tag non-lexical tokens (spacing, audio events); stage 2 filters
   *  to `word` (and undefined, treated as a word). */
  type?: "word" | "spacing" | "audio_event";
}

/** What a provider returns: the word stream plus the measured audio length
 *  (for usage billing). */
export interface AsrResult {
  words: AsrWord[];
  audioDurationSecs: number | null;
}

/** The transcription providers we route between. */
export type AsrProviderName = "scribe" | "groq";

/**
 * A concrete transcription backend. Given a signed audio URL and an ISO 639-3
 * language code, it returns a normalized word stream. Grouping into segments
 * happens in stage 2, after this returns, so it is identical for every provider.
 */
export interface AsrProvider {
  name: AsrProviderName;
  transcribe(signedAudioUrl: string, languageCode: string): Promise<AsrResult>;
}
