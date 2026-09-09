// nav.ts — the in-app navigation contract shared by every screen. The shell
// (src/app/shell.tsx) owns tab state + a push/pop detail stack, mirroring the
// prototype's SPApp. Screens never import the shell, avoiding a cycle.
import type { TabId } from "@/design/ui";

export type ViewName =
  | "phrase"
  | "review"
  | "practiceHub"
  | "rehearsal"
  | "island"
  | "newIsland"
  | "domain"
  | "story"
  | "message"
  | "newMessage"
  | "recs"
  | "session"
  | "feedback"
  | "library"
  | "libItem"
  | "capture"
  | "settings"
  | "editProfile"
  | "firstLanguage"
  | "englishLevel"
  | "themePref"
  | "feedbackFocus"
  | "phrasesPerDay"
  | "dailySpeakingGoal"
  | "reminders"
  | "privacy"
  | "studio"
  | "studioTopic"
  | "situation"
  | "speakingNote"
  | "topicsList"
  | "sessionsList";

export interface TalkCtx {
  ctx?: string;
  sub?: string | null;
  prompt?: string | null;
  beats?: string[] | null;
  from?: TabId;
  /** Link the saved talk_session to a Speaking World story/message, if any. */
  storyId?: string | null;
  messageId?: string | null;
}

export interface Nav {
  /** Push a detail view onto the stack over the current tab. */
  push: (name: ViewName, props?: Record<string, unknown>) => void;
  /** Pop the top detail view. */
  pop: () => void;
  /** Switch tabs and clear the detail stack. */
  go: (tab: TabId) => void;
  /** Prime a self-talk context and jump to the Speak tab (mirror flow). */
  startTalk: (ctx: TalkCtx) => void;
  /** Show a brief confirmation that survives a pushed screen being popped. */
  notify: (message: string) => void;
  /** Monotonic revision bumped after a successful create/delete of speaking
   *  data. Studio reads it to refresh the stale NativeTabs mount. */
  speakingDataRevision: number;
  /** Bump `speakingDataRevision` after a successful create/delete mutation. */
  invalidateSpeakingData: () => void;
}

export type { TabId };
