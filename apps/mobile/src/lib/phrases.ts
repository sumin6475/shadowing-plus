// phrases.ts — canonical mobile Phrase Bank backed by `phrase_items`.
// A bookmark remains a saved transcript line; a PhraseItem is the reusable
// expression selected from that line, typed by the learner, captured from an
// image, or saved after a Speak session.
import type { Status } from "@/design/data";

import { prewarmPhraseSpeech } from "./phrase-speech";
import { supabase } from "./supabase";

function prewarmPhraseEmbedding(phraseId: string): void {
  void supabase.functions
    .invoke("phrase-embed", { body: { phrase_id: phraseId } })
    .catch(() => {});
}

/** One-time backfill for ready rows that still have a null embedding. */
export async function backfillMissingPhraseEmbeddings(): Promise<{
  embedded: number;
}> {
  const { data, error } = await supabase
    .from("phrase_items")
    .select("id")
    .eq("status", "ready")
    .is("embedding", null);
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((row) => row.id as string);
  let embedded = 0;
  for (let index = 0; index < ids.length; index += 40) {
    const batch = ids.slice(index, index + 40);
    const { data: result, error: embedError } =
      await supabase.functions.invoke<{ embedded?: number }>("phrase-embed", {
        body: { phrase_ids: batch },
      });
    if (embedError)
      throw new Error(embedError.message || "Couldn’t embed saved phrases.");
    embedded += result?.embedded ?? 0;
  }
  return { embedded };
}

export type SrsVerdict = "again" | "good" | "easy";
export type LearningStatus = "new" | "recognizing" | "practicing" | "ready";
export type PhraseKind =
  | "word"
  | "phrasal_verb"
  | "pattern"
  | "idiom"
  | "phrase";
export type PhraseEvent =
  | "suggested"
  | "accepted"
  | "retrieved"
  | "used"
  | "rejected";

export const PIN_TAG_PREFIX = "saylo-pin:";
export const REVIEWS_TAG_PREFIX = "saylo-reviews:";

export interface VerdictState {
  learning_status: LearningStatus;
  due_at: string;
  interval_days: number;
  ease_factor: number;
  last_reviewed_at: string;
  last_practiced_at: string;
  lapses: number;
  tags: string[];
}

export interface PhraseItem {
  id: string;
  text: string;
  translation: string | null;
  kind: PhraseKind;
  status: Status;
  source: string;
  context: string | null;
  contextTranslation: string | null;
  startSec: number;
  endSec: number;
  videoId: string | null;
  segmentId: string | null;
  /** AI / learner-edited "how it's used". Not the personal memo. */
  usageNote: string | null;
  /** Learner memo (`learner_note`). Separate from usage_note. */
  memo: string | null;
  createdAt: string;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  lapses: number;
  lastReviewedAt: string | null;
  lastPracticedAt: string | null;
  learningStatus: LearningStatus;
  reviewPinUntil: string | null;
  reviewsSinceStage: number;
  tags: string[];
  favorite: boolean;
}

export interface CreatePhraseInput {
  text: string;
  meaning?: string | null;
  usageNote?: string | null;
  learnerNote?: string | null;
  kind?: PhraseKind;
  context?: string | null;
  contextTranslation?: string | null;
  source: "manual" | "paste" | "image_ocr" | "clip" | "speak";
  sourceLabel?: string | null;
  imageUri?: string | null;
  ocrConfidence?: number | null;
  videoId?: string | null;
  segmentId?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  storyId?: string | null;
  said?: string | null;
}

export interface CaptureContextPhrase {
  id: string;
  text: string;
  kind: PhraseKind;
  meaning: string;
  usageNote: string;
}

type SourceContext = {
  source?: string;
  source_label?: string;
  context_text?: string;
  context_translation?: string;
  context_fingerprint?: string;
  image_uri?: string;
  ocr_confidence?: number;
  story_id?: string;
  said?: string;
};

type PhraseRow = {
  id: string;
  text: string;
  kind: PhraseKind | null;
  meaning_ko: string | null;
  usage_note: string | null;
  learner_note?: string | null;
  source_context: unknown;
  start_time: number | null;
  end_time: number | null;
  video_id: string | null;
  segment_id: string | null;
  created_at: string;
  learning_status: string | null;
  due_at: string | null;
  interval_days: number | null;
  ease_factor: number | null;
  lapses: number | null;
  last_reviewed_at: string | null;
  last_practiced_at: string | null;
  tags?: string[] | null;
  is_favorite?: boolean | null;
  video:
    | { id?: string; title?: string }
    | { id?: string; title?: string }[]
    | null;
};

const DAY_MS = 86_400_000;

function normalizePhrase(value: string): string {
  return value.toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

function cleanCaptureContext(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 1200);
}

function canonicalCaptureContext(value: string): string {
  return cleanCaptureContext(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable compact identity for matching the same extracted context. */
export function captureContextFingerprint(value: string): string {
  const canonical = canonicalCaptureContext(value);
  if (!canonical) return "";
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < canonical.length; index += 1) {
    const code = canonical.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `ctx1-${canonical.length.toString(36)}-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function sourceContext(value: unknown): SourceContext {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as SourceContext)
    : {};
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function asLearningStatus(value: string | null | undefined): LearningStatus {
  if (value === "practicing" || value === "ready" || value === "recognizing") return value;
  return value === "new" ? "recognizing" : "recognizing";
}

export function parsePinUntil(tags: string[] | null | undefined): string | null {
  const tag = (tags ?? []).find((item) => item.startsWith(PIN_TAG_PREFIX));
  return tag ? tag.slice(PIN_TAG_PREFIX.length) : null;
}

export function parseReviewsSinceStage(tags: string[] | null | undefined): number {
  const tag = (tags ?? []).find((item) => item.startsWith(REVIEWS_TAG_PREFIX));
  const count = Number(tag?.slice(REVIEWS_TAG_PREFIX.length));
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function withPrefixedTag(tags: string[], prefix: string, value: string): string[] {
  return [...tags.filter((item) => !item.startsWith(prefix)), `${prefix}${value}`];
}

function displayStatus(learningStatus: LearningStatus, dueAt: string | null): Status {
  if (dueAt && new Date(dueAt).getTime() <= Date.now() && learningStatus === "ready") return "Needs refresh";
  if (dueAt && new Date(dueAt).getTime() <= Date.now() && learningStatus === "practicing") return "Needs refresh";
  if (learningStatus === "recognizing") return "Recognizing";
  if (learningStatus === "practicing") return "Practicing";
  return "Ready to use";
}

function sourceLabel(
  context: SourceContext,
  videoTitle?: string | null,
): string {
  if (videoTitle) return videoTitle;
  if (context.source_label) return context.source_label;
  if (context.source === "image_ocr") return "Saved from photo";
  if (context.source === "speak") return "Saved while talking";
  if (context.source === "paste") return "Pasted text";
  return "Added by me";
}

function isMissingFavoriteColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  return Boolean(
    error &&
    (error.code === "42703" ||
      error.message?.includes("phrase_items.is_favorite") ||
      error.message?.includes("is_favorite")),
  );
}

function isMissingLearnerNoteColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  return Boolean(
    error &&
    (error.code === "42703" || error.message?.includes("learner_note")),
  );
}

function isMissingScheduleColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  return Boolean(
    error &&
    (error.code === "42703" ||
      error.message?.includes("last_practiced_at") ||
      error.message?.includes("phrase_items.tags") ||
      error.message?.includes(" tags")),
  );
}

const PHRASE_SELECT_CORE =
  "id, text, kind, meaning_ko, usage_note, source_context, start_time, end_time, video_id, segment_id, created_at, learning_status, due_at, interval_days, ease_factor, lapses, last_reviewed_at, last_practiced_at, tags";
const PHRASE_SELECT_CORE_NO_SCHEDULE =
  "id, text, kind, meaning_ko, usage_note, source_context, start_time, end_time, video_id, segment_id, created_at, learning_status, due_at, interval_days, ease_factor, lapses, last_reviewed_at";

/** All reusable phrases, newest first. Bookmarks are intentionally excluded. */
export async function fetchPhrases(): Promise<PhraseItem[]> {
  // 022 adds favorites, 024 adds learner_note. History should still load if
  // a shared database has not applied one of those migrations yet.
  const selects = [
    `${PHRASE_SELECT_CORE}, learner_note, is_favorite, video:videos(id, title)`,
    `${PHRASE_SELECT_CORE}, is_favorite, video:videos(id, title)`,
    `${PHRASE_SELECT_CORE}, learner_note, video:videos(id, title)`,
    `${PHRASE_SELECT_CORE}, video:videos(id, title)`,
    `${PHRASE_SELECT_CORE_NO_SCHEDULE}, learner_note, is_favorite, video:videos(id, title)`,
    `${PHRASE_SELECT_CORE_NO_SCHEDULE}, video:videos(id, title)`,
  ];
  let data: unknown[] | null = null;
  let error: { code?: string; message: string } | null = null;
  for (const select of selects) {
    const result = await supabase
      .from("phrase_items")
      .select(select)
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    if (!result.error) {
      data = result.data;
      error = null;
      break;
    }
    error = result.error;
    const missingColumn =
      isMissingFavoriteColumn(error) ||
      isMissingLearnerNoteColumn(error) ||
      isMissingScheduleColumn(error);
    if (!missingColumn) break;
  }

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PhraseRow[];
  const mapped = rows.map((row) => mapPhraseRow(row));
  void persistScheduleBackfill(rows);
  return mapped;
}

function mapPhraseRow(row: PhraseRow): PhraseItem {
  const context = sourceContext(row.source_context);
  const video = one(row.video);
  const learningStatus = asLearningStatus(row.learning_status);
  const tags = row.tags ?? [];
  const scheduled = firstDueSchedule(row, learningStatus);
  const dueAt = scheduled.due_at;
  return {
    id: row.id,
    text: row.text,
    translation: row.meaning_ko ?? null,
    kind: row.kind ?? "phrase",
    status: displayStatus(learningStatus, dueAt),
    source: sourceLabel(context, video?.title ?? null),
    context: context.context_text ?? null,
    contextTranslation: context.context_translation ?? null,
    startSec: row.start_time ?? 0,
    endSec: row.end_time ?? row.start_time ?? 0,
    videoId: row.video_id ?? null,
    segmentId: row.segment_id ?? null,
    usageNote: row.usage_note ?? null,
    memo: row.learner_note ?? null,
    createdAt: row.created_at,
    dueAt,
    intervalDays: scheduled.interval_days,
    easeFactor: row.ease_factor ?? 2.5,
    lapses: row.lapses ?? 0,
    lastReviewedAt: row.last_reviewed_at ?? null,
    lastPracticedAt: row.last_practiced_at ?? null,
    learningStatus,
    reviewPinUntil: parsePinUntil(tags),
    reviewsSinceStage: parseReviewsSinceStage(tags),
    tags,
    favorite: row.is_favorite ?? false,
  };
}

function firstDueSchedule(
  row: PhraseRow,
  learningStatus: LearningStatus,
): { due_at: string; interval_days: number } {
  const reviewed = Boolean(row.last_reviewed_at) || (row.interval_days ?? 0) > 0;
  if (reviewed) {
    return {
      due_at: row.due_at ?? row.created_at,
      interval_days: row.interval_days ?? 0,
    };
  }
  if (learningStatus === "practicing") {
    return {
      due_at: new Date(new Date(row.created_at).getTime() + 3 * DAY_MS).toISOString(),
      interval_days: 3,
    };
  }
  if (learningStatus === "ready") {
    return {
      due_at: new Date(new Date(row.created_at).getTime() + 7 * DAY_MS).toISOString(),
      interval_days: 7,
    };
  }
  return { due_at: row.due_at ?? row.created_at, interval_days: 0 };
}

/** Write the first due date + recognize stage so "Due now" is a real schedule. */
function persistScheduleBackfill(rows: PhraseRow[]): void {
  for (const row of rows) {
    const learningStatus = asLearningStatus(row.learning_status);
    const scheduled = firstDueSchedule(row, learningStatus);
    const stageChanged = (row.learning_status ?? "new") === "new";
    const dueChanged = scheduled.due_at !== (row.due_at ?? row.created_at);
    const intervalChanged = scheduled.interval_days !== (row.interval_days ?? 0);
    if (!stageChanged && !dueChanged && !intervalChanged) continue;
    const patch: Record<string, unknown> = {};
    if (stageChanged) patch.learning_status = learningStatus;
    if (dueChanged) patch.due_at = scheduled.due_at;
    if (intervalChanged) patch.interval_days = scheduled.interval_days;
    void supabase.from("phrase_items").update(patch).eq("id", row.id);
  }
}

type CaptureContextRow = {
  id: string;
  text: string;
  kind: PhraseKind | null;
  meaning_ko: string | null;
  usage_note: string | null;
  source_context: unknown;
  created_at: string;
};

/**
 * Rehydrate phrases captured from the same OCR/text context without retaining
 * the source image. New rows use a fingerprint query; raw/normalized fallbacks
 * keep contexts saved before fingerprints were introduced discoverable.
 */
export async function fetchPhrasesForCaptureContext(
  contextText: string,
): Promise<CaptureContextPhrase[]> {
  const storedText = cleanCaptureContext(contextText);
  const fingerprint = captureContextFingerprint(storedText);
  if (!storedText || !fingerprint) return [];

  const fields =
    "id, text, kind, meaning_ko, usage_note, source_context, created_at";
  const [fingerprinted, exactLegacy] = await Promise.all([
    supabase
      .from("phrase_items")
      .select(fields)
      .eq("status", "ready")
      .contains("source_context", { context_fingerprint: fingerprint }),
    supabase
      .from("phrase_items")
      .select(fields)
      .eq("status", "ready")
      .contains("source_context", { context_text: storedText }),
  ]);
  if (fingerprinted.error) throw new Error(fingerprinted.error.message);
  if (exactLegacy.error) throw new Error(exactLegacy.error.message);

  const byId = new Map<string, CaptureContextRow>();
  for (const row of [
    ...(fingerprinted.data ?? []),
    ...(exactLegacy.data ?? []),
  ] as CaptureContextRow[])
    byId.set(row.id, row);

  // A model may change punctuation or line breaks when the same old screenshot
  // is re-read. Only legacy rows need this bounded normalized-text fallback.
  if (byId.size === 0) {
    const legacy = await supabase
      .from("phrase_items")
      .select(fields)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .limit(500);
    if (legacy.error) throw new Error(legacy.error.message);
    for (const row of (legacy.data ?? []) as CaptureContextRow[]) {
      const context = sourceContext(row.source_context);
      if (captureContextFingerprint(context.context_text ?? "") === fingerprint)
        byId.set(row.id, row);
    }
  }

  return [...byId.values()]
    .filter(
      (row) =>
        captureContextFingerprint(
          sourceContext(row.source_context).context_text ?? "",
        ) === fingerprint,
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((row) => ({
      id: row.id,
      text: row.text,
      kind: row.kind ?? "phrase",
      meaning: row.meaning_ko?.trim() ?? "",
      usageNote: row.usage_note?.trim() ?? "",
    }));
}

export function phraseIsDue(phrase: PhraseItem): boolean {
  return new Date(phrase.dueAt).getTime() <= Date.now();
}

export const PHRASE_STAGE_FILTERS = [
  { id: "all", label: "All" },
  { id: "starred", label: "Starred" },
  { id: "recognize", label: "Recognize" },
  { id: "help", label: "Use with help" },
  { id: "own", label: "Use on my own" },
  { id: "due", label: "Need refresh" },
] as const;

export type PhraseStageFilterId = (typeof PHRASE_STAGE_FILTERS)[number]["id"];

/** History chips: stage language, starred (swipe-star), plus Need refresh as the due overlay. */
export function matchesStageFilter(phrase: PhraseItem, filter: PhraseStageFilterId): boolean {
  if (filter === "all") return true;
  if (filter === "starred") return phrase.favorite;
  if (filter === "recognize") return phrase.learningStatus === "recognizing" || phrase.learningStatus === "new";
  if (filter === "help") return phrase.learningStatus === "practicing";
  if (filter === "own") return phrase.learningStatus === "ready";
  return phraseIsDue(phrase);
}

export function statusStageLabel(status: string): string {
  switch (status) {
    case "New":
    case "Recognizing":
      return "Recognize";
    case "Practicing":
      return "Use with help";
    case "Ready to use":
      return "Use on my own";
    case "Needs refresh":
      return "Need refresh";
    default:
      return status;
  }
}

async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("You’re signed out.");
  return userId;
}

export async function createPhrase(
  input: CreatePhraseInput,
): Promise<{ result: "saved" | "already"; id: string }> {
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!text) throw new Error("Enter a phrase to save.");
  const normalized = normalizePhrase(text);
  const userId = await currentUserId();

  const storedContextText = cleanCaptureContext(input.context ?? "");
  const contextFingerprint = captureContextFingerprint(storedContextText);
  let duplicateQuery = supabase
    .from("phrase_items")
    .select("id, source_context")
    .eq("user_id", userId)
    .eq("normalized_text", normalized);
  duplicateQuery = input.segmentId
    ? duplicateQuery.eq("segment_id", input.segmentId)
    : duplicateQuery.is("segment_id", null);
  const { data: existing, error: selectError } = await duplicateQuery.limit(1);
  if (selectError) throw new Error(selectError.message);
  if (existing?.[0]?.id) {
    const existingId = existing[0].id as string;
    const existingContext = sourceContext(existing[0].source_context);
    if (
      contextFingerprint &&
      !existingContext.context_fingerprint &&
      captureContextFingerprint(existingContext.context_text ?? "") ===
        contextFingerprint
    ) {
      const { error: fingerprintError } = await supabase
        .from("phrase_items")
        .update({
          source_context: {
            ...existingContext,
            context_fingerprint: contextFingerprint,
          },
        })
        .eq("id", existingId);
      if (fingerprintError) throw new Error(fingerprintError.message);
    }
    if (input.storyId)
      await linkPhraseToStory(existingId, input.storyId, "capture");
    return { result: "already", id: existingId };
  }

  const context: SourceContext = {
    source: input.source,
    source_label: input.sourceLabel?.trim() || undefined,
    context_text: storedContextText || undefined,
    context_translation:
      input.contextTranslation?.replace(/\s+/g, " ").trim().slice(0, 1200) ||
      undefined,
    context_fingerprint: contextFingerprint || undefined,
    image_uri: input.imageUri || undefined,
    ocr_confidence: input.ocrConfidence ?? undefined,
    story_id: input.storyId || undefined,
    said: input.said?.replace(/\s+/g, " ").trim().slice(0, 500) || undefined,
  };

  const row = {
    user_id: userId,
    text,
    normalized_text: normalized,
    kind: input.kind ?? "phrase",
    meaning_ko: input.meaning?.trim().slice(0, 500) || null,
    usage_note: input.usageNote?.trim().slice(0, 500) || null,
    learner_note: input.learnerNote?.trim().slice(0, 500) || null,
    source_context: context,
    video_id: input.videoId ?? null,
    segment_id: input.segmentId ?? null,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    status: "ready",
    learning_status: "recognizing",
    due_at: new Date().toISOString(),
    interval_days: 0,
  };
  let insert = await supabase
    .from("phrase_items")
    .insert(row)
    .select("id")
    .single();
  if (isMissingLearnerNoteColumn(insert.error)) {
    const { learner_note: _note, ...withoutNote } = row;
    insert = await supabase
      .from("phrase_items")
      .insert(withoutNote)
      .select("id")
      .single();
  }
  const { data, error } = insert;
  if (error || !data?.id)
    throw new Error(error?.message ?? "Couldn’t save this phrase.");

  const id = data.id as string;
  if (input.storyId) await linkPhraseToStory(id, input.storyId, "capture");
  // Saving stays instant. The cloud pronunciation is generated in the
  // background and first-tap generation remains the fallback if this fails.
  void prewarmPhraseSpeech(id).catch(() => {});
  void prewarmPhraseEmbedding(id);
  return { result: "saved", id };
}

export async function createSpeakPhrase(input: {
  text: string;
  example?: string | null;
  storyId?: string | null;
  said?: string | null;
}): Promise<"saved" | "already"> {
  const saved = await createPhrase({
    text: input.text,
    usageNote: input.example,
    context: input.example,
    source: "speak",
    storyId: input.storyId,
    said: input.said,
  });
  return saved.result;
}

export async function deletePhrase(id: string): Promise<void> {
  const { error } = await supabase.from("phrase_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setPhraseFavorite(
  id: string,
  favorite: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("phrase_items")
    .update({ is_favorite: favorite })
    .eq("id", id);
  if (isMissingFavoriteColumn(error))
    throw new Error("Favorites are temporarily unavailable.");
  if (error) throw new Error(error.message);
}

export async function updatePhraseNote(
  id: string,
  note: string,
): Promise<void> {
  const { error } = await supabase
    .from("phrase_items")
    .update({ learner_note: note.trim() || null })
    .eq("id", id);
  if (isMissingLearnerNoteColumn(error))
    throw new Error(
      "Your note isn’t available until the latest database update is applied.",
    );
  if (error) throw new Error(error.message);
}

export async function updatePhraseDetails(
  id: string,
  input: {
    text: string;
    meaning?: string | null;
    usageNote?: string | null;
    kind: PhraseKind;
  },
): Promise<void> {
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!text) throw new Error("Enter a phrase to save.");
  const { error } = await supabase
    .from("phrase_items")
    .update({
      text,
      normalized_text: normalizePhrase(text),
      kind: input.kind,
      meaning_ko: input.meaning?.trim().slice(0, 500) || null,
      usage_note: input.usageNote?.trim().slice(0, 500) || null,
    })
    .eq("id", id);
  if (error?.code === "23505")
    throw new Error("That phrase is already in your Phrase Bank.");
  if (error) throw new Error(error.message);
  void prewarmPhraseSpeech(id).catch(() => {});
  void prewarmPhraseEmbedding(id);
}

/** Stories a phrase is linked to — the Practice hub's "Related stories". */
export interface PhraseStoryRef {
  id: string;
  title: string;
  versionCount: number;
}

export async function fetchPhraseStories(phraseItemId: string): Promise<PhraseStoryRef[]> {
  const { data, error } = await supabase
    .from("phrase_story_links")
    .select("stories(id, title, status, messages(count))")
    .eq("phrase_item_id", phraseItemId);
  if (error) throw new Error(error.message);
  type StoryRow = { id: string; title: string | null; status: string | null; messages: { count: number }[] | { count: number } | null };
  return (data ?? [])
    .map((row) => one(row.stories as StoryRow[] | StoryRow | null) as StoryRow | null)
    .filter((story): story is StoryRow => Boolean(story) && story?.status !== "archived")
    .map((story) => ({
      id: story.id,
      title: story.title || "Untitled story",
      versionCount: (one(story.messages as { count: number }[] | { count: number } | null) as { count: number } | null)?.count ?? 0,
    }));
}

/** Phrases captured into a story — the “useful language” strip on the folio. */
export async function fetchStoryPhrases(
  storyId: string,
): Promise<Pick<PhraseItem, "id" | "text" | "translation">[]> {
  const { data, error } = await supabase
    .from("phrase_story_links")
    .select("phrase_items(id, text, meaning_ko, status)")
    .eq("story_id", storyId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => one(row.phrase_items as { id: string; text: string; meaning_ko: string | null; status: string }[] | { id: string; text: string; meaning_ko: string | null; status: string } | null))
    .filter((item): item is { id: string; text: string; meaning_ko: string | null; status: string } => Boolean(item) && item?.status === "ready")
    .map((item) => ({ id: item.id, text: item.text, translation: item.meaning_ko }));
}

export async function linkPhraseToStory(
  phraseItemId: string,
  storyId: string,
  source: "learner" | "capture" | "suggested" | "used" = "learner",
): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("phrase_story_links").upsert(
    {
      phrase_item_id: phraseItemId,
      story_id: storyId,
      user_id: userId,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phrase_item_id,story_id" },
  );
  if (error) throw new Error(error.message);
}

export async function recordPhraseEvent(input: {
  phraseItemId: string;
  event: PhraseEvent;
  storyId?: string | null;
  talkSessionId?: string | null;
  evidence?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("phrase_events").insert({
    phrase_item_id: input.phraseItemId,
    story_id: input.storyId ?? null,
    talk_session_id: input.talkSessionId ?? null,
    event: input.event,
    evidence: input.evidence ?? {},
  });
  if (error) throw new Error(error.message);
}

const REVIEW_LADDER_DAYS = [1, 3, 7, 30] as const;

export function nextReviewInterval(current: number, verdict: SrsVerdict): number {
  if (verdict === "again") return 1;
  const idx = REVIEW_LADDER_DAYS.findIndex((step) => current < step);
  const nextIdx = idx === -1 ? REVIEW_LADDER_DAYS.length - 1 : idx;
  if (verdict === "easy") return REVIEW_LADDER_DAYS[Math.min(nextIdx + 1, REVIEW_LADDER_DAYS.length - 1)];
  return REVIEW_LADDER_DAYS[nextIdx];
}

function tomorrowLocalDate(): string {
  const from = new Date();
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

/** Persist a review on the 1/3/7/30 ladder. Does not re-grade the learner's stage. */
export async function submitVerdict(
  phraseId: string,
  verdict: SrsVerdict,
  phrase?: PhraseItem,
): Promise<VerdictState> {
  const oldEase = phrase?.easeFactor ?? 2.5;
  const interval = nextReviewInterval(phrase?.intervalDays ?? 0, verdict);
  const ease = Math.max(
    1.3,
    oldEase + (verdict === "again" ? -0.1 : verdict === "easy" ? 0.15 : 0),
  );
  const now = new Date();
  const tags = withPrefixedTag(
    phrase?.tags ?? [],
    REVIEWS_TAG_PREFIX,
    String((phrase?.reviewsSinceStage ?? 0) + 1),
  );
  const next: VerdictState = {
    learning_status: phrase?.learningStatus ?? "recognizing",
    ease_factor: ease,
    interval_days: interval,
    lapses: (phrase?.lapses ?? 0) + (verdict === "again" ? 1 : 0),
    due_at: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    last_reviewed_at: now.toISOString(),
    last_practiced_at: now.toISOString(),
    tags,
  };
  const { error } = await supabase
    .from("phrase_items")
    .update(next)
    .eq("id", phraseId);
  if (error && isMissingScheduleColumn(error)) {
    const { tags: _tags, ...withoutTags } = next;
    const retry = await supabase.from("phrase_items").update(withoutTags).eq("id", phraseId);
    if (retry.error) throw new Error(retry.error.message);
    return next;
  }
  if (error) throw new Error(error.message);
  return next;
}

export async function setPhraseStage(
  phraseId: string,
  stage: LearningStatus,
  phrase?: PhraseItem,
): Promise<void> {
  const tags = withPrefixedTag(phrase?.tags ?? [], REVIEWS_TAG_PREFIX, "0");
  const { error } = await supabase
    .from("phrase_items")
    .update({ learning_status: stage, tags })
    .eq("id", phraseId);
  if (error && isMissingScheduleColumn(error)) {
    const retry = await supabase.from("phrase_items").update({ learning_status: stage }).eq("id", phraseId);
    if (retry.error) throw new Error(retry.error.message);
    return;
  }
  if (error) throw new Error(error.message);
}

export async function pinPhraseForTomorrow(
  phraseId: string,
  phrase?: PhraseItem,
): Promise<string> {
  const pinUntil = tomorrowLocalDate();
  const tags = withPrefixedTag(phrase?.tags ?? [], PIN_TAG_PREFIX, pinUntil);
  const { error } = await supabase
    .from("phrase_items")
    .update({ tags })
    .eq("id", phraseId);
  if (error) throw new Error(error.message);
  return pinUntil;
}

/** Latest self-talk `used` timestamp per phrase, for today's ranking. */
export async function fetchLastSelfTalkUsedAt(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("phrase_events")
    .select("phrase_item_id, created_at")
    .eq("event", "used")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) return {};
  const latest: Record<string, string> = {};
  for (const row of data ?? []) {
    const id = row.phrase_item_id as string;
    if (id && !latest[id]) latest[id] = row.created_at as string;
  }
  return latest;
}

export interface SessionPhraseLink {
  id: string | null;
  text: string;
  kind: "used" | "recommended";
}

type LinkedPhrase = { id?: string; text?: string } | { id?: string; text?: string }[] | null;

/** Phrases used or recommended on one self-talk session. */
export async function fetchSessionPhraseMemory(talkSessionId: string): Promise<{
  used: SessionPhraseLink[];
  recommended: SessionPhraseLink[];
}> {
  const [events, suggestions] = await Promise.all([
    supabase
      .from("phrase_events")
      .select("event, phrase_item_id, phrase_items(id, text)")
      .eq("talk_session_id", talkSessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("talk_suggestion_feedback")
      .select("suggestion, phrase_item_id, phrase_items(id, text)")
      .eq("talk_session_id", talkSessionId)
      .order("moment_index", { ascending: true }),
  ]);

  const used: SessionPhraseLink[] = [];
  const recommended: SessionPhraseLink[] = [];
  const seenUsed = new Set<string>();
  const seenRecommended = new Set<string>();

  for (const row of events.data ?? []) {
    const linked = one(row.phrase_items as LinkedPhrase);
    const id = (linked?.id as string | undefined) ?? (row.phrase_item_id as string | null) ?? null;
    const text = (linked?.text as string | undefined)?.trim();
    if (!text) continue;
    const key = id ?? text;
    if (row.event === "used") {
      if (seenUsed.has(key)) continue;
      seenUsed.add(key);
      used.push({ id, text, kind: "used" });
    } else if (row.event === "suggested" || row.event === "accepted" || row.event === "retrieved") {
      if (seenRecommended.has(key)) continue;
      seenRecommended.add(key);
      recommended.push({ id, text, kind: "recommended" });
    }
  }

  for (const row of suggestions.data ?? []) {
    const linked = one(row.phrase_items as LinkedPhrase);
    const text = ((linked?.text as string | undefined) ?? (row.suggestion as string | undefined) ?? "").trim();
    if (!text) continue;
    const id = (linked?.id as string | undefined) ?? (row.phrase_item_id as string | null) ?? null;
    const key = id ?? text;
    if (seenRecommended.has(key)) continue;
    seenRecommended.add(key);
    recommended.push({ id, text, kind: "recommended" });
  }

  return { used, recommended };
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function dueHint(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);
  if (days <= 0) return "due now";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function weeklyCounts(
  createdAts: string[],
): { label: string; count: number }[] {
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (6 - index),
    );
    return { key: date.toDateString(), label: labels[date.getDay()], count: 0 };
  });
  for (const iso of createdAts) {
    const bucket = buckets.find(
      (item) => item.key === new Date(iso).toDateString(),
    );
    if (bucket) bucket.count += 1;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

export function cumulativeSeries(
  createdAts: string[],
  n = 15,
): { points: number[]; max: number } {
  const total = createdAts.length;
  if (!total) return { points: [0, 0], max: 1 };
  const times = createdAts
    .map((value) => new Date(value).getTime())
    .sort((a, b) => a - b);
  const first = times[0];
  const end = Date.now();
  if (end <= first) return { points: [total, total], max: total };
  return {
    points: Array.from({ length: n }, (_, index) => {
      const cutoff = first + ((index + 1) / n) * (end - first);
      return times.filter((time) => time <= cutoff).length;
    }),
    max: total,
  };
}
