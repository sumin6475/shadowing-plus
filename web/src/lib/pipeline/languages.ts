/**
 * Default language pair for the pipeline. Change these to switch the
 * audio recognition language and/or the translation output language.
 *
 * NOTE: when changing TRANSLATION_LANGUAGE away from Korean, consider
 * swapping the Pretendard font in `web/src/app/layout.tsx` for one
 * optimized for the new translation language (Pretendard is tuned for
 * Korean — e.g. for Japanese use Noto Sans JP, for European languages
 * use Inter / Geist / etc.).
 */

/** The audio language — what learners hear and shadow. */
export const AUDIO_LANGUAGE = {
  /** ISO 639-3 code for ElevenLabs Scribe v2.
   *  e.g. "eng", "kor", "jpn", "spa", "fra", "deu". */
  code: "eng",
  /** Human-readable name used inside the GPT-4o-mini translation prompt. */
  name: "English",
} as const;

/** The learner's native language. Segment translations are generated in
 *  this language. Plain English label — interpolated into prompts as-is. */
export const TRANSLATION_LANGUAGE = "Korean" as const;

// ---------------- Per-clip language pair (migration 011) ----------------
// Single source of truth for the language options the app offers. The upload
// form and the Settings → Language tab both render from these, and the pipeline
// resolves a job's stored pair through languagePairForJob() below. Codes are
// ISO 639-3 (what ElevenLabs Scribe / Groq whisper accept).

/** Audio (source) languages a clip can be transcribed from. */
export const AUDIO_LANGUAGE_OPTIONS = [
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "cmn", name: "Chinese (Mandarin)" },
] as const;

/** Translation (target) languages. Plain English labels — interpolated into
 *  the translation prompt verbatim, same shape as TRANSLATION_LANGUAGE. */
export const TRANSLATION_LANGUAGE_OPTIONS = [
  "Korean",
  "English",
  "Japanese",
  "Spanish",
  "French",
  "German",
  "Chinese",
] as const;

/** The resolved pair a stage works with. */
export interface LanguagePair {
  /** ISO 639-3 code for the ASR provider. */
  sourceCode: string;
  /** Human-readable source name, injected into the translation prompt. */
  sourceName: string;
  /** Plain English target label, interpolated into the translation prompt. */
  targetName: string;
}

/** localStorage keys for the user's preferred pair, set by the Settings →
 *  Language tab and read as the default in the upload form. Shared here so the
 *  two sites can't drift. */
export const AUDIO_LANG_PREF_KEY = "sp:pref:audioLang";
export const TRANSLATION_LANG_PREF_KEY = "sp:pref:translationLang";

/** Map an audio code to its display name, falling back to the code itself
 *  for anything not in the option list (never throws). */
export function audioLanguageName(code: string): string {
  return AUDIO_LANGUAGE_OPTIONS.find((o) => o.code === code)?.name ?? code;
}

// Source languages whose transcripts are NOT written in the Latin alphabet.
// The English-era "drop non-Latin segments" hallucination rule
// (removeNonEnglish) must be skipped for these — for a Japanese/Korean/Chinese
// source it would delete the entire legitimate transcript.
const NON_LATIN_SCRIPT_LANGS = new Set<string>([
  "jpn", "kor", "cmn", "zho", "chi", "yue",
]);

/** Whether a source language is written in the Latin alphabet. Unknown codes
 *  default to true (Latin), matching the app's Latin-first history. */
export function isLatinScriptLanguage(code: string): boolean {
  return !NON_LATIN_SCRIPT_LANGS.has(code);
}

/**
 * Resolve the language pair for a job/video row. Rows created before migration
 * 011 (or any upload that omitted the pair) have null columns and fall back to
 * the fixed eng → Korean default, preserving the original single-language
 * behavior. This is the one place the pipeline reads languages from.
 */
export function languagePairForJob(row: {
  source_lang?: string | null;
  target_lang?: string | null;
}): LanguagePair {
  const sourceCode = row.source_lang ?? AUDIO_LANGUAGE.code;
  const targetName = row.target_lang ?? TRANSLATION_LANGUAGE;
  return { sourceCode, sourceName: audioLanguageName(sourceCode), targetName };
}
