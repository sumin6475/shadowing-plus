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

export function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 1.6v1.6M8 12.8v1.6M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6L3.5 3.5" />
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

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3.5 13c0-2.2 2-3.5 4.5-3.5s4.5 1.3 4.5 3.5" />
    </svg>
  );
}

export function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M2.5 2.5v11h11" />
      <path d="M5 10.5V8M8 10.5V5.5M11 10.5V7" />
    </svg>
  );
}

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8h11M8 2.5c1.6 1.5 2.4 3.4 2.4 5.5S9.6 12 8 13.5C6.4 12 5.6 10.1 5.6 8S6.4 4 8 2.5z" />
    </svg>
  );
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M8 2.2c-2 0-3.3 1.5-3.3 3.4 0 2.7-1 3.7-1.4 4.1-.2.2-.1.6.2.6h9c.3 0 .4-.4.2-.6-.4-.4-1.4-1.4-1.4-4.1 0-1.9-1.3-3.4-3.3-3.4z" />
      <path d="M6.6 12.4a1.5 1.5 0 002.8 0" />
    </svg>
  );
}

export function SignOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M6 3.5H4a1 1 0 00-1 1v7a1 1 0 001 1h2" />
      <path d="M9.5 5.5L12 8l-2.5 2.5M12 8H6" />
    </svg>
  );
}
