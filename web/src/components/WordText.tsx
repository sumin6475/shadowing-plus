"use client";

import type { WordEntry } from "@/lib/types";

interface WordTextProps {
  words: WordEntry[];
  onWordClick?: (time: number) => void;
  className?: string;
  wordClassName?: string;
}

export default function WordText({
  words,
  onWordClick,
  className = "",
  wordClassName = "",
}: WordTextProps) {
  return (
    <span className={className}>
      {words.map((w, i) => {
        const isClickable = w.start !== undefined && onWordClick;
        return (
          <span key={i} className="relative inline group/word">
            <span
              onClick={
                isClickable
                  ? (e) => {
                      e.stopPropagation();
                      onWordClick(w.start!);
                    }
                  : undefined
              }
              className={`${wordClassName} ${
                isClickable
                  ? "cursor-pointer hover:bg-primary/15 rounded px-0.5 transition-colors"
                  : ""
              }`}
            >
              {w.word}
            </span>
            {w.meaning && (
              <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 hidden group-hover/word:block whitespace-nowrap bg-card border border-border shadow-sm rounded px-2 py-1 text-xs text-foreground">
                {w.meaning}
              </span>
            )}
            {i < words.length - 1 && " "}
          </span>
        );
      })}
    </span>
  );
}
