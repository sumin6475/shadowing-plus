// english-level.ts — the learner's self-reported English level (CEFR).
//
// Talk diagnosis reads this to pitch suggestions at the right difficulty:
// a B1 speaker gets simpler, high-frequency rewrites; a C1 speaker gets
// sharper professional phrasing. Persisted locally like first language.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type EnglishLevel = "a2" | "b1" | "b2" | "c1";

const SUPPORTED: readonly EnglishLevel[] = ["a2", "b1", "b2", "c1"];
const STORAGE_KEY = "english_level";
const DEFAULT_LEVEL: EnglishLevel = "b1";

let override: EnglishLevel | null = null;

export const ENGLISH_LEVEL_LABEL: Record<EnglishLevel, string> = {
  a2: "A2 · Basic",
  b1: "B1 · Intermediate",
  b2: "B2 · Upper intermediate",
  c1: "C1 · Advanced",
};

export const ENGLISH_LEVEL_DETAIL: Record<EnglishLevel, string> = {
  a2: "You can handle everyday topics with simple sentences.",
  b1: "You can hold a conversation, but complex ideas take effort.",
  b2: "You speak comfortably and want more natural, precise wording.",
  c1: "You speak fluently and want professional-grade polish.",
};

export const ENGLISH_LEVEL_OPTIONS: { value: EnglishLevel; label: string }[] = (
  ["a2", "b1", "b2", "c1"] as const
).map((value) => ({ value, label: ENGLISH_LEVEL_LABEL[value] }));

function isLevel(value: unknown): value is EnglishLevel {
  return typeof value === "string" && (SUPPORTED as readonly string[]).includes(value);
}

export function setEnglishLevel(level: EnglishLevel | null): void {
  override = level;
}

export function englishLevel(): EnglishLevel {
  return override ?? DEFAULT_LEVEL;
}

export async function loadEnglishLevel(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isLevel(saved)) override = saved;
  } catch {
    // Fall back to B1.
  }
}

export async function persistEnglishLevel(level: EnglishLevel): Promise<void> {
  setEnglishLevel(level);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, level);
  } catch {
    // In-memory override still applies for this session.
  }
}
