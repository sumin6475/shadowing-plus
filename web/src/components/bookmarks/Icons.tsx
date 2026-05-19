// Stroke icon set for the bookmarks page. Ported from the design handoff.

import type { SVGProps } from "react";

const stroke: SVGProps<SVGSVGElement> = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M5 3.5v9l7-4.5z" />
    </svg>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="4" y="3" width="3" height="10" rx="0.5" />
      <rect x="9" y="3" width="3" height="10" rx="0.5" />
    </svg>
  );
}

export function DotsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <circle cx="4" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12" cy="8" r="1.2" />
    </svg>
  );
}

export function SortIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M3 4.5h10M5 8h6M7 11.5h2" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function DrillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v2M8 12.5v2M14.5 8h-2M1.5 8h2" />
    </svg>
  );
}

export function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M3 2.5h7l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1v-10a1 1 0 011-1z" />
      <path d="M5 7h6M5 9.5h4" />
    </svg>
  );
}

export function BookmarkFillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" {...props}>
      <path d="M9 5a1 1 0 011-1h12a1 1 0 011 1v22l-7-4.5L9 27V5z" />
    </svg>
  );
}
