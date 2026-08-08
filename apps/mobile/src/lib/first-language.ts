// first-language.ts — the learner's first language (L1).
//
// The app is N:1 — many first languages (the "N": Korean, Spanish, Russian, …)
// learning ONE target, English (the "1"). So anything we greet the learner with
// must be in THEIR language, never hardcoded to Korean. (Mirror of the clip-side
// principle: never hardcode the target language — see the web videos.target_lang.)
//
// There's no user Settings choice yet, so we infer L1 from the device locale via
// Hermes' Intl (no native module, no rebuild). When Settings lands, it calls
// setFirstLanguage() and that override wins. A learner's explicit choice is
// persisted (AsyncStorage) and reloaded at boot so it survives restarts.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type L1 = "en" | "ko" | "es" | "ru";
const SUPPORTED: readonly L1[] = ["en", "ko", "es", "ru"];
const STORAGE_KEY = "first_language";

let override: L1 | null = null;

/** Force the learner's L1 for this session (in-memory), overriding the locale. */
export function setFirstLanguage(l1: L1 | null): void {
  override = l1;
}

/** English label per L1, for compact Settings rows. */
export const L1_LABEL: Record<L1, string> = {
  en: "English",
  ko: "Korean",
  es: "Spanish",
  ru: "Russian",
};

/** Picker options — native name + English, so a learner recognises their own. */
export const L1_OPTIONS: { value: L1; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어 · Korean" },
  { value: "es", label: "Español · Spanish" },
  { value: "ru", label: "Русский · Russian" },
];

/** Load the saved L1 (if any) into the override. Call once at app boot, before
 *  the first render that reads firstLanguage(). */
export async function loadFirstLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && (SUPPORTED as readonly string[]).includes(saved)) override = saved as L1;
  } catch {
    // Ignore — fall back to the device locale.
  }
}

/** Persist the learner's chosen L1 and apply it immediately. */
export async function persistFirstLanguage(l1: L1): Promise<void> {
  setFirstLanguage(l1);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, l1);
  } catch {
    // The in-memory override still applies for this session.
  }
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
