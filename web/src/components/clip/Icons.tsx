// Stroke icon set for the clip page. Ported from the design handoff
// (shadowing-plus/project/icons.jsx). 1.6px stroke, currentColor.

import type { SVGProps } from "react";

const stroke: SVGProps<SVGSVGElement> = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M9.5 3.5L5 8l4.5 4.5" />
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

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M2.5 8s2-4 5.5-4c1.2 0 2.2.5 3 1.2M13.5 8s-2 4-5.5 4c-1.2 0-2.2-.5-3-1.2" />
      <path d="M6.5 6.5a2 2 0 003 2.6" />
      <path d="M2.5 2.5L13.5 13.5" />
    </svg>
  );
}

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

export function PrevIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M10 4L6 8l4 4" />
    </svg>
  );
}

export function NextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function ReplayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <path d="M3.5 8a4.5 4.5 0 109-.3" />
      <path d="M12.6 6V3.5M12.6 6h-2.5" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" {...stroke} {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L13 13" />
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
