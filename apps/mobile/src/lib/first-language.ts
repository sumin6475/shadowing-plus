// first-language.ts — the learner's first language (L1).
//
// The app is N:1 — many first languages (the "N": Korean, Traditional Chinese,
// Japanese, Spanish, Russian, …)
// learning ONE target, English (the "1"). So anything we greet the learner with
// must be in THEIR language, never hardcoded to Korean. (Mirror of the clip-side
// principle: never hardcode the target language — see the web videos.target_lang.)
//
// Until the learner picks one we infer L1 from the device locale via Hermes' Intl
// (no native module, no rebuild). The Settings picker (edit-profile.tsx) calls
// persistFirstLanguage() and that override wins; the choice is persisted
// (AsyncStorage + account) and reloaded at boot so it survives restarts.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./supabase";

export type L1 = "en" | "ko" | "zh-Hant" | "ja" | "es" | "ru";
const SUPPORTED: readonly L1[] = ["en", "ko", "zh-Hant", "ja", "es", "ru"];
const STORAGE_KEY = "first_language";

let override: L1 | null = null;

/** Force the learner's L1 for this session (in-memory), overriding the locale. */
export function setFirstLanguage(l1: L1 | null): void {
  override = l1;
}

/**
 * True only when the learner has actually picked a first language (Settings,
 * persisted). A device locale is an inference, not a choice — surfaces that
 * should stay in the app's own language until told otherwise (the first-run
 * tour) key off this rather than off `firstLanguage()`.
 */
export function firstLanguageIsExplicit(): boolean {
  return override !== null;
}

/** English label per L1, for compact Settings rows. */
export const L1_LABEL: Record<L1, string> = {
  en: "English",
  ko: "Korean",
  "zh-Hant": "Chinese (Traditional)",
  ja: "Japanese",
  es: "Spanish",
  ru: "Russian",
};

/** Picker options — native name + English, so a learner recognises their own. */
export const L1_OPTIONS: { value: L1; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어 · Korean" },
  { value: "zh-Hant", label: "繁體中文 · Chinese (Traditional)" },
  { value: "ja", label: "日本語 · Japanese" },
  { value: "es", label: "Español · Spanish" },
  { value: "ru", label: "Русский · Russian" },
];

const asL1 = (value: unknown): L1 | null =>
  typeof value === "string" && (SUPPORTED as readonly string[]).includes(value) ? (value as L1) : null;

/** Load the saved L1 (if any) into the override. Call once at app boot, before
 *  the first render that reads firstLanguage().
 *
 *  This device wins, then the account: a learner who picked Spanish on their
 *  phone keeps Spanish after a reinstall, and a second device inherits it
 *  instead of silently guessing from the locale again. */
export async function loadFirstLanguage(): Promise<void> {
  try {
    const saved = asL1(await AsyncStorage.getItem(STORAGE_KEY));
    if (saved) {
      override = saved;
      return;
    }
  } catch {
    // Storage unavailable — try the account below.
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const fromAccount = asL1((session?.user.user_metadata as { first_language?: unknown } | undefined)?.first_language);
    if (fromAccount) {
      override = fromAccount;
      void AsyncStorage.setItem(STORAGE_KEY, fromAccount).catch(() => {});
    }
  } catch {
    // Signed out or offline — fall back to the device locale.
  }
}

/** Persist the learner's chosen L1 and apply it immediately.
 *
 *  Written to the account as well as the device, because server-side features
 *  need it: `phrase-capture` glosses in the learner's language, and the client
 *  can only send what it knows. */
export async function persistFirstLanguage(l1: L1): Promise<void> {
  setFirstLanguage(l1);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, l1);
  } catch {
    // The in-memory override still applies for this session.
  }
  try {
    await supabase.auth.updateUser({ data: { first_language: l1 } });
  } catch {
    // Offline or signed out — the device copy is enough until the next change.
  }
}

/** Traditional-script regions. Every other Chinese region reads Simplified —
 *  including Singapore and Malaysia, which is why they aren't listed here. */
const HANT_REGIONS = new Set(["TW", "HK", "MO"]);

/**
 * A BCP-47 locale narrowed to one of our L1 codes (or to something we don't
 * support, which `firstLanguage()` then turns into English).
 *
 * Chinese is the reason this isn't just `locale.split("-")[0]`: Traditional and
 * Simplified are different written languages, and iOS reports either an explicit
 * script subtag (`zh-Hant-TW`) or only a region (`zh-TW`). So read the script
 * when it's there and derive it from the region when it isn't. A Simplified
 * device lands on `zh-Hans`, which we have no copy for — it falls back to
 * English rather than showing a mainland learner the Taiwanese script.
 */
function localeToL1(locale: string): string {
  const [lang, ...rest] = locale.split(/[-_]/);
  const base = (lang || "").toLowerCase();
  if (base !== "zh") return base;
  const script = rest.find((part) => part.length === 4)?.toLowerCase();
  if (script) return script === "hant" ? "zh-Hant" : "zh-Hans";
  const region = rest.find((part) => part.length === 2)?.toUpperCase();
  return region && HANT_REGIONS.has(region) ? "zh-Hant" : "zh-Hans";
}

function deviceL1(): string {
  try {
    return localeToL1(Intl.DateTimeFormat().resolvedOptions().locale || "en");
  } catch {
    return "en";
  }
}

/** The learner's L1: the Settings override if set, else the device locale,
 *  falling back to English for any language we don't have copy for yet. */
export function firstLanguage(): L1 {
  if (override) return override;
  const code = deviceL1();
  return (SUPPORTED as readonly string[]).includes(code) ? (code as L1) : "en";
}
