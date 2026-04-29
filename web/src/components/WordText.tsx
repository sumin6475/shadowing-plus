"use client";

import type { WordEntry } from "@/lib/types";

interface WordTextProps {
  text: string;
  segmentStart: number;
  segmentEnd: number;
  words?: WordEntry[] | null;
  onWordClick?: (time: number) => void;
  className?: string;
  wordClassName?: string;
}

function stripPunctuation(s: string): string {
  return s.replace(/[.,!?;:'"()\-\[\]]/g, "").toLowerCase();
}

export default function WordText({
  text,
  segmentStart,
  segmentEnd,
  words,
  onWordClick,
  className = "",
  wordClassName = "",
}: WordTextProps) {
  const tokens = text.split(/(\s+)/);
  const totalChars = text.length;
  const segDur = Math.max(0, segmentEnd - segmentStart);

  // Pointer into the Vibe words array — consumed in order as we walk text tokens
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

        // Try to match this token to next Vibe word (positional, normalized)
        const tokenNorm = stripPunctuation(token);
        let timestamp: number | null = null;

        if (vibeIdx < vibeWords.length) {
          const candidate = vibeWords[vibeIdx];
          if (stripPunctuation(candidate.word) === tokenNorm) {
            timestamp = candidate.start ?? null;
            vibeIdx++;
          }
        }

        // Fallback: linear interpolation by character position
        if (timestamp === null) {
          const ratio = totalChars > 0 ? charPos / totalChars : 0;
          timestamp = segmentStart + ratio * segDur;
        }

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
            className={`${wordClassName} ${
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
