import { supabase } from "./supabase";
import { deleteTalkSessionAudio } from "./talk-audio";
import { NOTE_TEMPLATE, readyAt, type Progress, type Step } from "./mvp-model";
export * from "./mvp-model";
export interface MvpPhrase extends Progress {
  id: string;
  text: string;
  translation: string | null;
  source: string;
  createdAt: string;
}
export interface Note {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  created_at: string;
}
export interface Sentence {
  id: string;
  text: string;
}
export interface MirrorSession {
  id: string;
  audio_key: string | null;
  note_id: string | null;
  transcript: string | null;
  seconds: number;
  created_at: string;
}

export async function loadPhraseBank(): Promise<MvpPhrase[]> {
  const phrases: MvpPhrase[] = [];
  // Fetch progress and content together. Separate capped queries can pair a
  // newer phrase with missing progress, incorrectly showing it as Collected.
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("phrase_items")
      .select(
        "id,text,meaning,source_context,created_at,pronounced_at,examples_seen_at,own_example_at",
      )
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    for (const row of data) {
      const context =
        row.source_context && typeof row.source_context === "object"
          ? row.source_context
          : {};
      phrases.push({
        id: row.id,
        text: row.text,
        translation: row.meaning,
        source:
          typeof context.source_label === "string"
            ? context.source_label
            : "Saved phrase",
        createdAt: row.created_at,
        pronounced_at: row.pronounced_at,
        examples_seen_at: row.examples_seen_at,
        own_example_at: row.own_example_at,
      });
    }
    if (data.length < 1000) return phrases;
  }
}
export async function todayReadyPhrases() {
  return (await loadPhraseBank())
    .filter((p) => readyAt(p) > 0)
    .sort((a, b) => readyAt(b) - readyAt(a))
    .slice(0, 3);
}
export async function setStep(id: string, step: Step, checked: boolean) {
  const { error } = await supabase
    .from("phrase_items")
    .update({ [step]: checked ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function loadSentences(id: string): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from("phrase_examples")
    .select("id,text")
    .eq("phrase_id", id)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data;
}
export async function addSentence(id: string, text: string) {
  if (!text.trim()) throw new Error("Write a sentence first.");
  const { error } = await supabase
    .from("phrase_examples")
    .insert({ phrase_id: id, text: text.trim() });
  if (error) throw new Error(error.message);
}
export async function deleteSentence(id: string) {
  const { error } = await supabase
    .from("phrase_examples")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
export async function loadNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
export async function loadNote(id: string): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
export async function createNote(
  title = "",
  body = NOTE_TEMPLATE,
): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ title, body })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
export async function saveNote(id: string, title: string, body: string) {
  const { data, error } = await supabase
    .from("notes")
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data)
    throw new Error(error?.message ?? "This note is no longer available.");
}
export async function deleteNote(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
export async function loadMirrorSessions(): Promise<MirrorSession[]> {
  const rows: MirrorSession[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("talk_sessions")
      .select("id,note_id,transcript,seconds,duration_seconds,audio_key,created_at")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(
      ...data.map((row) => ({
        ...row,
        seconds: row.seconds ?? row.duration_seconds ?? 0,
      })),
    );
    if (data.length < 1000) return rows;
  }
}
/** Delete a session and the recording it points at. The row carries the only
 *  pointer to that file, so the audio goes first — a failed row delete leaves
 *  a session without audio, which is recoverable; the reverse orphans a file
 *  nothing can reach. */
export async function deleteMirrorSession(session: {
  id: string;
  audio_key: string | null;
}) {
  if (session.audio_key)
    await deleteTalkSessionAudio(session.id, session.audio_key);
  const { error } = await supabase
    .from("talk_sessions")
    .delete()
    .eq("id", session.id);
  if (error) throw new Error(error.message);
}
export async function saveMirrorSession(input: {
  id: string;
  noteId?: string | null;
  transcript: string;
  seconds: number;
}) {
  const seconds = Math.max(0, Math.round(input.seconds));
  const { error } = await supabase.from("talk_sessions").upsert(
    {
      id: input.id,
      note_id: input.noteId ?? null,
      transcript: input.transcript,
      seconds,
      duration_seconds: seconds,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
  return input.id;
}
