import type { Folder } from "@/lib/types";

export function sortFolders(folders: Folder[]): Folder[] {
  return [...folders].sort((a, b) => {
    if (a.position !== b.position) return (a.position ?? 0) - (b.position ?? 0);
    return a.created_at.localeCompare(b.created_at);
  });
}

export function nextFolderPosition(folders: Folder[]): number {
  if (folders.length === 0) return 0;
  return Math.max(...folders.map((f) => f.position ?? 0)) + 1;
}

/** Move `fromId` to `toId`'s slot and reindex `position` 0..n-1. */
export function reorderFolders(
  folders: Folder[],
  fromId: string,
  toId: string,
): Folder[] {
  const sorted = sortFolders(folders);
  const from = sorted.findIndex((f) => f.id === fromId);
  const to = sorted.findIndex((f) => f.id === toId);
  if (from < 0 || to < 0 || from === to) {
    return sorted.map((f, i) => ({ ...f, position: i }));
  }
  const next = [...sorted];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((f, i) => ({ ...f, position: i }));
}
