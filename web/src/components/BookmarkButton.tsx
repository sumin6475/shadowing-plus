"use client";

interface BookmarkButtonProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}

export default function BookmarkButton({
  active,
  onClick,
  className = "",
}: BookmarkButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 p-1 rounded transition-colors ${
        active
          ? "text-primary"
          : "text-transparent group-hover:text-muted-foreground"
      } hover:text-primary ${className}`}
      aria-label={active ? "Remove bookmark" : "Add bookmark"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 2.5h10v12L8 11l-5 3.5z" />
      </svg>
    </button>
  );
}
