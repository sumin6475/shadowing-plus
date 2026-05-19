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
