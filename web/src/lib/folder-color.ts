// Maps a folder to a CSS color. If the folder has its own `color`, use it;
// otherwise pick deterministically from a small warm palette so colors stay
// stable across reloads without a DB backfill.

import type { Folder } from "./types";

const FALLBACK_PALETTE = [
  "oklch(0.62 0.155 38)",   // terracotta
  "oklch(0.58 0.165 258)",  // cobalt
  "oklch(0.55 0.10 155)",   // moss
  "oklch(0.58 0.18 290)",   // iris
  "oklch(0.65 0.13 75)",    // amber
  "oklch(0.60 0.14 340)",   // rose
];

export const FOLDER_COLOR_OPTIONS = FALLBACK_PALETTE;

function hashStringToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function folderColor(folder: Pick<Folder, "id" | "color">): string {
  if (folder.color) return folder.color;
  return FALLBACK_PALETTE[hashStringToInt(folder.id) % FALLBACK_PALETTE.length];
}
