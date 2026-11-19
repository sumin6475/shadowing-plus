import { supabase } from "./supabase";
import { loadNotes, loadPhraseBank } from "./mvp";
export type Source = "Phrase" | "Studio" | "My Sentences";
/** The two card colors the home already draws: the Studio card's midnight
 *  gradient and the Today's phrases card's paper white. */
export type RoutineTone = "midnight" | "paper";
export type Routine = {
  id: string;
  source: Source;
  name: string;
  /** Missing on cards saved before the choice existed; see `toneOf`. */
  tone?: RoutineTone;
  count: number;
  days: number;
  random: boolean;
  noteIds: string[];
  folder: string;
};
export type PracticeItem = {
  id: string;
  text: string;
  meaning: string;
  created: string;
  notes: string[];
};
export type PersonalSentence = {
  id: string;
  text: string;
  meaning: string;
  created_at: string;
  note_id: string | null;
};
/** Adds a sentence to My Sentences (from Ask). The same sentence is kept once:
 *  saving it again reports "exists" instead of adding a second row. */
export async function savePersonalSentence(
  sentence: { text: string; meaning: string },
  noteId: string | null = null,
): Promise<"saved" | "exists"> {
  const text = sentence.text.trim();
  const meaning = sentence.meaning.trim();
  if (!text || !meaning) throw new Error("This sentence can’t be saved without its meaning.");
  const { data: existing, error: findError } = await supabase
    .from("personal_sentences").select("id").eq("text", text).limit(1);
  if (findError) throw new Error("Couldn’t save to My Sentences. Try again.");
  if (existing?.length) return "exists";
  const { error } = await supabase.from("personal_sentences").insert({ text, meaning, note_id: noteId });
  if (error) throw new Error("Couldn’t save to My Sentences. Try again.");
  return "saved";
}
export async function sentences(): Promise<PersonalSentence[]> {
  const rows: PersonalSentence[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase
      .from("personal_sentences")
      .select("id,text,meaning,created_at,note_id")
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function pickRoutine(card: Routine): Promise<PracticeItem[]> {
  const notes = await loadNotes();
  const scoped = new Set(
    notes
      .filter(
        (n) =>
          (!card.folder || n.folder_id === card.folder) &&
          (!card.noteIds.length || card.noteIds.includes(n.id)),
      )
      .map((n) => n.id),
  );
  let items: PracticeItem[];
  if (card.source === "Studio")
    items = notes
      .filter((n) => n.body.trim())
      .map((n) => ({
        id: n.id,
        text: n.title,
        meaning: n.body,
        created: n.created_at,
        notes: [n.id],
      }));
  else if (card.source === "My Sentences")
    items = (await sentences()).map((s) => ({
      id: s.id,
      text: s.text,
      meaning: s.meaning,
      created: s.created_at,
      notes: s.note_id ? [s.note_id] : [],
    }));
  else {
    const linked = new Map<string, string[]>();
    if (card.folder || card.noteIds.length) {
      const { data, error } = await supabase
        .from("routine_phrase_notes")
        .select("phrase_id,note_id")
        .in("note_id", [...scoped]);
      if (error) throw error;
      for (const row of data)
        linked.set(row.phrase_id, [
          ...(linked.get(row.phrase_id) ?? []),
          row.note_id,
        ]);
    }
    items = (await loadPhraseBank()).map((p) => ({
      id: p.id,
      text: p.text,
      meaning: p.translation ?? "",
      created: p.createdAt,
      notes: linked.get(p.id) ?? [],
    }));
  }
  items = items
    .filter(
      (i) =>
        (!card.days ||
          Date.parse(i.created) >= Date.now() - card.days * 86400000) &&
        (!(card.folder || card.noteIds.length) ||
          i.notes.some((id) => scoped.has(id))),
    )
    .sort((a, b) => a.created.localeCompare(b.created));
  if (card.random)
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  return items.slice(0, card.count);
}
/** A card's color. Cards saved before the choice existed keep the look of
 *  the built-in card they came from, and are paper otherwise. */
export function toneOf(card: Pick<Routine, "id" | "tone">): RoutineTone {
  return card.tone ?? (card.id === "studio" ? "midnight" : "paper");
}
