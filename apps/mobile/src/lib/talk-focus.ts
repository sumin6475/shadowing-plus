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
  grammar: "Sentence-level fixes: tense, articles, agreement.",
  structure: "How the whole talk is organized, so a listener can follow it like a timeline.",
  advanced: "The exact word or phrase instead of talking around the idea.",
  pattern: "Professional sentence frames that give your main point more variety, focus, and authority.",
};

/** Sample moment shown on the Feedback focus screen — same shape as self-talk recap. */
export const TALK_FOCUS_EXAMPLE: Record<
  TalkFocus,
  { saidParts: { text: string; error?: boolean }[]; want: string; why: string }
> = {
  grammar: {
    saidParts: [
      { text: "If we " },
      { text: "will launch", error: true },
      { text: " the product next month, our sales " },
      { text: "would increase", error: true },
      { text: "." },
    ],
    want: "If we launch the product next month, our sales will increase.",
    why: "Conditional structure — use simple present in the “if” clause for real future possibilities.",
  },
  structure: {
    saidParts: [
      { text: "I think our project was delayed " },
      { text: "because the team communication was bad, and also", error: true },
      { text: " we had too many meetings, " },
      { text: "so everyone was tired and we missed the deadline", error: true },
      { text: "." },
    ],
    want: "Our project missed the deadline mainly due to poor communication. Unnecessary meetings caused team fatigue, which ultimately derailed our timeline.",
    why: "Clear cause-and-effect structure: state the core issue first, then connect the contributing factors logically.",
  },
  advanced: {
    saidParts: [
      { text: "We need to " },
      { text: "change our plan a little bit", error: true },
      { text: " so we can " },
      { text: "deal with the new market situation", error: true },
      { text: "." },
    ],
    want: "We need to adapt our strategy to align with changing market conditions.",
    why: "Precise wording: replaced vague phrases (“change a little bit”, “deal with”) with strong professional verbs (“adapt”, “align”).",
  },
  pattern: {
    saidParts: [
      { text: "My point is that", error: true },
      { text: " we should invest more in marketing, " },
      { text: "that's what I think", error: true },
      { text: "." },
    ],
    want: "What I’m trying to emphasize is that investing in marketing is critical at this stage.",
    why: "Emphasis pattern: “What I’m trying to emphasize is…” brings focus and authority to your main argument.",
  },
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
