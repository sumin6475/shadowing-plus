// first-language.ts — the learner's first language (L1).
//
// The app is N:1 — many first languages (the "N": Korean, Spanish, Russian, …)
// learning ONE target, English (the "1"). So anything we greet the learner with
// must be in THEIR language, never hardcoded to Korean. (Mirror of the clip-side
// principle: never hardcode the target language — see the web videos.target_lang.)
//
// There's no user Settings choice yet, so we infer L1 from the device locale via
// Hermes' Intl (no native module, no rebuild). When Settings lands, it calls
// setFirstLanguage() and that override wins.

export type L1 = "en" | "ko" | "es" | "ru";
const SUPPORTED: readonly L1[] = ["en", "ko", "es", "ru"];

let override: L1 | null = null;

/** Future Settings hook: force the learner's L1, overriding the device locale. */
export function setFirstLanguage(l1: L1 | null): void {
  override = l1;
}

function deviceLang(): string {
  try {
    return (Intl.DateTimeFormat().resolvedOptions().locale || "en").split("-")[0].toLowerCase();
  } catch {
    return "en";
  }
}

/** The learner's L1: the Settings override if set, else the device locale,
 *  falling back to English for any language we don't have copy for yet. */
export function firstLanguage(): L1 {
  if (override) return override;
  const code = deviceLang();
  return (SUPPORTED as readonly string[]).includes(code) ? (code as L1) : "en";
}

// L1-localized copy for the "Stuck" quick note. The note itself can be written
// in any language — this just greets the learner in theirs so they know it's ok.
const STUCK_NOTE: Record<L1, { title: string; placeholder: string }> = {
  en: { title: "What did you want to say?", placeholder: "Write it however you can — I’ll turn it into English." },
  ko: { title: "무슨 말을 하려고 했나요?", placeholder: "한국어로 적어도 돼요 — 영어로 바꿔줄게요." },
  es: { title: "¿Qué querías decir?", placeholder: "Escríbelo en tu idioma — lo pasaré al inglés." },
  ru: { title: "Что вы хотели сказать?", placeholder: "Пишите на своём языке — я переведу на английский." },
};

export function stuckNoteCopy(): { title: string; placeholder: string } {
  return STUCK_NOTE[firstLanguage()];
}
