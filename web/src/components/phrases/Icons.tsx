// Small stroke icons for the Phrase Bank surface. Self-contained (16px, inherit
// currentColor) so the page has no cross-component icon dependency.

type P = { width?: number; height?: number };
const base = (w = 16, h = 16) => ({
  width: w,
  height: h,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const PlayIcon = ({ width, height }: P) => (
  <svg {...base(width ?? 14, height ?? 14)}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" /></svg>
);
export const NoteIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M4 5h16M4 12h16M4 19h10" /></svg>
);
export const PencilIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const DrillIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 4v5h5" /></svg>
);
// Repeat / practice-again glyph (↻) — used for "Practice in context".
export const ReplayIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M21 12a9 9 0 1 1-2.6-6.36" /><path d="M21 3v5h-5" /></svg>
);
export const BookmarkIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" /></svg>
);
export const TrashIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
);
export const CheckIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M20 6 9 17l-5-5" /></svg>
);
export const PlusIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M12 5v14M5 12h14" /></svg>
);
export const SearchIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
);
export const UploadIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M12 15V3m0 0 4 4m-4-4L8 7" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
);
export const LibraryIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M4 5v14M9 5v14M14 6l4 13" /><rect x="2" y="5" width="2" height="14" /></svg>
);
export const CloseIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const ChevronDownIcon = ({ width, height }: P) => (
  <svg {...base(width ?? 14, height ?? 14)}><path d="m6 9 6 6 6-6" /></svg>
);
export const MicIcon = ({ width, height }: P) => (
  <svg {...base(width, height)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0" /><path d="M12 17v4M9 21h6" /></svg>
);
