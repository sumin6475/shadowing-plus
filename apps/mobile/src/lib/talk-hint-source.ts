// talk-hint-source.ts — which phrases the self-talk hint sheet shows.
//
// Two sources, chosen from the gear in the sheet's header and remembered
// across sessions (AsyncStorage + in-memory override, same shape as
// talk-focus.ts):
//   today  — the day's review queue (todaysPhrases)
//   linked — the phrases attached to the Situation / Note this attempt came
//            from. Unavailable on a Free talk, which is linked to neither.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TalkHintSource = "today" | "linked";

const SUPPORTED: readonly TalkHintSource[] = ["today", "linked"];
const STORAGE_KEY = "talk_hint_source";
const DEFAULT_SOURCE: TalkHintSource = "today";

let override: TalkHintSource | null = null;

export const TALK_HINT_SOURCE_LABEL: Record<TalkHintSource, string> = {
  today: "Today’s phrases",
  linked: "Linked phrases",
};

export const TALK_HINT_SOURCE_DETAIL: Record<TalkHintSource, string> = {
  today: "The phrases due for review today.",
  linked: "Every phrase saved to what you’re practising.",
};

function isSource(value: unknown): value is TalkHintSource {
  return typeof value === "string" && (SUPPORTED as readonly string[]).includes(value);
}

export function setTalkHintSource(source: TalkHintSource | null): void {
  override = source;
}

export function talkHintSource(): TalkHintSource {
  return override ?? DEFAULT_SOURCE;
}

export async function loadTalkHintSource(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isSource(saved)) override = saved;
  } catch {
    // Fall back to Today's phrases.
  }
}

export async function persistTalkHintSource(source: TalkHintSource): Promise<void> {
  setTalkHintSource(source);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, source);
  } catch {
    // In-memory override still applies for this session.
  }
}
