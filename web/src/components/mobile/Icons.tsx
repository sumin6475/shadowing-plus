// Mobile-specific icons. Stroke pattern matches home/Icons.tsx (1.4–1.6px,
// currentColor). Re-exports the shared icons from home/Icons.tsx so mobile
// callers can import everything from one place.

import type { SVGProps } from "react";

export {
  SearchIcon,
  LibraryIcon,
  InboxIcon,
  BookmarkIcon,
  PlusIcon,
  UploadIcon,
  PlayIcon,
  DotsIcon,
  SortIcon,
  ChevronDownIcon,
} from "@/components/home/Icons";

const s14: SVGProps<SVGSVGElement> = {
  width: 14, height: 14, viewBox: "0 0 16 16",
  fill: "none", stroke: "currentColor", strokeWidth: 1.5,
  strokeLinecap: "round", strokeLinejoin: "round",
};
const s18: SVGProps<SVGSVGElement> = {
  width: 18, height: 18, viewBox: "0 0 16 16",
  fill: "none", stroke: "currentColor", strokeWidth: 1.5,
  strokeLinecap: "round", strokeLinejoin: "round",
};
const s20: SVGProps<SVGSVGElement> = {
  width: 20, height: 20, viewBox: "0 0 16 16",
  fill: "none", stroke: "currentColor", strokeWidth: 1.4,
  strokeLinecap: "round", strokeLinejoin: "round",
};

export function HamburgerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...s18} width="18" height="18" {...props}>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...s14} {...props}>
      <path d="M4 4l8 8M12 4l-8 8" strokeWidth={1.6} />
    </svg>
  );
}

export function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...s14} {...props}>
      <path d="M10 3L5 8l5 5" />
    </svg>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="4" y="3" width="2.4" height="10" rx="0.6" />
      <rect x="9.6" y="3" width="2.4" height="10" rx="0.6" />
    </svg>
  );
}

export function PrevIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M11 3.5v9L4 8z" />
      <rect x="3" y="3" width="1.2" height="10" rx="0.4" />
    </svg>
  );
}

export function NextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M5 3.5v9l7-4.5z" />
      <rect x="11.8" y="3" width="1.2" height="10" rx="0.4" />
    </svg>
  );
}

/* Rotate-cw / rotate-ccw with an upright "3" digit. No flipping — keeps
   the numeral readable in both directions. */
export function Skip3ForwardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 11-3.2-6.9L21 8" />
      <path d="M21 3v5h-5" />
      <text
        x="11.5"
        y="16.5"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontSize="9"
        fontWeight="600"
        fill="currentColor"
        stroke="none"
      >
        3
      </text>
    </svg>
  );
}

export function Skip3BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 103.2-6.9L3 8" />
      <path d="M3 3v5h5" />
      <text
        x="12.5"
        y="16.5"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontSize="9"
        fontWeight="600"
        fill="currentColor"
        stroke="none"
      >
        3
      </text>
    </svg>
  );
}

export function ShadowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.5 8c1-2.5 2.4-3.5 4.5-3.5S11.5 5.5 12.5 8" />
      <path d="M3.5 8c1 2.5 2.4 3.5 4.5 3.5S11.5 10.5 12.5 8" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function TransIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 4.5h5M4.5 4.5v8M3 8l3 4.5M9.5 6.5h4l-2 6.5L9.5 6.5z" />
    </svg>
  );
}

export function ABIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 11.5L4.6 5.5l2.1 6M3.2 9.5h2.8" />
      <path d="M8.5 5.5h2.4a1.2 1.2 0 010 2.4H8.5zm0 2.4h2.7a1.3 1.3 0 010 2.6H8.5z" />
    </svg>
  );
}

export function LoopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 5.5h7a3 3 0 010 6H5.5" />
      <path d="M5 3.5L3 5.5l2 2" />
      <path d="M11 13.5l2-2-2-2" />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 8s2.2-3.5 6-3.5S14 8 14 8s-2.2 3.5-6 3.5S2 8 2 8z" />
      <circle cx="8" cy="8" r="1.6" />
    </svg>
  );
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 8s2.2-3.5 6-3.5S14 8 14 8s-2.2 3.5-6 3.5S2 8 2 8z" />
      <path d="M3 3l10 10" />
    </svg>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="8" r="1.8" />
      <path d="M8 2v1.6M8 12.4V14M2 8h1.6M12.4 8H14M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1M12.2 12.2l-1.1-1.1M4.9 4.9L3.8 3.8" />
    </svg>
  );
}

export function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 2.5h7l3 3v8H3z" />
      <path d="M10 2.5v3h3" />
      <path d="M5 7.5h6M5 10h6" />
    </svg>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 4.5h10M6 4.5V3.2c0-.4.3-.7.7-.7h2.6c.4 0 .7.3.7.7V4.5" />
      <path d="M4.5 4.5l.7 8.5h5.6l.7-8.5" />
    </svg>
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...s20} {...props}>
      <path d="M2.5 7L8 2.5 13.5 7v6.2a.8.8 0 01-.8.8H3.3a.8.8 0 01-.8-.8z" />
    </svg>
  );
}

export function PracticeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...s20} {...props}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  );
}

export function BookmarkFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M4 3v11l4-2.5 4 2.5V3z" />
    </svg>
  );
}
