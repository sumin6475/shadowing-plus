// Durable context for a speaking Note. Every row is scoped by Supabase RLS.
// A folder organizes notes; only facts explicitly confirmed here become
// shared context for its notes. Pasted source text is never itself a draft.
import { supabase } from "./supabase";
import { assistantContent, type AskTurn, type AskReply, type AskMode } from "./ask-model";

export interface NoteFolder {
  id: string;
  name: string;
  updated_at: string;
}
export interface NoteFact {
  id: string;
  folder_id: string;
  text: string;
  source_excerpt: string;
  source_id: string | null;
}
export interface NoteVersion {
  id: string;
  note_id: string;
  title: string;
  body: string;
  origin: "ask" | "practice" | "manual";
  source_session_id: string | null;
  created_at: string;
}
export interface NotePracticeMoment {
  id: string;
  note_version_id: string | null;
  created_at: string;
}

const failed = (error: { message: string } | null, fallback: string): never => {
  if (__DEV__ && error) console.warn("note-growth:", error.message);
  throw new Error(fallback);
};

export async function loadNoteFolders(): Promise<NoteFolder[]> {
  const { data, error } = await supabase.from("note_folders").select("id,name,updated_at").order("updated_at", { ascending: false });
  if (error) failed(error, "Couldn’t load folders.");
  return data ?? [];
}

export async function createNoteFolder(name: string): Promise<NoteFolder> {
  const clean = name.trim().slice(0, 80);
  if (!clean) throw new Error("Name the folder first.");
  const { data, error } = await supabase.from("note_folders").insert({ name: clean }).select("id,name,updated_at").single();
  if (error || !data) return failed(error, "Couldn’t create the folder.");
  return data;
}

export async function moveNoteToFolder(noteId: string, folderId: string | null): Promise<void> {
  const { data, error } = await supabase.from("notes").update({ folder_id: folderId }).eq("id", noteId).select("id").maybeSingle();
  if (error || !data) failed(error, "Couldn’t move the note.");
}

export async function loadNoteFacts(folderId: string): Promise<NoteFact[]> {
  const { data, error } = await supabase.from("note_facts").select("id,folder_id,text,source_excerpt,source_id").eq("folder_id", folderId).order("confirmed_at");
  if (error) failed(error, "Couldn’t load shared context.");
  return data ?? [];
}

export async function addConfirmedFact(folderId: string, text: string, source?: { id: string; excerpt: string }): Promise<NoteFact> {
  const clean = text.trim().slice(0, 800);
  if (!clean) throw new Error("Write a fact first.");
  const { data, error } = await supabase.from("note_facts").insert({
    folder_id: folderId, text: clean, source_id: source?.id ?? null, source_excerpt: source?.excerpt ?? "",
  }).select("id,folder_id,text,source_excerpt,source_id").single();
  if (error || !data) return failed(error, "Couldn’t save this fact.");
  return data;
}

export async function addPastedSource(folderId: string, title: string, content: string): Promise<string> {
  const clean = content.trim();
  if (!clean) throw new Error("Paste the source first.");
  const { data, error } = await supabase.from("note_sources").insert({
    folder_id: folderId, title: title.trim().slice(0, 120), content: clean.slice(0, 100000),
  }).select("id").single();
  if (error || !data) return failed(error, "Couldn’t save the source.");
  return data.id;
}

export async function loadNoteTurns(noteId: string): Promise<AskTurn[]> {
  const { data, error } = await supabase.from("note_chat_turns")
    .select("client_turn_id,role,content,draft_now").eq("note_id", noteId)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(500);
  if (error) failed(error, "Couldn’t load this conversation.");
  return (data ?? []).reverse().flatMap((row): AskTurn[] => {
    if (row.role === "user") return [{ id: row.client_turn_id, role: "user" as const, text: row.content, mode: "note" as AskMode, draftNow: row.draft_now }];
    try {
      const reply = JSON.parse(row.content)?.reply as AskReply | undefined;
      return reply ? [{ id: row.client_turn_id, role: "assistant" as const, reply, mode: "note" as AskMode }] : [];
    } catch { return []; }
  });
}

export async function saveNoteTurn(noteId: string, turn: AskTurn): Promise<void> {
  if (turn.mode !== "note") return;
  const { error } = await supabase.from("note_chat_turns").upsert({
    note_id: noteId,
    client_turn_id: turn.id,
    role: turn.role,
    draft_now: turn.role === "user" && turn.draftNow === true,
    content: turn.role === "user" ? turn.text : assistantContent(turn.reply),
  }, { onConflict: "note_id,client_turn_id", ignoreDuplicates: true });
  if (error) failed(error, "Couldn’t save this conversation.");
}

export async function loadRecentNoteConversation(): Promise<string | null> {
  const { data, error } = await supabase.from("note_chat_turns")
    .select("note_id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) failed(error, "Couldn’t find the recent conversation.");
  return data?.note_id ?? null;
}

/** The RPC updates the Note and writes an immutable version in one transaction. */
export async function applyNoteVersion(
  noteId: string, title: string, body: string, origin: NoteVersion["origin"], sourceSessionId?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("apply_note_version", {
    p_note_id: noteId, p_title: title, p_body: body, p_origin: origin, p_source_session_id: sourceSessionId ?? null,
  });
  if (error || !data) failed(error, "Couldn’t save this version.");
  return data as string;
}

/** Captures the exact Note shown when a speaking session began. */
export async function snapshotNoteVersion(noteId: string, title: string, body: string): Promise<string> {
  const { data, error } = await supabase.from("note_versions").insert({
    note_id: noteId, title, body, origin: "manual",
  }).select("id").single();
  if (error || !data) return failed(error, "Couldn’t record the practice version.");
  return data.id;
}

export async function loadNotePracticeHistory(noteId: string): Promise<NotePracticeMoment[]> {
  const { data, error } = await supabase.from("talk_sessions")
    .select("id,note_version_id,created_at").eq("note_id", noteId)
    .order("created_at", { ascending: false }).limit(20);
  if (error) failed(error, "Couldn’t load practice history.");
  return data ?? [];
}

export async function loadNoteVersions(noteId: string): Promise<NoteVersion[]> {
  const { data, error } = await supabase.from("note_versions")
    .select("id,note_id,title,body,origin,source_session_id,created_at")
    .eq("note_id", noteId).order("created_at", { ascending: false });
  if (error) failed(error, "Couldn’t load versions.");
  return data ?? [];
}
