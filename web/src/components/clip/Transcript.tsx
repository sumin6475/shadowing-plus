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
    const container = listRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLDivElement>(".line.is-current");
    if (!el) return;

    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();

    const fullyVisible = eRect.top >= cRect.top && eRect.bottom <= cRect.bottom;
    if (fullyVisible) return;

    const top = container.scrollTop + (eRect.top - cRect.top);
    container.scrollTo({ top, behavior: "smooth" });
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
              onClick={(e) => {
                onSelect(i);
                // Drop focus after a mouse/touch selection. The row is a
                // focusable role="button", so a pointer click otherwise leaves
                // it as document.activeElement — then the next Space/Enter fires
                // BOTH the global player shortcut and this row's own onKeyDown,
                // re-seeking to the selected line (the "focus stuck / box fires
                // twice" bug). Keyboard users who Tab here keep focus and the
                // Enter/Space handler below, so a11y navigation is unaffected.
                e.currentTarget.blur();
              }}
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
                <div className="line-en" data-seg-id={seg.id}>{seg.text}</div>
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
                  // Drop focus after a pointer click. stopPropagation above keeps
                  // the row's own blur from firing, so without this the bookmark
                  // button stays document.activeElement — then Space activates
                  // the button (re-toggling the bookmark) instead of reaching the
                  // global Play/Pause shortcut. a/s/d have no button default so
                  // they kept working; Space didn't. e.detail === 0 means the
                  // click came from a keyboard (Enter/Space), where we keep focus
                  // so a11y navigation is unaffected — matching the row above.
                  if (e.detail > 0) e.currentTarget.blur();
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
