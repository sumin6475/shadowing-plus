// talk-focus.ts — the learner's chosen self-talk feedback focus.
//
// After a Speak session, talk-diagnose should coach on ONE thing: grammar,
// whole-talk structure, advanced words/phrases, or reusable sentence patterns.
// Persisted locally like first language (AsyncStorage + in-memory override).
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TalkFocus = "grammar" | "structure" | "advanced" | "pattern";

const SUPPORTED: readonly TalkFocus[] = ["grammar", "structure", "advanced", "pattern"];
const STORAGE_KEY = "talk_focus";
const DEFAULT_FOCUS: TalkFocus = "grammar";

let override: TalkFocus | null = null;

export const TALK_FOCUS_LABEL: Record<TalkFocus, string> = {
  grammar: "Grammar",
  structure: "Structure",
  advanced: "Advanced words",
  pattern: "Pattern",
};

/** One-line explainer under the picker. Pattern reuses the onboarding frame. */
export const TALK_FOCUS_DETAIL: Record<TalkFocus, string> = {
  grammar: "Sentence-level fixes: tense, articles, agreement — not the shape of the whole talk.",
  structure: "How the whole talk is organized, so a listener can follow it like a timeline.",
  advanced: "The exact word or phrase instead of talking around the idea.",
  pattern: "Reusable sentence frames to practice until automatic, like “What I’m trying to do is…”.",
};

export const TALK_FOCUS_OPTIONS: { value: TalkFocus; label: string }[] = (
  ["grammar", "structure", "advanced", "pattern"] as const
).map((value) => ({ value, label: TALK_FOCUS_LABEL[value] }));

function isFocus(value: unknown): value is TalkFocus {
  return typeof value === "string" && (SUPPORTED as readonly string[]).includes(value);
}

export function setTalkFocus(focus: TalkFocus | null): void {
  override = focus;
}

export function talkFocus(): TalkFocus {
  return override ?? DEFAULT_FOCUS;
}

export async function loadTalkFocus(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isFocus(saved)) override = saved;
  } catch {
    // Fall back to Grammar.
  }
}

export async function persistTalkFocus(focus: TalkFocus): Promise<void> {
  setTalkFocus(focus);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, focus);
  } catch {
    // In-memory override still applies for this session.
  }
}
