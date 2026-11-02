// Cross-device Ask history. The database owns each conversation and its turns;
// only the last 40 turns are sent to the model (ask-model.ts).
import { assistantContent, type AskMode, type AskReply, type AskTurn } from "./ask-model";
import { supabase } from "./supabase";

export interface AskConversation {
  id: string;
  title: string;
  initialMode: AskMode;
  noteId: string | null;
  createdAt: string;
  updatedAt: string;
}

type ConversationRow = {
  id: string;
  title: string;
  initial_mode: AskMode;
  note_id: string | null;
  created_at: string;
  updated_at: string;
};

const conversation = (row: ConversationRow): AskConversation => ({
  id: row.id,
  title: row.title,
  initialMode: row.initial_mode,
  noteId: row.note_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function askConversationTitle(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim();
  return clean.length > 70 ? `${clean.slice(0, 69).trimEnd()}…` : clean || "New conversation";
}

/** Newest first; a small page keeps the sidebar quick for heavy users. */
export async function listAskConversations(offset = 0, limit = 50): Promise<AskConversation[]> {
  const { data, error } = await supabase.from("ask_conversations")
    .select("id,title,initial_mode,note_id,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error("Couldn’t load Ask history.");
  return (data ?? []).map((row) => conversation(row as ConversationRow));
}

export async function latestAskConversation(noteId?: string | null): Promise<AskConversation | null> {
  let query = supabase.from("ask_conversations")
    .select("id,title,initial_mode,note_id,created_at,updated_at")
    .order("updated_at", { ascending: false }).limit(1);
  if (noteId) query = query.eq("note_id", noteId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Couldn’t load Ask history.");
  return data ? conversation(data as ConversationRow) : null;
}

export async function createAskConversation(title: string, initialMode: AskMode, noteId: string | null): Promise<AskConversation> {
  const { data, error } = await supabase.from("ask_conversations")
    .insert({ title: askConversationTitle(title), initial_mode: initialMode, note_id: noteId })
    .select("id,title,initial_mode,note_id,created_at,updated_at").single();
  if (error || !data) throw new Error("Couldn’t start this conversation.");
  return conversation(data as ConversationRow);
}

export async function linkAskConversationToNote(conversationId: string, noteId: string): Promise<void> {
  const { error } = await supabase.from("ask_conversations").update({ note_id: noteId }).eq("id", conversationId);
  if (error) throw new Error("Couldn’t link this conversation to the Note.");
}

/** A retry uses the same client id, so it cannot duplicate the user's turn. */
export async function saveAskTurn(conversationId: string, turn: AskTurn): Promise<void> {
  const { error } = await supabase.from("ask_chat_turns").upsert({
    conversation_id: conversationId,
    client_turn_id: turn.id,
    role: turn.role,
    mode: turn.mode,
    draft_now: turn.role === "user" && turn.draftNow === true,
    content: turn.role === "user" ? turn.text : assistantContent(turn.reply),
  }, { onConflict: "conversation_id,client_turn_id", ignoreDuplicates: true });
  if (error) throw new Error("Couldn’t save this conversation.");
}

export async function loadAskTurns(conversationId: string, before?: string): Promise<{ turns: AskTurn[]; before: string | null }> {
  // Load one page of recent history. Older pages are requested only on demand.
  let query = supabase.from("ask_chat_turns")
    .select("client_turn_id,role,mode,draft_now,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .limit(200);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw new Error("Couldn’t open this conversation.");
  const rows = data ?? [];
  const turns = rows.reverse().flatMap((row): AskTurn[] => {
    const mode: AskMode = row.mode === "note" ? "note" : "how_to_say";
    if (row.role === "user") return [{ id: row.client_turn_id, role: "user", text: row.content, mode, draftNow: row.draft_now }];
    try {
      const reply = JSON.parse(row.content)?.reply as AskReply | undefined;
      return reply ? [{ id: row.client_turn_id, role: "assistant", reply, mode }] : [];
    } catch { return []; }
  });
  return { turns, before: rows.length === 200 ? rows[0]?.created_at ?? null : null };
}

export async function deleteAskConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.from("ask_conversations").delete().eq("id", conversationId);
  if (error) throw new Error("Couldn’t delete this conversation.");
}
