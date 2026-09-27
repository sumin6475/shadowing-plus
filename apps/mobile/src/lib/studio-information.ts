// Active Studio IA over the deployed persistence
// tables. Physical legacy table names stay in place for backward compatibility:
// domains=Topics, stories=Situations, messages=Speaking Notes,
// talk_sessions=Practice Attempts.
import { fetchPhrases, linkPhraseToSituation, recordPhraseEvent, type PhraseItem } from "./phrases";
import { archiveSituation, archiveTopic, createSituation, createSpeakingBeat, createTopic, fetchTopics, renameTopic } from "./studio-model";
import { supabase } from "./supabase";

export interface StudioTopic {
  id: string;
  name: string;
  color: string | null;
  position: number;
  situationCount: number;
}

export interface StudioSituation {
  id: string;
  topicId: string;
  topicName: string | null;
  title: string;
  description: string | null;
  eventDate: string | null;
  status: string;
  isFavorite: boolean;
  noteCount: number;
  attemptCount: number;
}

export interface SpeakingNote {
  id: string;
  topicId: string;
  topicName: string | null;
  situationId: string | null;
  situationTitle: string | null;
  title: string;
  goal: string;
  body: string;
  status: "active" | "archived" | "unsorted" | "needs_review";
  phraseCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotePhrase {
  id: string;
  text: string;
  translation: string | null;
  learningStatus: PhraseItem["learningStatus"];
  /** AI / learner-edited "how it's used". Same column the Phrase Bank shows. */
  usageNote: string | null;
  /** The Speaking Note this phrase arrived through, or null when it is attached
   *  straight to the Situation (phrase_story_links, written on every capture). */
  noteId: string | null;
  noteTitle: string | null;
}

export interface PracticeAttempt {
  id: string;
  noteId: string | null;
  situationId: string | null;
  transcript: string | null;
  durationSeconds: number | null;
  audioKey: string | null;
  repairSuggestion: string | null;
  createdAt: string;
}

export interface StudioOverview {
  topics: StudioTopic[];
  situations: StudioSituation[];
  notes: SpeakingNote[];
  /** Newest-first, across every note. Feeds the "Continue practicing" pick. */
  recentAttempts: PracticeAttempt[];
}

export interface QuickNoteInput {
  title: string;
  body: string;
  goal: string;
  topicId: string;
  situationId?: string | null;
  phraseIds?: string[];
}

type LooseRow = Record<string, unknown>;

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function countBy(rows: LooseRow[] | null | undefined, key: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const value = row[key];
    if (typeof value !== "string") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

// `is_favorite` is the 029 column. On a database that hasn't run it PostgREST
// answers "column stories.is_favorite does not exist", which matched none of
// the older tokens — and because fetchStudioOverview is one Promise.all, the
// whole Studio home would have gone to an ErrorCard instead of degrading to a
// list without favorites.
//
// `meaning` is the 030 column — the EXPAND half of renaming
// phrase_items.meaning_ko to meaning. Same trap, one layer down: every nested
// phrase select below names it, and a database that has not run 030 answers
// "column phrase_items.meaning does not exist". The token on its own only buys
// the retry; PHRASE_MEANING_COLUMNS is what re-asks for the gloss under its old
// name, so a Situation keeps showing its phrases instead of listing none.
function looksLikeMissingStudioSchema(message: string): boolean {
  return /domain_id|goal|body|status|event_date|is_favorite|meaning|note_phrase_links|schema cache/i.test(message);
}

// Chinese and Japanese end sentences with 。！？ and never put a space after
// them, so those split on the mark itself; Latin punctuation still needs the
// following whitespace.
const SENTENCE_END = /(?<=[.!?])\s+|(?<=[。！？])|\n+/;

export function quickTitleFromBody(body: string): string {
  const first = body.trim().split(SENTENCE_END)[0]?.replace(/\s+/g, " ").trim();
  if (!first) return "";
  // Count code points, not UTF-16 units, so an emoji is never cut in half.
  const chars = Array.from(first);
  return chars.length > 64 ? `${chars.slice(0, 61).join("").trimEnd()}…` : first;
}

export async function fetchStudioTopics(): Promise<StudioTopic[]> {
  // fetchTopics owns first-use seeding, so a brand-new account never lands on
  // an empty Quick Note topic picker.
  const domains = await fetchTopics();
  return domains.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    situationCount: row.situationCount,
  }));
}

/** Create a Topic. createDomain owns positioning; this keeps the Studio screens
 *  on one import surface, the way fetchStudioTopics wraps fetchDomains. */
export async function createStudioTopic(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a topic name.");
  const id = await createTopic(trimmed);
  if (!id) throw new Error("Couldn’t create this topic.");
  return id;
}

export async function renameStudioTopic(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a topic name.");
  await renameTopic(id, trimmed);
}

/** Soft-archive a Topic. Refuses the learner's last open one — archiveTopic
 *  explains why, and throws a message the UI can show verbatim. */
export async function archiveStudioTopic(id: string): Promise<void> {
  await archiveTopic(id);
}

// Column ladder, widest first. Each rung drops the column a newer migration
// added (029 is_favorite, then 028 event_date), so an un-migrated database
// still loads the list instead of erroring out the whole Studio home. A missing
// column just leaves the key off the row, which the `??` defaults below absorb.
const SITUATION_SELECTS = [
  "id, domain_id, title, summary, event_date, status, is_favorite, domains(name, archived)",
  "id, domain_id, title, summary, event_date, status, domains(name, archived)",
  "id, domain_id, title, summary, status, domains(name, archived)",
];

// Favorites are filtered in memory, not in SQL. An `.eq("is_favorite", true)`
// would pin this query to the top rung of the ladder — the only select that
// names the column — and on a database still short of migration 029 it would
// take the whole Studio home down with it. Every caller already needs the full
// list for its picker, so the filter costs a `.filter()`, not a round trip.
export async function fetchStudioSituations(topicId?: string): Promise<StudioSituation[]> {
  const load = async (select: string) => {
    let query = supabase
      .from("stories")
      .select(select)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });
    if (topicId) query = query.eq("domain_id", topicId);
    return query;
  };
  let result = await load(SITUATION_SELECTS[0]);
  for (let rung = 1; rung < SITUATION_SELECTS.length && result.error && looksLikeMissingStudioSchema(result.error.message); rung += 1) {
    result = await load(SITUATION_SELECTS[rung]);
  }
  if (result.error) throw new Error(result.error.message);

  const situationRows = (result.data ?? []) as unknown as LooseRow[];
  const ids = situationRows.map((row) => row.id as string);
  // Archived notes are out of every Studio list, so they are out of the count
  // too. `status` arrived in 028; a pre-028 database has nothing archived.
  const countNotes = async () => {
    const modern = await supabase.from("messages").select("id, story_id").in("story_id", ids).neq("status", "archived");
    return modern.error && looksLikeMissingStudioSchema(modern.error.message)
      ? await supabase.from("messages").select("id, story_id").in("story_id", ids)
      : modern;
  };
  const [notes, attempts] = ids.length
    ? await Promise.all([
        countNotes(),
        supabase.from("talk_sessions").select("id, story_id").in("story_id", ids),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (notes.error) throw new Error(notes.error.message);
  if (attempts.error) throw new Error(attempts.error.message);
  const noteCounts = countBy((notes.data ?? []) as LooseRow[], "story_id");
  const attemptCounts = countBy((attempts.data ?? []) as LooseRow[], "story_id");

  type DomainRef = { name?: string; archived?: boolean };
  return situationRows.flatMap((row) => {
    const domainId = row.domain_id as string | null;
    if (!domainId) return [];
    const domain = one(row.domains as DomainRef | DomainRef[] | null);
    // An archived Topic drops out of the cross-topic lists, but a query scoped
    // to one topic still answers so an open Topic screen can't blank out
    // mid-session.
    if (!topicId && domain?.archived) return [];
    return [{
      id: row.id as string,
      topicId: domainId,
      topicName: domain?.name ?? null,
      title: (row.title as string) || "Untitled situation",
      description: (row.summary as string | null) ?? null,
      eventDate: (row.event_date as string | null) ?? null,
      status: (row.status as string) ?? "active",
      isFavorite: (row.is_favorite as boolean | null) ?? false,
      noteCount: noteCounts.get(row.id as string) ?? 0,
      attemptCount: attemptCounts.get(row.id as string) ?? 0,
    }];
  });
}

async function noteCounts(noteIds: string[]): Promise<{ phrases: Map<string, number>; attempts: Map<string, number> }> {
  if (!noteIds.length) return { phrases: new Map(), attempts: new Map() };
  const [links, attempts] = await Promise.all([
    supabase.from("note_phrase_links").select("message_id").in("message_id", noteIds),
    supabase.from("talk_sessions").select("message_id").in("message_id", noteIds),
  ]);
  const phrases = links.error && looksLikeMissingStudioSchema(links.error.message)
    ? new Map<string, number>()
    : countBy((links.data ?? []) as LooseRow[], "message_id");
  if (links.error && !looksLikeMissingStudioSchema(links.error.message)) throw new Error(links.error.message);
  if (attempts.error) throw new Error(attempts.error.message);
  return { phrases, attempts: countBy((attempts.data ?? []) as LooseRow[], "message_id") };
}

export async function fetchSpeakingNotes(input: {
  id?: string;
  limit?: number;
  topicId?: string;
  situationId?: string;
} = {}): Promise<SpeakingNote[]> {
  const load = async (modern: boolean) => {
    const select = modern
      ? "id, story_id, domain_id, label, goal, body, status, created_at, updated_at, stories(title, domain_id, domains(name, archived)), domains(name, archived)"
      : "id, story_id, label, created_at, updated_at, stories(title, domain_id, domains(name, archived))";
    let query = supabase.from("messages").select(select).order("updated_at", { ascending: false }).limit(input.limit ?? 100);
    if (input.id) query = query.eq("id", input.id);
    if (input.situationId) query = query.eq("story_id", input.situationId);
    if (modern && input.topicId) query = query.eq("domain_id", input.topicId);
    if (modern) query = query.neq("status", "archived");
    return query;
  };

  let result = await load(true);
  let modern = true;
  if (result.error && looksLikeMissingStudioSchema(result.error.message)) {
    result = await load(false);
    modern = false;
  }
  if (result.error) throw new Error(result.error.message);
  const rows = (result.data ?? []) as unknown as LooseRow[];
  const counts = await noteCounts(rows.map((row) => row.id as string));
  const storyIds = [...new Set(rows.map((row) => row.story_id).filter((value): value is string => typeof value === "string"))];
  const legacyLinks = storyIds.length
    ? await supabase.from("phrase_story_links").select("story_id").in("story_id", storyIds)
    : { data: [], error: null };
  const legacyPhraseCounts = legacyLinks.error
    ? new Map<string, number>()
    : countBy((legacyLinks.data ?? []) as LooseRow[], "story_id");

  // Any scoped query (by id, topic, or situation) still answers for an archived
  // Topic so an open screen can't blank out; only the cross-topic lists hide it.
  const scoped = Boolean(input.id || input.topicId || input.situationId);
  type DomainRef = { name?: string; archived?: boolean };
  return rows.flatMap((row) => {
    const story = one(row.stories as LooseRow | LooseRow[] | null);
    const storyDomain = one(story?.domains as DomainRef | DomainRef[] | null);
    const directDomain = one(row.domains as DomainRef | DomainRef[] | null);
    if (!scoped && (directDomain?.archived ?? storyDomain?.archived)) return [];
    const topicId = modern
      ? ((row.domain_id as string | null) ?? (story?.domain_id as string | null))
      : (story?.domain_id as string | null);
    if (!topicId || (input.topicId && topicId !== input.topicId)) return [];
    const situationId = (row.story_id as string | null) ?? null;
    const status = modern ? ((row.status as SpeakingNote["status"] | null) ?? "active") : "active";
    if (status === "archived") return [];
    return [{
      id: row.id as string,
      topicId,
      topicName: directDomain?.name ?? storyDomain?.name ?? null,
      situationId,
      situationTitle: (story?.title as string | null) ?? null,
      title: (row.label as string) || "Untitled note",
      goal: modern ? ((row.goal as string | null) ?? "") : "",
      body: modern ? ((row.body as string | null) ?? "") : "",
      status,
      phraseCount: counts.phrases.has(row.id as string)
        ? (counts.phrases.get(row.id as string) ?? 0)
        : (situationId ? (legacyPhraseCounts.get(situationId) ?? 0) : 0),
      attemptCount: counts.attempts.get(row.id as string) ?? 0,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }];
  });
}

export async function fetchStudioOverview(): Promise<StudioOverview> {
  const [topics, situations, notes, recentAttempts] = await Promise.all([
    fetchStudioTopics(),
    fetchStudioSituations(),
    fetchSpeakingNotes({ limit: 30 }),
    fetchPracticeAttempts({ limit: 25 }).catch(() => [] as PracticeAttempt[]),
  ]);
  return { topics, situations, notes, recentAttempts };
}

const RECENT_PRACTICE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Which note "Continue practicing" should offer.
 *
 * Ordering by `updated_at` alone let a note that was just typed and never
 * spoken sit at the top forever, so practice history comes first:
 *   1. the note behind the most recent attempt in the last 7 days
 *   2. else the most recently updated note that already has linked phrases
 *   3. else the most recently updated note
 * Pure so it can be unit tested; `notes` is expected newest-updated first and
 * `attempts` newest first.
 */
export function pickCurrentNote(
  notes: SpeakingNote[],
  attempts: PracticeAttempt[],
  now: number = Date.now(),
): SpeakingNote | null {
  const open = notes.filter((note) => note.status === "active" || note.status === "unsorted");
  if (!open.length) return null;
  const byId = new Map(open.map((note) => [note.id, note]));
  const since = now - RECENT_PRACTICE_WINDOW_MS;
  for (const attempt of attempts) {
    const at = new Date(attempt.createdAt).getTime();
    if (!Number.isFinite(at) || at < since) break;
    const note = attempt.noteId ? byId.get(attempt.noteId) : undefined;
    if (note) return note;
  }
  return open.find((note) => note.phraseCount > 0) ?? open[0];
}

export async function fetchSpeakingNote(id: string): Promise<SpeakingNote | null> {
  const notes = await fetchSpeakingNotes({ id, limit: 1 });
  return notes[0] ?? null;
}

export async function fetchPracticeAttempts(input: { noteId?: string; situationId?: string; limit?: number }): Promise<PracticeAttempt[]> {
  let query = supabase
    .from("talk_sessions")
    .select("id, message_id, story_id, transcript, duration_seconds, audio_key, created_at")
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 25);
  if (input.noteId) query = query.eq("message_id", input.noteId);
  if (input.situationId) query = query.eq("story_id", input.situationId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((row) => row.id as string);
  const repairs = ids.length
    ? await supabase
        .from("talk_suggestion_feedback")
        .select("talk_session_id, suggestion")
        .in("talk_session_id", ids)
        .order("moment_index", { ascending: true })
    : { data: [], error: null };
  const repairByAttempt = new Map<string, string>();
  if (!repairs.error) {
    for (const row of repairs.data ?? []) {
      const id = row.talk_session_id as string | null;
      if (id && !repairByAttempt.has(id)) repairByAttempt.set(id, (row.suggestion as string) || "");
    }
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    noteId: (row.message_id as string | null) ?? null,
    situationId: (row.story_id as string | null) ?? null,
    transcript: (row.transcript as string | null) ?? null,
    durationSeconds: (row.duration_seconds as number | null) ?? null,
    audioKey: (row.audio_key as string | null) ?? null,
    repairSuggestion: repairByAttempt.get(row.id as string) || null,
    createdAt: row.created_at as string,
  }));
}

// Gloss-column ladder for the nested phrase selects, widest/newest first like
// SITUATION_SELECTS. 030 adds `meaning` beside the legacy `meaning_ko` and a
// trigger mirrors the two, so either name returns the same text; a database
// still short of 030 only answers to the second rung. Drop that rung with 031.
const PHRASE_MEANING_COLUMNS = ["meaning", "meaning_ko"] as const;

const nestedPhraseSelect = (meaning: string) =>
  `phrase_items(id, text, ${meaning}, usage_note, learning_status, status)`;

/** Walk the gloss rungs for one nested phrase query. `load` receives the
 *  `phrase_items(...)` fragment to splice into its own select. */
async function loadNestedPhrases(
  load: (nested: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  let result = await load(nestedPhraseSelect(PHRASE_MEANING_COLUMNS[0]));
  for (
    let rung = 1;
    rung < PHRASE_MEANING_COLUMNS.length &&
    result.error &&
    looksLikeMissingStudioSchema(result.error.message);
    rung += 1
  ) {
    result = await load(nestedPhraseSelect(PHRASE_MEANING_COLUMNS[rung]));
  }
  return result;
}

function phraseFromNested(value: unknown, from: { noteId: string | null; noteTitle: string | null }): NotePhrase | null {
  const row = one(value as LooseRow | LooseRow[] | null);
  if (!row || row.status !== "ready") return null;
  return {
    id: row.id as string,
    text: (row.text as string) || "",
    // `meaning` post-030, `meaning_ko` on the pre-030 rung.
    translation:
      (row.meaning as string | null | undefined) ??
      (row.meaning_ko as string | null | undefined) ??
      null,
    learningStatus: ((row.learning_status as PhraseItem["learningStatus"] | null) ?? "new"),
    usageNote: (row.usage_note as string | null | undefined) ?? null,
    noteId: from.noteId,
    noteTitle: from.noteTitle,
  };
}

/** Phrases attached straight to a Situation. phrase_story_links is written by
 *  every capture (linkPhraseToSituation) but Studio never read it, which is why a
 *  Situation with no Notes showed zero phrases. These carry no Note. */
async function situationLinkedPhrases(situationId: string): Promise<NotePhrase[]> {
  const result = await loadNestedPhrases((nested) =>
    supabase
      .from("phrase_story_links")
      .select(nested)
      .eq("story_id", situationId)
      .order("created_at", { ascending: false }),
  );
  if (result.error) {
    if (!looksLikeMissingStudioSchema(result.error.message)) throw new Error(result.error.message);
    return [];
  }
  const rows = (result.data as unknown as LooseRow[] | null) ?? [];
  return rows.flatMap((row) => phraseFromNested(row.phrase_items, { noteId: null, noteTitle: null }) ?? []);
}

export async function fetchNotePhrases(note: Pick<SpeakingNote, "id" | "situationId" | "title">): Promise<NotePhrase[]> {
  const result = await loadNestedPhrases((nested) =>
    supabase
      .from("note_phrase_links")
      .select(`message_id, ${nested}`)
      .eq("message_id", note.id)
      .order("linked_at", { ascending: false }),
  );
  if (!result.error) {
    const rows = (result.data as unknown as LooseRow[] | null) ?? [];
    return rows.flatMap((row) => phraseFromNested(row.phrase_items, {
      noteId: (row.message_id as string | null) ?? note.id,
      noteTitle: note.title,
    }) ?? []);
  }
  if (!looksLikeMissingStudioSchema(result.error.message) || !note.situationId) throw new Error(result.error.message);
  // Pre-028 databases only have Situation-level links, and those name no Note.
  const situationId = note.situationId;
  const fallback = await loadNestedPhrases((nested) =>
    supabase.from("phrase_story_links").select(nested).eq("story_id", situationId),
  );
  if (fallback.error) throw new Error(fallback.error.message);
  const rows = (fallback.data as unknown as LooseRow[] | null) ?? [];
  return rows.flatMap((row) => phraseFromNested(row.phrase_items, { noteId: null, noteTitle: null }) ?? []);
}

/** Every phrase in a Situation: the ones its Notes link, plus the ones attached
 *  to the Situation directly. */
export async function fetchSituationPhrases(situationId: string): Promise<NotePhrase[]> {
  const notes = await fetchSpeakingNotes({ situationId, limit: 100 });
  const [groups, direct] = await Promise.all([
    Promise.all(notes.map((note) => fetchNotePhrases(note))),
    situationLinkedPhrases(situationId),
  ]);
  // Still one row per phrase, but provenance is deterministic now instead of
  // "whichever Note happened to be walked last": notes arrive newest-updated
  // first, so the freshest Note that claims a phrase wins, and a direct
  // Situation link only fills in for phrases no Note claims.
  const unique = new Map<string, NotePhrase>();
  for (const phrase of [...groups.flat(), ...direct]) {
    if (!unique.has(phrase.id)) unique.set(phrase.id, phrase);
  }
  return [...unique.values()];
}

/** Attach a phrase straight to a Situation. Delegates to linkPhraseToSituation so
 *  phrase_story_links keeps a single writer — and its 'learner' default is the
 *  point: that table's CHECK has no 'migration', which note_phrase_links does,
 *  so a source value must never be copied across from a Note link. */
export async function addPhraseToSituation(situationId: string, phraseId: string): Promise<void> {
  await linkPhraseToSituation(phraseId, situationId);
}

/**
 * Detach a phrase from a Situation; the phrase itself stays in the Phrase Bank.
 * A phrase can reach a Situation two ways — a direct link, or any Note inside
 * it — so both go. Dropping only the direct link would leave the phrase on
 * screen and make the button look broken.
 */
export async function removePhraseFromSituation(situationId: string, phraseId: string): Promise<void> {
  const direct = await supabase
    .from("phrase_story_links")
    .delete()
    .eq("story_id", situationId)
    .eq("phrase_item_id", phraseId);
  if (direct.error) throw new Error(direct.error.message);
  const notes = await supabase.from("messages").select("id").eq("story_id", situationId);
  if (notes.error) throw new Error(notes.error.message);
  const noteIds = (notes.data ?? []).map((row) => row.id as string);
  if (!noteIds.length) return;
  const links = await supabase
    .from("note_phrase_links")
    .delete()
    .in("message_id", noteIds)
    .eq("phrase_item_id", phraseId);
  if (links.error && !looksLikeMissingStudioSchema(links.error.message)) throw new Error(links.error.message);
}

async function legacyUnsortedSituation(topicId: string): Promise<string> {
  const existing = await supabase
    .from("stories")
    .select("id")
    .eq("domain_id", topicId)
    .eq("title", "Unsorted")
    .neq("status", "archived")
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.id) return existing.data.id as string;
  const id = await createSituation(topicId, "Unsorted");
  if (!id) throw new Error("Couldn’t create the Unsorted situation.");
  return id;
}

export async function createQuickNote(input: QuickNoteInput): Promise<string> {
  const title = input.title.trim() || quickTitleFromBody(input.body);
  if (!title || !input.body.trim() || !input.goal.trim() || !input.topicId) {
    throw new Error("Title, note, goal, and topic are required.");
  }
  const modern = await supabase
    .from("messages")
    .insert({
      story_id: input.situationId ?? null,
      domain_id: input.topicId,
      label: title,
      goal: input.goal.trim(),
      body: input.body.trim(),
      status: input.situationId ? "active" : "unsorted",
    })
    .select("id")
    .single();

  let noteId: string;
  let situationId = input.situationId ?? null;
  if (!modern.error && modern.data?.id) {
    noteId = modern.data.id as string;
  } else if (modern.error && looksLikeMissingStudioSchema(modern.error.message)) {
    situationId = situationId ?? await legacyUnsortedSituation(input.topicId);
    const legacy = await supabase.from("messages").insert({ story_id: situationId, label: title }).select("id").single();
    if (legacy.error || !legacy.data?.id) throw new Error(legacy.error?.message ?? "Couldn’t save this note.");
    noteId = legacy.data.id as string;
    await createSpeakingBeat(noteId, `Goal: ${input.goal.trim()}`, 0);
    await createSpeakingBeat(noteId, input.body.trim(), 1);
  } else {
    throw new Error(modern.error?.message ?? "Couldn’t save this note.");
  }

  for (const phraseId of [...new Set(input.phraseIds ?? [])]) {
    await linkPhraseToNote({ noteId, phraseId, situationId });
  }
  return noteId;
}

export async function updateSpeakingNote(id: string, input: Pick<QuickNoteInput, "title" | "body" | "goal" | "topicId" | "situationId">): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({
      label: input.title.trim(),
      body: input.body.trim(),
      goal: input.goal.trim(),
      domain_id: input.topicId,
      story_id: input.situationId ?? null,
      status: input.situationId ? "active" : "unsorted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    // Never resurrect an archived note. The note screen autosaves on a debounce
    // and flushes on unmount, so a save can land after the learner archived it,
    // and the `status` above would put it straight back to active.
    .neq("status", "archived");
  if (error) throw new Error(error.message);
}

/** Take a note out of every Studio list. Archive, never delete: a hard delete
 *  cascades to its beats and phrase links and orphans its practice attempts.
 *  `messages.status` already allows 'archived' (028), and the scope trigger
 *  passes it through untouched, so this needs no migration. */
export async function archiveSpeakingNote(id: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function linkPhraseToNote(input: { noteId: string; phraseId: string; situationId?: string | null }): Promise<void> {
  const { error } = await supabase.from("note_phrase_links").upsert(
    { message_id: input.noteId, phrase_item_id: input.phraseId, source: "learner" },
    { onConflict: "message_id,phrase_item_id" },
  );
  if (!error) return;
  if (looksLikeMissingStudioSchema(error.message) && input.situationId) {
    await linkPhraseToSituation(input.phraseId, input.situationId);
    return;
  }
  throw new Error(error.message);
}

export async function unlinkPhraseFromNote(noteId: string, phraseId: string): Promise<void> {
  const { error } = await supabase.from("note_phrase_links").delete().eq("message_id", noteId).eq("phrase_item_id", phraseId);
  if (error && !looksLikeMissingStudioSchema(error.message)) throw new Error(error.message);
}

export async function phraseChoices(): Promise<PhraseItem[]> {
  return fetchPhrases();
}

export async function createStudioSituation(input: { topicId: string; title: string; description?: string | null; eventDate?: string | null }): Promise<string> {
  const result = await supabase
    .from("stories")
    .insert({
      domain_id: input.topicId,
      title: input.title.trim(),
      summary: input.description?.trim() || null,
      event_date: input.eventDate || null,
      status: "ready",
    })
    .select("id")
    .single();
  if (!result.error && result.data?.id) return result.data.id as string;
  if (result.error && looksLikeMissingStudioSchema(result.error.message)) {
    const id = await createSituation(input.topicId, input.title);
    if (!id) throw new Error("Couldn’t create this situation.");
    return id;
  }
  throw new Error(result.error?.message ?? "Couldn’t create this situation.");
}

/**
 * Rename a situation. Nothing in the schema maintains `stories.updated_at` —
 * there is no trigger, and none of the shipped writers set it — so
 * fetchStudioSituations' `order("updated_at")` was silently created_at order.
 * Every content write here sets it, or a rename wouldn't reorder the list.
 */
export async function renameStudioSituation(id: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Enter a situation name.");
  const { error } = await supabase
    .from("stories")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Soft-archive a situation. Reuses archiveSituation so stories.status has one
 *  updater — a hard delete would cascade to its notes, beats and attempts. */
export async function archiveStudioSituation(id: string): Promise<void> {
  await archiveSituation(id);
}

/** Star a situation. Modelled on setPhraseFavorite: the column lands in 029, so
 *  a database without it gets a line the UI can show instead of raw SQL.
 *  Deliberately does not touch updated_at — starring isn't an edit, and it
 *  would shuffle the list under the learner's thumb. */
export async function setSituationFavorite(id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from("stories").update({ is_favorite: favorite }).eq("id", id);
  if (error && looksLikeMissingStudioSchema(error.message)) throw new Error("Favorites are temporarily unavailable.");
  if (error) throw new Error(error.message);
}

/** Set (or clear) a situation's event date. Backs the "+ Date" chip on the
 *  Situation header — the field shipped in migration 028 but nothing ever
 *  wrote to it, so every situation read back null. */
export async function setSituationEventDate(id: string, eventDate: string | null): Promise<void> {
  const { error } = await supabase
    .from("stories")
    .update({ event_date: eventDate, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveAttemptPhraseCandidates(input: {
  talkSessionId: string;
  matches: { phraseItemId: string; said: string; score: number }[];
}): Promise<void> {
  if (!input.matches.length) return;
  const rows = input.matches.map((match) => ({
    talk_session_id: input.talkSessionId,
    phrase_item_id: match.phraseItemId,
    detection_status: "candidate",
    evidence: { transcript_quote: match.said, score: match.score, source: "talk_phrase_suggest" },
  }));
  const { error } = await supabase.from("attempt_phrase_candidates").upsert(rows, { onConflict: "talk_session_id,phrase_item_id" });
  if (error && !looksLikeMissingStudioSchema(error.message)) throw new Error(error.message);
}

export async function confirmAttemptPhraseCandidate(input: {
  talkSessionId: string;
  phraseItemId: string;
  used: boolean;
  situationId?: string | null;
  said?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("attempt_phrase_candidates").upsert({
    talk_session_id: input.talkSessionId,
    phrase_item_id: input.phraseItemId,
    detection_status: input.used ? "confirmed_used" : "rejected",
    confirmed_by_user_at: now,
    evidence: { transcript_quote: input.said ?? null, self_reported: true },
  }, { onConflict: "talk_session_id,phrase_item_id" });
  if (error && !looksLikeMissingStudioSchema(error.message)) throw new Error(error.message);
  await recordPhraseEvent({
    phraseItemId: input.phraseItemId,
    event: input.used ? "used" : "rejected",
    storyId: input.situationId ?? null,
    talkSessionId: input.talkSessionId,
    evidence: { transcript_quote: input.said ?? null, self_reported: true, source: "attempt_confirmation" },
  });
}
