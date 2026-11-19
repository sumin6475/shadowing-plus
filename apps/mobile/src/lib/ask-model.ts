// ask-model.ts — the Ask assistant's data, as pure functions.
//
// The reply types mirror supabase/functions/ask-assist/core.ts (copied by
// hand — this app imports nothing from outside apps/mobile). Everything here
// runs under `node --test`: what a session sends back as history, how a draft
// becomes note points, and what "Save to Phrase" writes.
import type { OutlineSection } from "./mvp-model";
import type { PhraseCaptureDraft } from "./phrase-capture";

export type AskMode = "how_to_say" | "note";
/** Turns kept as history, user and assistant together (server: MAX_TURNS). */
export const ASK_HISTORY_TURNS = 40;
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
  /** How to say only: the one chunk inside `en` worth saving as a Phrase,
   *  picked for this learner. "" = nothing worth saving; absent = a reply from
   *  before the pick existed (the app then extracts one itself). */
  phrase?: string;
  phrase_meaning?: string;
  phrase_kind?: string;
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
  title?: string;
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
export interface NoteClarify {
  type: "clarify";
  text: string;
  question: string;
}
export interface OffTopic {
  type: "off_topic";
}
export type AskReply = HowToSayCard | NoteCard | AskAnswer | NoteClarify | OffTopic;

export const isNoteCard = (reply: AskReply): reply is NoteCard =>
  reply.type === "card" && "draft" in reply;
export const isHowToSayCard = (reply: AskReply): reply is HowToSayCard =>
  reply.type === "card" && "expressions" in reply;

/** One point of a speaking note that a question is about. */
export interface AskPoint {
  /** Opening / Body / Closing / Others; "Note" for points above any heading. */
  section: string;
  /** 1-based position within the section. */
  index: number;
  /** The point as it read when the question was asked. */
  text: string;
}

/** One line of the conversation as the sheet holds it. */
export type AskTurn =
  | { id: string; role: "user"; text: string; mode: AskMode; draftNow?: boolean; point?: AskPoint }
  | { id: string; role: "assistant"; reply: AskReply; mode: AskMode };

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

// A question about a point carries the point as a first line, both to the
// model and in stored history: "[[point Opening 2]] I built…\n<question>".
// Mirror of readPointTag in supabase/functions/ask-assist/core.ts.
/** Longest point text a tag carries (server: POINT_TAG_TEXT). */
export const POINT_TAG_TEXT = 240;
const POINT_SECTIONS = ["Opening", "Body", "Closing", "Others", "Note"];
const POINT_TAG = /^\[\[point (Opening|Body|Closing|Others|Note) (\d{1,3})\]\] ?([^\n]*)\n/;

export const pointSection = (heading: string | null | undefined) =>
  heading && POINT_SECTIONS.includes(heading) ? heading : "Note";

export function withPointTag(text: string, point: AskPoint): string {
  const line = point.text.replace(/\s+/g, " ").trim().slice(0, POINT_TAG_TEXT);
  return `[[point ${pointSection(point.section)} ${Math.max(1, Math.min(999, Math.round(point.index)))}]] ${line}\n${text}`;
}
/** A stored or sent user message, split back into its point and question. */
export function readPointTag(content: string): { text: string; point?: AskPoint } {
  const match = POINT_TAG.exec(content);
  if (!match) return { text: content };
  return { text: content.slice(match[0].length), point: { section: match[1], index: Number(match[2]), text: match[3].trim() } };
}
/** What the learner sent, as the model and history store it. */
export const userContent = (turn: Extract<AskTurn, { role: "user" }>) =>
  turn.point ? withPointTag(turn.text, turn.point) : turn.text;
/** "Opening · 2" — how a point is named in the sheet. */
export const pointLabel = (point: Pick<AskPoint, "section" | "index">) =>
  point.section === "Note" ? `Point ${point.index}` : `${point.section} · ${point.index}`;

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
      ? { role: "user", content: userContent(turn) }
      : { role: "assistant", content: assistantContent(turn.reply) },
  );
}

/** The point the latest question is about, if it is about one. */
export function askedPoint(turns: AskTurn[]): AskPoint | null {
  const last = turns[turns.length - 1];
  return last?.role === "user" && last.point ? last.point : null;
}

/** Request shape shared with the Edge Function's parseAskBody contract. A
 *  Note-mode question, or a question about one of the note's points, reads the
 *  note on the server. */
export const buildAskRequest = (mode: AskMode, turns: AskTurn[], firstLanguage: string, draftNow = false, noteId?: string | null, practiceSessionId?: string | null) => ({
  mode,
  messages: trimHistory(turns),
  first_language: firstLanguage,
  draft_now: draftNow,
  ...((mode === "note" || askedPoint(turns)) && noteId ? { note_id: noteId } : {}),
  ...(mode === "note" && practiceSessionId ? { practice_session_id: practiceSessionId } : {}),
});

/** The reply to the question at `index`'s left: is it about a point? */
export function pointForReply(turns: AskTurn[], index: number): AskPoint | null {
  const question = turns[index - 1];
  return question?.role === "user" && question.point ? question.point : null;
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

/** The Note request that began the current draft, before intake answers. */
export function noteTopicFor(turns: AskTurn[], index: number): string {
  let afterCard = 0;
  for (let i = 0; i < index; i++) {
    const turn = turns[i];
    if (turn.role === "assistant" && turn.mode === "note" && isNoteCard(turn.reply)) afterCard = i + 1;
  }
  for (let i = afterCard; i <= index; i++) {
    const turn = turns[i];
    if (turn.role === "user" && turn.mode === "note") return turn.text;
  }
  return questionFor(turns, index);
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

/** A second-pass Ask result for the editable Phrase Bank capture screen. */
export interface AskCaptureSeed {
  contextText: string;
  contextTranslation: string;
  suggestedPhrase: string;
  kind: PhraseCaptureDraft["kind"];
  meaning: string;
  usageNote: string;
  learnerNote: string;
  sourceLabel: string;
  confidence: number;
}

/** Keep the sentence Ask showed as context; leave Phrase blank when extraction is uncertain. */
export function toAskCaptureSeed(
  expression: Expression,
  question: string,
  usageNote: string,
  draft?: PhraseCaptureDraft,
): AskCaptureSeed {
  const contextText = expression.en.trim();
  const candidate = draft?.suggestedPhrase.trim() ?? "";
  const withoutStop = (value: string) => value.replace(/[.!?]+$/, "").trim().toLocaleLowerCase("en");
  const wholeSentence =
    /[.!?]$/.test(contextText) &&
    contextText.split(/\s+/).length >= 3 &&
    draft?.kind !== "idiom" &&
    withoutStop(candidate) === withoutStop(contextText);
  const suggestedPhrase = candidate && contextText.toLocaleLowerCase("en").includes(candidate.toLocaleLowerCase("en")) && !wholeSentence
    ? candidate
    : "";
  return {
    contextText,
    contextTranslation: draft?.contextTranslation.trim() || expression.meaning.trim(),
    suggestedPhrase,
    kind: draft?.kind ?? "phrase",
    meaning: draft?.meaning.trim() || expression.meaning.trim(),
    usageNote: draft?.usageNote.trim() || usageNote.trim() || expression.when.trim(),
    learnerNote: question.trim(),
    sourceLabel: "Saved from Ask",
    confidence: suggestedPhrase ? (draft?.confidence ?? 0) : 0,
  };
}

const PHRASE_KINDS: readonly PhraseCaptureDraft["kind"][] = ["word", "phrasal_verb", "pattern", "idiom", "phrase"];

/** The phrase Ask already picked for this sentence, as the capture editor's
 *  draft — no second AI call. An empty pick opens the editor with the sentence
 *  only, for the learner to choose the words themselves. */
export function pickedPhraseDraft(expression: Expression): PhraseCaptureDraft {
  const phrase = expression.phrase?.trim() ?? "";
  const kind = PHRASE_KINDS.find((value) => value === expression.phrase_kind) ?? "phrase";
  return {
    contextText: expression.en,
    contextTranslation: expression.meaning,
    suggestedPhrase: phrase,
    kind,
    meaning: phrase ? expression.phrase_meaning?.trim() ?? "" : "",
    // The sentence's own situation label. The card's nuance compares every
    // option on the card, so it never describes one phrase.
    usageNote: expression.when.trim(),
    confidence: phrase ? 0.9 : 0,
  };
}

/** Extraction is optional for review; Ask's answer is enough to open the editor.
 *  A sentence that carries Ask's own phrase pick never calls `extract`. */
export async function prepareAskCaptureSeed(
  expression: Expression,
  question: string,
  usageNote: string,
  extract: (sentence: string) => Promise<PhraseCaptureDraft>,
): Promise<AskCaptureSeed> {
  if (expression.phrase !== undefined) return toAskCaptureSeed(expression, question, usageNote, pickedPhraseDraft(expression));
  let draft: PhraseCaptureDraft;
  try {
    draft = await extract(expression.en);
  } catch {
    return toAskCaptureSeed(expression, question, usageNote);
  }
  return toAskCaptureSeed(expression, question, usageNote, draft);
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
/** What "Save to My Sentences" stores: the whole sentence, and its meaning in
 *  the learner's language — the learner's own question when Ask gave none
 *  (the table requires a meaning). */
export function toPersonalSentence(expression: Expression, question: string): { text: string; meaning: string } {
  return {
    text: expression.en.trim(),
    meaning: expression.meaning.trim() || question.replace(/\s+/g, " ").trim() || expression.en.trim(),
  };
}

/** The phrase pick inside a sentence, for highlighting: [before, phrase, after],
 *  or null when there is no pick or it is not found. */
export function splitAtPhrase(sentence: string, phrase: string | undefined): [string, string, string] | null {
  const needle = phrase?.trim();
  if (!needle) return null;
  const at = sentence.toLocaleLowerCase("en").indexOf(needle.toLocaleLowerCase("en"));
  if (at < 0) return null;
  return [sentence.slice(0, at), sentence.slice(at, at + needle.length), sentence.slice(at + needle.length)];
}

/** The example that shows `expression`: one that contains it, else the one
 *  at the same position, else the first. */
export function exampleFor(expression: Expression, index: number, examples: Example[]): Example | null {
  const needle = expression.en.toLowerCase().replace(/[.!?]+$/, "");
  return (
    examples.find((e) => e.en.toLowerCase().includes(needle)) ?? examples[index] ?? examples[0] ?? null
  );
}
