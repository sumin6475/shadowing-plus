"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Segment } from "@/lib/types";
import { isTranscriptLineVisible } from "@/lib/transcript-filter";
import { BookmarkIcon, SearchIcon } from "./Icons";
import TranscriptMenu from "./TranscriptMenu";

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
  title: string;
  targetLang: string;
  englishOnly: boolean;
  onEnglishOnlyChange: (next: boolean) => void;
}

export default function Transcript({
  segments,
  currentIndex,
  showTranslation,
  bookmarkedIds,
  onSelect,
  onToggleBookmark,
  title,
  targetLang,
  englishOnly,
  onEnglishOnlyChange,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);

  const visible = useMemo(
    () =>
      segments
        .map((seg, index) => ({ seg, index }))
        .filter(({ seg }) =>
          isTranscriptLineVisible(seg, { query, bookmarksOnly, bookmarkedIds }),
        ),
    [segments, query, bookmarksOnly, bookmarkedIds],
  );

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
  }, [currentIndex, visible]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const filtered = query.trim().length > 0 || bookmarksOnly;
  const countLabel = filtered
    ? `${visible.length} of ${segments.length} lines`
    : `${segments.length} lines`;

  return (
    <aside className="transcript">
      <div className="transcript-head">
        <div className="transcript-title">Transcript · {countLabel}</div>
        <div className="transcript-actions">
          <button
            type="button"
            title={bookmarksOnly ? "Show all lines" : "Show bookmarked lines"}
            aria-label={bookmarksOnly ? "Show all lines" : "Filter to bookmarked lines"}
            aria-pressed={bookmarksOnly}
            className={bookmarksOnly ? "is-active" : ""}
            onClick={() => setBookmarksOnly((v) => !v)}
          >
            <BookmarkIcon />
          </button>
          <button
            type="button"
            title="Search transcript"
            aria-label="Search transcript"
            aria-pressed={searchOpen || !!query.trim()}
            className={searchOpen || query.trim() ? "is-active" : ""}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <SearchIcon />
          </button>
          <TranscriptMenu
            title={title}
            targetLang={targetLang}
            segments={segments}
            englishOnly={englishOnly}
            onEnglishOnlyChange={onEnglishOnlyChange}
          />
        </div>
      </div>
      {searchOpen && (
        <div className="transcript-search">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (query) setQuery("");
                else setSearchOpen(false);
              }
            }}
            placeholder="Search text or translation"
            aria-label="Search transcript"
          />
          {query ? (
            <button
              type="button"
              className="transcript-search-clear"
              onClick={() => setQuery("")}
            >
              Clear
            </button>
          ) : null}
        </div>
      )}
      <div className="transcript-list" ref={listRef}>
        {visible.length === 0 ? (
          <p className="transcript-empty">
            {bookmarksOnly && !query.trim()
              ? "No bookmarked lines in this clip."
              : "No lines match this filter."}
          </p>
        ) : (
          visible.map(({ seg, index }) => {
            const isCurrent = index === currentIndex;
            const isBookmarked = bookmarkedIds.has(seg.id);
            return (
              <div
                key={seg.id}
                className={"line" + (isCurrent ? " is-current" : "")}
                onClick={(e) => {
                  onSelect(index);
                  e.currentTarget.blur();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(index);
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
                    if (e.detail > 0) e.currentTarget.blur();
                  }}
                  aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this line"}
                >
                  <BookmarkIcon />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
