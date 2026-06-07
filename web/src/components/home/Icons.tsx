// Stroke icon set for the home page. Ported from the design handoff
// (shadowing-plus/project/icons.jsx). 1.6px stroke, currentColor.

import type { SVGProps } from "react";

const stroke: SVGProps<SVGSVGElement> = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L13 13" />
    </svg>
  );
}

export function LibraryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <rect x="2.5" y="3" width="2.5" height="10" rx="0.5" />
      <rect x="6.25" y="3" width="2.5" height="10" rx="0.5" />
      <path d="M10.5 3.5l2.4.6-2 9.3-2.4-.6z" />
    </svg>
  );
}

export function InboxIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M2.5 9l1.5-5h8l1.5 5" />
      <path d="M2.5 9v3.5h11V9" />
      <path d="M2.5 9h3l.8 1.5h3.4L10.5 9h3" />
    </svg>
  );
}

export function BookmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M4 3v11l4-2.5 4 2.5V3z" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M8 11V3M5 6l3-3 3 3" />
      <path d="M3 12v1.5h10V12" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      strokeWidth={1.2}
      fill="currentColor"
      {...props}
    >
      <path d="M5 3.5v9l7-4.5z" />
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

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" {...stroke} {...props}>
      <path d="M2.5 6.2l2.4 2.4L9.8 3.5" />
    </svg>
  );
}

export function CircleDashedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="8" cy="8" r="6" strokeDasharray="2 2" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5" />
      <path d="M4.5 4.5l.7 8.4a1 1 0 001 .9h3.6a1 1 0 001-.9l.7-8.4" />
      <path d="M6.7 7v4.5M9.3 7v4.5" />
    </svg>
  );
}

export function DrillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  );
}

export function UndoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M3 8a4.5 4.5 0 109-2.7" />
      <path d="M2.5 3v3h3" />
    </svg>
  );
}
