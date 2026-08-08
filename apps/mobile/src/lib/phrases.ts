// phrases.ts — canonical mobile Phrase Bank backed by `phrase_items`.
// A bookmark remains a saved transcript line; a PhraseItem is the reusable
// expression selected from that line, typed by the learner, captured from an
// image, or saved after a Speak session.
import type { Status } from "@/design/data";

import { prewarmPhraseSpeech } from "./phrase-speech";
import { supabase } from "./supabase";

export type SrsVerdict = "again" | "good" | "easy";
export type PhraseKind = "word" | "phrasal_verb" | "pattern" | "idiom" | "phrase";
export type PhraseEvent = "suggested" | "accepted" | "retrieved" | "used" | "rejected";

export interface VerdictState {
  learning_status: "new" | "recognizing" | "practicing" | "ready";
  due_at: string;
  interval_days: number;
  ease_factor: number;
  last_reviewed_at: string;
  last_practiced_at: string;
  lapses: number;
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
  memo: string | null;
  createdAt: string;
  dueAt: string;
  intervalDays: number;
  easeFactor: number;
  lapses: number;
  lastReviewedAt: string | null;
  favorite: boolean;
}

export interface CreatePhraseInput {
  text: string;
  meaning?: string | null;
  usageNote?: string | null;
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
  is_favorite?: boolean | null;
  video: { id?: string; title?: string } | { id?: string; title?: string }[] | null;
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
  return value && typeof value === "object" && !Array.isArray(value) ? (value as SourceContext) : {};
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function displayStatus(learningStatus: string, dueAt: string | null): Status {
  if (learningStatus === "new") return "New";
  if (dueAt && new Date(dueAt).getTime() <= Date.now()) return "Needs refresh";
  if (learningStatus === "recognizing") return "Recognizing";
  if (learningStatus === "practicing") return "Practicing";
  return "Ready to use";
}

function sourceLabel(context: SourceContext, videoTitle?: string | null): string {
  if (videoTitle) return videoTitle;
  if (context.source_label) return context.source_label;
  if (context.source === "image_ocr") return "Saved from photo";
  if (context.source === "speak") return "Saved while talking";
  if (context.source === "paste") return "Pasted text";
  return "Added by me";
}

function isMissingFavoriteColumn(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === "42703" || error.message?.includes("phrase_items.is_favorite")));
}

/** All reusable phrases, newest first. Bookmarks are intentionally excluded. */
export async function fetchPhrases(): Promise<PhraseItem[]> {
  const initial = await supabase
    .from("phrase_items")
    .select(
      "id, text, kind, meaning_ko, usage_note, source_context, start_time, end_time, video_id, segment_id, created_at, learning_status, due_at, interval_days, ease_factor, lapses, last_reviewed_at, is_favorite, video:videos(id, title)",
    )
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  // Migration 022 adds favorites, but phrase history should remain readable
  // while an older shared database is still being upgraded.
  let data: unknown[] | null = initial.data;
  let error: { code?: string; message: string } | null = initial.error;
  if (isMissingFavoriteColumn(error)) {
    const fallback = await supabase
      .from("phrase_items")
      .select(
        "id, text, kind, meaning_ko, usage_note, source_context, start_time, end_time, video_id, segment_id, created_at, learning_status, due_at, interval_days, ease_factor, lapses, last_reviewed_at, video:videos(id, title)",
      )
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PhraseRow[];

  return rows.map((row) => {
    const context = sourceContext(row.source_context);
    const video = one(row.video);
    const dueAt = row.due_at ?? row.created_at;
    return {
      id: row.id,
      text: row.text,
      translation: row.meaning_ko ?? null,
      kind: row.kind ?? "phrase",
      status: displayStatus(row.learning_status ?? "new", dueAt),
      source: sourceLabel(context, video?.title ?? null),
      context: context.context_text ?? null,
      contextTranslation: context.context_translation ?? null,
      startSec: row.start_time ?? 0,
      endSec: row.end_time ?? row.start_time ?? 0,
      videoId: row.video_id ?? null,
      segmentId: row.segment_id ?? null,
      memo: row.usage_note ?? null,
      createdAt: row.created_at,
      dueAt,
      intervalDays: row.interval_days ?? 0,
      easeFactor: row.ease_factor ?? 2.5,
      lapses: row.lapses ?? 0,
      lastReviewedAt: row.last_reviewed_at ?? null,
      favorite: row.is_favorite ?? false,
    } satisfies PhraseItem;
  });
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
export async function fetchPhrasesForCaptureContext(contextText: string): Promise<CaptureContextPhrase[]> {
  const storedText = cleanCaptureContext(contextText);
  const fingerprint = captureContextFingerprint(storedText);
  if (!storedText || !fingerprint) return [];

  const fields = "id, text, kind, meaning_ko, usage_note, source_context, created_at";
  const [fingerprinted, exactLegacy] = await Promise.all([
    supabase.from("phrase_items").select(fields).eq("status", "ready").contains("source_context", { context_fingerprint: fingerprint }),
    supabase.from("phrase_items").select(fields).eq("status", "ready").contains("source_context", { context_text: storedText }),
  ]);
  if (fingerprinted.error) throw new Error(fingerprinted.error.message);
  if (exactLegacy.error) throw new Error(exactLegacy.error.message);

  const byId = new Map<string, CaptureContextRow>();
  for (const row of [...(fingerprinted.data ?? []), ...(exactLegacy.data ?? [])] as CaptureContextRow[]) byId.set(row.id, row);

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
      if (captureContextFingerprint(context.context_text ?? "") === fingerprint) byId.set(row.id, row);
    }
  }

  return [...byId.values()]
    .filter((row) => captureContextFingerprint(sourceContext(row.source_context).context_text ?? "") === fingerprint)
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
  return phrase.status !== "New" && new Date(phrase.dueAt).getTime() <= Date.now();
}

async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("You’re signed out.");
  return userId;
}

export async function createPhrase(input: CreatePhraseInput): Promise<{ result: "saved" | "already"; id: string }> {
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
  duplicateQuery = input.segmentId ? duplicateQuery.eq("segment_id", input.segmentId) : duplicateQuery.is("segment_id", null);
  const { data: existing, error: selectError } = await duplicateQuery.limit(1);
  if (selectError) throw new Error(selectError.message);
  if (existing?.[0]?.id) {
    const existingId = existing[0].id as string;
    const existingContext = sourceContext(existing[0].source_context);
    if (
      contextFingerprint &&
      !existingContext.context_fingerprint &&
      captureContextFingerprint(existingContext.context_text ?? "") === contextFingerprint
    ) {
      const { error: fingerprintError } = await supabase
        .from("phrase_items")
        .update({ source_context: { ...existingContext, context_fingerprint: contextFingerprint } })
        .eq("id", existingId);
      if (fingerprintError) throw new Error(fingerprintError.message);
    }
    if (input.storyId) await linkPhraseToStory(existingId, input.storyId, "capture");
    return { result: "already", id: existingId };
  }

  const context: SourceContext = {
    source: input.source,
    source_label: input.sourceLabel?.trim() || undefined,
    context_text: storedContextText || undefined,
    context_translation: input.contextTranslation?.replace(/\s+/g, " ").trim().slice(0, 1200) || undefined,
    context_fingerprint: contextFingerprint || undefined,
    image_uri: input.imageUri || undefined,
    ocr_confidence: input.ocrConfidence ?? undefined,
    story_id: input.storyId || undefined,
    said: input.said?.replace(/\s+/g, " ").trim().slice(0, 500) || undefined,
  };

  const { data, error } = await supabase
    .from("phrase_items")
    .insert({
      user_id: userId,
      text,
      normalized_text: normalized,
      kind: input.kind ?? "phrase",
      meaning_ko: input.meaning?.trim().slice(0, 500) || null,
      usage_note: input.usageNote?.trim().slice(0, 500) || null,
      source_context: context,
      video_id: input.videoId ?? null,
      segment_id: input.segmentId ?? null,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      status: "ready",
      learning_status: "new",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const id = data.id as string;
  if (input.storyId) await linkPhraseToStory(id, input.storyId, "capture");
  // Saving stays instant. The cloud pronunciation is generated in the
  // background and first-tap generation remains the fallback if this fails.
  void prewarmPhraseSpeech(id).catch(() => {});
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

export async function setPhraseFavorite(id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from("phrase_items").update({ is_favorite: favorite }).eq("id", id);
  if (isMissingFavoriteColumn(error)) throw new Error("Favorites are temporarily unavailable.");
  if (error) throw new Error(error.message);
}

export async function updatePhraseNote(id: string, note: string): Promise<void> {
  const { error } = await supabase.from("phrase_items").update({ usage_note: note.trim() || null }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updatePhraseDetails(
  id: string,
  input: { text: string; meaning?: string | null; usageNote?: string | null; kind: PhraseKind },
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
  if (error?.code === "23505") throw new Error("That phrase is already in your Phrase Bank.");
  if (error) throw new Error(error.message);
  void prewarmPhraseSpeech(id).catch(() => {});
}

export async function linkPhraseToStory(
  phraseItemId: string,
  storyId: string,
  source: "learner" | "capture" | "suggested" | "used" = "learner",
): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("phrase_story_links").upsert(
    { phrase_item_id: phraseItemId, story_id: storyId, user_id: userId, source, updated_at: new Date().toISOString() },
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

/** Persist the Phrase Bank quick check using the phrase_items SRS columns. */
export async function submitVerdict(phraseId: string, verdict: SrsVerdict, phrase?: PhraseItem): Promise<VerdictState> {
  const check = verdict === "again" ? "recognizing" : verdict === "good" ? "practicing" : "ready";
  const firstDays = verdict === "again" ? 2 : verdict === "good" ? 4 : 10;
  const oldEase = phrase?.easeFactor ?? 2.5;
  const oldInterval = phrase?.intervalDays ?? 0;
  const interval = verdict === "easy" && oldInterval > 0 ? oldInterval * oldEase * 1.3 : firstDays;
  const ease = Math.max(1.3, oldEase + (verdict === "again" ? -0.1 : verdict === "easy" ? 0.15 : 0));
  const now = new Date();
  const next: VerdictState = {
    learning_status: check,
    ease_factor: ease,
    interval_days: interval,
    lapses: (phrase?.lapses ?? 0) + (verdict === "again" ? 1 : 0),
    due_at: new Date(now.getTime() + interval * DAY_MS).toISOString(),
    last_reviewed_at: now.toISOString(),
    last_practiced_at: now.toISOString(),
  };
  const { error } = await supabase.from("phrase_items").update(next).eq("id", phraseId);
  if (error) throw new Error(error.message);
  return next;
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

export function weeklyCounts(createdAts: string[]): { label: string; count: number }[] {
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    return { key: date.toDateString(), label: labels[date.getDay()], count: 0 };
  });
  for (const iso of createdAts) {
    const bucket = buckets.find((item) => item.key === new Date(iso).toDateString());
    if (bucket) bucket.count += 1;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

export function cumulativeSeries(createdAts: string[], n = 15): { points: number[]; max: number } {
  const total = createdAts.length;
  if (!total) return { points: [0, 0], max: 1 };
  const times = createdAts.map((value) => new Date(value).getTime()).sort((a, b) => a - b);
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
