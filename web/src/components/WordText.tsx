"use client";

import { memo } from "react";
import type { WordEntry } from "@/lib/types";

interface WordTextProps {
  text: string;
  segmentStart: number;
  segmentEnd: number;
  words?: WordEntry[] | null;
  onWordClick?: (time: number) => void;
  /** Current playback time. If provided, words before this are "played". */
  currentTime?: number;
  /** Used when currentTime is undefined: true=all words played, false=none. */
  playedAll?: boolean;
  className?: string;
  /** Common per-word classes (font size etc) */
  baseWordClassName?: string;
  /** Class applied to played words */
  playedClassName?: string;
  /** Class applied to unplayed words */
  unplayedClassName?: string;
}

function stripPunctuation(s: string): string {
  return s.replace(/[.,!?;:'"()\-\[\]]/g, "").toLowerCase();
}

function WordText({
  text,
  segmentStart,
  segmentEnd,
  words,
  onWordClick,
  currentTime,
  playedAll,
  className = "",
  baseWordClassName = "",
  playedClassName = "text-foreground",
  unplayedClassName = "text-muted-foreground/40",
}: WordTextProps) {
  const tokens = text.split(/(\s+)/);
  const totalChars = text.length;
  const segDur = Math.max(0, segmentEnd - segmentStart);

  const vibeWords = (words ?? []).filter((w) => w.start !== undefined);
  let vibeIdx = 0;
  let charPos = 0;

  return (
    <span className={className}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) {
          const node = <span key={i}>{token}</span>;
          charPos += token.length;
          return node;
        }

        // Resolve timestamp: Vibe match or interpolation
        const tokenNorm = stripPunctuation(token);
        let timestamp: number | null = null;

        if (vibeIdx < vibeWords.length) {
          const candidate = vibeWords[vibeIdx];
          if (stripPunctuation(candidate.word) === tokenNorm) {
            timestamp = candidate.start ?? null;
            vibeIdx++;
          }
        }

        if (timestamp === null) {
          const ratio = totalChars > 0 ? charPos / totalChars : 0;
          timestamp = segmentStart + ratio * segDur;
        }

        // Decide played status
        const played =
          currentTime !== undefined ? timestamp <= currentTime : !!playedAll;

        const colorClass = played ? playedClassName : unplayedClassName;
        const isClickable = !!onWordClick;

        const node = (
          <span
            key={i}
            onClick={
              isClickable
                ? (e) => {
                    e.stopPropagation();
                    onWordClick(timestamp!);
                  }
                : undefined
            }
            className={`${baseWordClassName} ${colorClass} ${
              isClickable
                ? "cursor-pointer hover:bg-primary/15 rounded px-0.5 transition-colors"
                : ""
            }`}
          >
            {token}
          </span>
        );

        charPos += token.length;
        return node;
      })}
    </span>
  );
}

export default memo(WordText);
