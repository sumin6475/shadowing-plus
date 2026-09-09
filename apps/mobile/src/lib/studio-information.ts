// studio-information.ts — revised Studio IA over the shipped Speaking World
// tables. Physical legacy table names stay in place for backward compatibility:
// domains=Topics, stories=Situations, messages=Speaking Notes,
// talk_sessions=Practice Attempts.
import { fetchPhrases, linkPhraseToStory, recordPhraseEvent, type PhraseItem } from "./phrases";
import { createBeat, createStory, fetchDomains } from "./speaking-world";
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

function looksLikeMissingStudioSchema(message: string): boolean {
  return /domain_id|goal|body|status|event_date|note_phrase_links|schema cache/i.test(message);
}

export function quickTitleFromBody(body: string): string {
  const first = body
    .trim()
    .split(/(?<=[.!?])\s+|\n+/)[0]
    ?.replace(/\s+/g, " ")
    .trim();
  if (!first) return "";
  return first.length > 64 ? `${first.slice(0, 61).trimEnd()}…` : first;
}

export async function fetchStudioTopics(): Promise<StudioTopic[]> {
  // fetchDomains owns first-use seeding, so a brand-new account never lands on
  // an empty Quick Note topic picker.
  const domains = await fetchDomains();
  return domains.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
    situationCount: row.storyCount,
  }));
}

export async function fetchStudioSituations(topicId?: string): Promise<StudioSituation[]> {
  const load = async (modern: boolean) => {
    let query = supabase
      .from("stories")
      .select(modern ? "id, domain_id, title, summary, event_date, status, domains(name)" : "id, domain_id, title, summary, status, domains(name)")
      .neq("status", "archived")
      .order("updated_at", { ascending: false });
    if (topicId) query = query.eq("domain_id", topicId);
    return query;
  };
  let result = await load(true);
  let modern = true;
  if (result.error && looksLikeMissingStudioSchema(result.error.message)) {
    result = await load(false);
    modern = false;
  }
  if (result.error) throw new Error(result.error.message);

  const situationRows = (result.data ?? []) as unknown as LooseRow[];
  const ids = situationRows.map((row) => row.id as string);
  const [notes, attempts] = ids.length
    ? await Promise.all([
        supabase.from("messages").select("id, story_id").in("story_id", ids),
        supabase.from("talk_sessions").select("id, story_id").in("story_id", ids),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (notes.error) throw new Error(notes.error.message);
  if (attempts.error) throw new Error(attempts.error.message);
  const noteCounts = countBy((notes.data ?? []) as LooseRow[], "story_id");
  const attemptCounts = countBy((attempts.data ?? []) as LooseRow[], "story_id");

  return situationRows.flatMap((row) => {
    const domainId = row.domain_id as string | null;
    if (!domainId) return [];
    const domain = one(row.domains as { name?: string } | { name?: string }[] | null);
    return [{
      id: row.id as string,
      topicId: domainId,
      topicName: domain?.name ?? null,
      title: (row.title as string) || "Untitled situation",
      description: (row.summary as string | null) ?? null,
      eventDate: modern ? ((row.event_date as string | null) ?? null) : null,
      status: (row.status as string) ?? "active",
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
      ? "id, story_id, domain_id, label, goal, body, status, created_at, updated_at, stories(title, domain_id, domains(name)), domains(name)"
      : "id, story_id, label, created_at, updated_at, stories(title, domain_id, domains(name))";
    let query = supabase.from("messages").select(select).order("updated_at", { ascending: false }).limit(input.limit ?? 100);
    if (input.id) query = query.eq("id", input.id);
    if (input.situationId) query = query.eq("story_id", input.situationId);
    if (modern && input.topicId) query = query.eq("domain_id", input.topicId);
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

  return rows.flatMap((row) => {
    const story = one(row.stories as LooseRow | LooseRow[] | null);
    const storyDomain = one(story?.domains as { name?: string } | { name?: string }[] | null);
    const directDomain = one(row.domains as { name?: string } | { name?: string }[] | null);
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
  const [topics, situations, notes] = await Promise.all([
    fetchStudioTopics(),
    fetchStudioSituations(),
    fetchSpeakingNotes({ limit: 30 }),
  ]);
  return { topics, situations, notes };
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

function phraseFromNested(value: unknown): NotePhrase | null {
  const row = one(value as LooseRow | LooseRow[] | null);
  if (!row || row.status !== "ready") return null;
  return {
    id: row.id as string,
    text: (row.text as string) || "",
    translation: (row.meaning_ko as string | null) ?? null,
    learningStatus: ((row.learning_status as PhraseItem["learningStatus"] | null) ?? "new"),
  };
}

export async function fetchNotePhrases(note: Pick<SpeakingNote, "id" | "situationId">): Promise<NotePhrase[]> {
  const result = await supabase
    .from("note_phrase_links")
    .select("phrase_items(id, text, meaning_ko, learning_status, status)")
    .eq("message_id", note.id)
    .order("linked_at", { ascending: false });
  if (!result.error) return (result.data ?? []).flatMap((row) => phraseFromNested(row.phrase_items) ?? []);
  if (!looksLikeMissingStudioSchema(result.error.message) || !note.situationId) throw new Error(result.error.message);
  const fallback = await supabase
    .from("phrase_story_links")
    .select("phrase_items(id, text, meaning_ko, learning_status, status)")
    .eq("story_id", note.situationId);
  if (fallback.error) throw new Error(fallback.error.message);
  return (fallback.data ?? []).flatMap((row) => phraseFromNested(row.phrase_items) ?? []);
}

export async function fetchSituationPhrases(situationId: string): Promise<NotePhrase[]> {
  const notes = await fetchSpeakingNotes({ situationId, limit: 100 });
  const groups = await Promise.all(notes.map((note) => fetchNotePhrases(note)));
  const unique = new Map<string, NotePhrase>();
  for (const phrase of groups.flat()) unique.set(phrase.id, phrase);
  return [...unique.values()];
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
  const id = await createStory(topicId, "Unsorted");
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
    await createBeat(noteId, `Goal: ${input.goal.trim()}`, 0);
    await createBeat(noteId, input.body.trim(), 1);
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
    await linkPhraseToStory(input.phraseId, input.situationId);
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
    const id = await createStory(input.topicId, input.title);
    if (!id) throw new Error("Couldn’t create this situation.");
    return id;
  }
  throw new Error(result.error?.message ?? "Couldn’t create this situation.");
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
