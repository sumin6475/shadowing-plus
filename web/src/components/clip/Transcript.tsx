"use client";

import { useEffect, useRef } from "react";
import type { Segment } from "@/lib/types";
import { BookmarkIcon, DotsIcon, SearchIcon } from "./Icons";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  segments: Segment[];
  currentIndex: number;
  showTranslation: boolean;
  bookmarkedIds: Set<string>;
  onSelect: (index: number) => void;
  onToggleBookmark: (segmentId: string) => void;
}

export default function Transcript({
  segments,
  currentIndex,
  showTranslation,
  bookmarkedIds,
  onSelect,
  onToggleBookmark,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLDivElement>(".line.is-current");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  return (
    <aside className="transcript">
      <div className="transcript-head">
        <div className="transcript-title">
          Transcript · {segments.length} lines
        </div>
        <div className="transcript-actions">
          <button
            type="button"
            title="Search (coming soon)"
            aria-label="Search"
            disabled
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            title="More (coming soon)"
            aria-label="More"
            disabled
          >
            <DotsIcon />
          </button>
        </div>
      </div>
      <div className="transcript-list" ref={listRef}>
        {segments.map((seg, i) => {
          const isCurrent = i === currentIndex;
          const isBookmarked = bookmarkedIds.has(seg.id);
          return (
            <div
              key={seg.id}
              className={"line" + (isCurrent ? " is-current" : "")}
              onClick={() => onSelect(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(i);
                }
              }}
            >
              <div className="line-time">{formatTime(seg.start_time)}</div>
              <div>
                <div className="line-en">{seg.text}</div>
                {seg.translation ? (
                  <div
                    className={
                      "line-ko" + (showTranslation ? "" : " is-hidden")
                    }
                  >
                    {seg.translation}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={"line-bookmark" + (isBookmarked ? " is-on" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(seg.id);
                }}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this line"}
              >
                <BookmarkIcon />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
