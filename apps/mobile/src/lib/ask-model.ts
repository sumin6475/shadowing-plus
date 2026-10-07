// ask-model.ts — the Ask assistant's data, as pure functions.
//
// The reply types mirror supabase/functions/ask-assist/core.ts (copied by
// hand — this app imports nothing from outside apps/mobile). Everything here
// runs under `node --test`: what a session sends back as history, how a draft
// becomes note points, and what "Save to Phrase" writes.
import type { OutlineSection } from "./mvp-model";

export type AskMode = "how_to_say" | "note";
/** Turns kept as history, user and assistant together (server: MAX_TURNS). */
export const ASK_HISTORY_TURNS = 6;
/** Longest question the server accepts (server: MAX_USER_CHARS). */
export const ASK_MAX_CHARS = 800;

export interface Example {
  en: string;
  l1: string;
}
export interface Expression {
  en: string;
  meaning: string;
  /** Situation label; "" when there is only one reading. */
  when: string;
}
export interface ExpressionWithExample extends Expression {
  example: Example;
}
export interface Draft {
  opening: string;
  body: string;
  closing: string;
}
export interface HowToSayCard {
  type: "card";
  query: string;
  expressions: Expression[];
  nuance: string;
  examples: Example[];
  tip: string;
  follow_ups: string[];
}
export interface NoteCard {
  type: "card";
  situation: string;
  draft: Draft;
  key_phrases: ExpressionWithExample[];
  terms: { en: string; meaning: string }[];
  follow_ups: string[];
}
export interface AskAnswer {
  type: "answer";
  text: string;
  expressions: ExpressionWithExample[];
  /** Note mode only: the sections this answer rewrites; "" = unchanged. */
  draft_patch?: Draft;
  follow_ups: string[];
}
export interface OffTopic {
  type: "off_topic";
}
export type AskReply = HowToSayCard | NoteCard | AskAnswer | OffTopic;

export const isNoteCard = (reply: AskReply): reply is NoteCard =>
  reply.type === "card" && "draft" in reply;
export const isHowToSayCard = (reply: AskReply): reply is HowToSayCard =>
  reply.type === "card" && "expressions" in reply;

/** One line of the conversation as the sheet holds it. */
export type AskTurn =
  | { id: string; role: "user"; text: string; mode: AskMode }
  | { id: string; role: "assistant"; reply: AskReply; mode: AskMode };

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

/** How a past reply goes back to the model. Must match `assistantContent` in
 *  the function's core.ts: compact JSON, so the model sees its own structure. */
export const assistantContent = (reply: AskReply) => JSON.stringify({ reply });

/** The last turns as request messages. The window always opens on a user
 *  turn — a history that starts with an answer has lost its question. */
export function trimHistory(turns: AskTurn[], max = ASK_HISTORY_TURNS): AskMessage[] {
  let kept = turns.slice(-max);
  while (kept.length && kept[0].role !== "user") kept = kept.slice(1);
  return kept.map((turn) =>
    turn.role === "user"
      ? { role: "user", content: turn.text }
      : { role: "assistant", content: assistantContent(turn.reply) },
  );
}

const EMPTY_DRAFT: Draft = { opening: "", body: "", closing: "" };
/** A draft with an answer's rewritten sections laid over it. */
export const applyPatch = (draft: Draft, patch: Draft | undefined): Draft => ({
  opening: patch?.opening || draft.opening,
  body: patch?.body || draft.body,
  closing: patch?.closing || draft.closing,
});
const hasText = (draft: Draft) => Boolean(draft.opening || draft.body || draft.closing);

/** The note draft as it stands after turn `index`: the latest note card, with
 *  every later answer's patch applied. Null before any draft exists. */
export function draftAt(turns: AskTurn[], index: number): Draft | null {
  let draft: Draft | null = null;
  for (const turn of turns.slice(0, index + 1)) {
    if (turn.role !== "assistant") continue;
    if (isNoteCard(turn.reply)) draft = turn.reply.draft;
    else if (turn.reply.type === "answer" && draft) draft = applyPatch(draft, turn.reply.draft_patch);
  }
  return draft && hasText(draft) ? draft : null;
}
/** True when an answer rewrote part of the draft. */
export const patchesDraft = (reply: AskReply) =>
  reply.type === "answer" && hasText(reply.draft_patch ?? EMPTY_DRAFT);

/** Text as the sentences it is made of — a note keeps one point per line. */
export function sentences(text: string): string[] {
  const found = text.replace(/\s+/g, " ").trim().match(/[^.!?]+(?:[.!?]+["”’')\]]*|$)/g) ?? [];
  return found.map((s) => s.trim()).filter(Boolean);
}
/** A draft as the three sections of a note, one point per sentence. */
export const draftSections = (draft: Draft): OutlineSection[] => [
  { heading: "Opening", points: sentences(draft.opening) },
  { heading: "Body", points: sentences(draft.body) },
  { heading: "Closing", points: sentences(draft.closing) },
];

/** The question a reply answers: the nearest user turn above it. */
export function questionFor(turns: AskTurn[], index: number): string {
  for (let i = index; i >= 0; i--) {
    const turn = turns[i];
    if (turn.role === "user") return turn.text;
  }
  return "";
}

/** A note title from the question that started the draft. */
export const noteTitle = (question: string) => {
  const line = question.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
};

export interface AskPhraseInput {
  text: string;
  meaning: string | null;
  usageNote: string | null;
  learnerNote: string | null;
  context: string | null;
  contextTranslation: string | null;
  source: "ask";
  sourceLabel: string;
}
/** What "Save to Phrase" stores: the expression with its meaning, the nuance
 *  as the usage note (led by the situation label, when there is one), one
 *  example as its context, and the learner's own question as their note. */
export function toPhraseInput(
  expression: Expression,
  example: Example | null,
  nuance: string,
  question: string,
): AskPhraseInput {
  const usage = [expression.when, nuance].map((s) => s.trim()).filter(Boolean).join(" · ");
  return {
    text: expression.en.trim(),
    meaning: expression.meaning.trim() || null,
    usageNote: usage || null,
    learnerNote: question.trim() || null,
    context: example?.en.trim() || null,
    contextTranslation: example?.l1.trim() || null,
    source: "ask",
    sourceLabel: "Saved from Ask",
  };
}
/** The example that shows `expression`: one that contains it, else the one
 *  at the same position, else the first. */
export function exampleFor(expression: Expression, index: number, examples: Example[]): Example | null {
  const needle = expression.en.toLowerCase().replace(/[.!?]+$/, "");
  return (
    examples.find((e) => e.en.toLowerCase().includes(needle)) ?? examples[index] ?? examples[0] ?? null
  );
}
