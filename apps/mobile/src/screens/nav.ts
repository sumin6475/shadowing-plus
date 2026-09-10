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
  | "situationPhrases"
  | "situationAttempts"
  | "speakingNote"
  | "topicsList"
  | "sessionsList";

/** Where a pushed screen should be restored to. `stack` is the detail stack to
 *  rebuild on `tab`, bottom-first — an empty stack lands on the tab's base
 *  screen. */
export interface ReturnTarget {
  tab: TabId;
  stack: { name: ViewName; props?: Record<string, unknown> }[];
}

export interface TalkCtx {
  ctx?: string;
  sub?: string | null;
  prompt?: string | null;
  beats?: string[] | null;
  from?: TabId;
  /** Link the saved talk_session to a Speaking World story/message, if any. */
  storyId?: string | null;
  messageId?: string | null;
  /** Where to land when the attempt ends. Without it Talk falls back to
   *  `nav.go(from)`, which clears the detail stack and drops the learner on a
   *  tab root instead of the note they were practising. */
  returnTo?: ReturnTarget;
}

export interface Nav {
  /** Push a detail view onto the stack over the current tab. */
  push: (name: ViewName, props?: Record<string, unknown>) => void;
  /** Pop the top detail view. */
  pop: () => void;
  /** Switch tabs and clear the detail stack. */
  go: (tab: TabId) => void;
  /** Switch tabs and rebuild a detail stack there, instead of clearing it.
   *  Used to come back from a full-screen flow (Talk) to the screen that
   *  started it. */
  restore: (target: ReturnTarget) => void;
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
