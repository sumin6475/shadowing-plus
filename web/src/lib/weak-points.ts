export const WEAK_POINT_CATEGORIES = [
  "sounds",
  "intonation",
  "stressed word",
  "new words",
  "connected speech",
  "R's",
  "word endings",
  "reductions",
] as const;

export type WeakPointCategory = (typeof WEAK_POINT_CATEGORIES)[number];

export interface WeakPoint {
  id: string;
  user_id?: string;
  text: string;
  category: string | null;
  completed: boolean;
  starred: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface WeakPointPatch {
  text?: string;
  category?: string | null;
  completed?: boolean;
  starred?: boolean;
  position?: number;
}

export function normalizeCategory(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed ? trimmed.slice(0, 40) : null;
}

export function sortWeakPoints(items: WeakPoint[]): WeakPoint[] {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    if (a.position !== b.position) return a.position - b.position;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function starredWeakPoints(items: WeakPoint[]): WeakPoint[] {
  return sortWeakPoints(items.filter((item) => item.starred));
}

export interface WeakPointGroup {
  category: string | null;
  items: WeakPoint[];
}

export function groupWeakPoints(items: WeakPoint[]): WeakPointGroup[] {
  const sorted = sortWeakPoints(items);
  const map = new Map<string, WeakPoint[]>();
  const uncategorized: WeakPoint[] = [];
  for (const item of sorted) {
    const key = item.category?.trim() || "";
    if (!key) {
      uncategorized.push(item);
      continue;
    }
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  const groups: WeakPointGroup[] = [...map.entries()].map(([category, rows]) => ({
    category,
    items: rows,
  }));
  groups.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
  if (uncategorized.length > 0) {
    groups.push({ category: null, items: uncategorized });
  }
  return groups;
}

export function nextWeakPointPosition(items: WeakPoint[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((item) => item.position ?? 0)) + 1;
}
