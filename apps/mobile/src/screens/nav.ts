// nav.ts — the in-app navigation contract shared by every screen. The shell
// (src/app/shell.tsx) owns tab state + a push/pop detail stack, mirroring the
// prototype's SPApp. Screens never import the shell, avoiding a cycle.
import type { TabId } from "@/design/ui";

export type ViewName =
  | "phrase"
  | "review"
  | "island"
  | "newIsland"
  | "domain"
  | "story"
  | "message"
  | "newMessage"
  | "recs"
  | "sessions"
  | "session"
  | "libItem"
  | "saveChunk"
  | "settings";

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
}

export type { TabId };
