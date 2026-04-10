"use client";

import { useRef, useEffect } from "react";
import type { Segment } from "@/lib/types";
import BookmarkButton from "./BookmarkButton";

interface SubtitlePanelProps {
  segments: Segment[];
  currentIndex: number;
  bookmarkedIds: Set<string>;
  showTranslation: boolean;
  onSegmentClick: (index: number) => void;
  onToggleBookmark: (segmentId: string) => void;
}

export default function SubtitlePanel({
  segments,
  currentIndex,
  bookmarkedIds,
  showTranslation,
  onSegmentClick,
  onToggleBookmark,
}: SubtitlePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const el = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      const offset = elRect.top - containerRect.top - containerRect.height / 3;
      container.scrollTo({ top: container.scrollTop + offset, behavior: "smooth" });
    }
  }, [currentIndex]);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto px-4 py-4">
      <div className="max-w-3xl mx-auto space-y-1">
        {segments.map((seg, i) => {
          const isActive = i === currentIndex;
          return (
            <div
              key={seg.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onSegmentClick(i)}
              className={`group flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-card border border-transparent"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-relaxed ${
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {seg.text}
                </p>
                {showTranslation && seg.translation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {seg.translation}
                  </p>
                )}
              </div>
              <BookmarkButton
                active={bookmarkedIds.has(seg.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(seg.id);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
