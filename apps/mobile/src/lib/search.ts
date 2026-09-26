// search.ts — global Search (opened by pulling down at the top of Phrases or
// Studio). Loads the learner's phrases and notes once, then matches on-device
// as they type; the scoring lives in search-model.ts.
import { loadNotes, loadPhraseBank, notePreview, type MvpPhrase, type Note } from "./mvp";
import { rank, scoreMatch } from "./search-model";

export interface SearchIndex {
  phrases: MvpPhrase[];
  notes: Note[];
}

export interface SearchResults {
  phrases: MvpPhrase[];
  notes: Note[];
  total: number;
}

export async function loadSearchIndex(): Promise<SearchIndex> {
  const [phrases, notes] = await Promise.all([loadPhraseBank(), loadNotes()]);
  // Newest first, so equal scores surface the most recent.
  phrases.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { phrases, notes };
}

export function searchIndex(index: SearchIndex, query: string): SearchResults {
  const phrases = rank(index.phrases, (p) =>
    scoreMatch(query, p.text, [p.translation, p.source]),
  );
  const notes = rank(index.notes, (n) =>
    scoreMatch(query, n.title || notePreview(n.body), [n.body]),
  );
  return { phrases, notes, total: phrases.length + notes.length };
}
