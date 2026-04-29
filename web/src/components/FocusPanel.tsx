"use client";

import type { Segment } from "@/lib/types";
import type { AbRepeat } from "@/app/player/[videoId]/page";
import WordText from "./WordText";

interface FocusPanelProps {
  segment: Segment | null;
  showTranslation: boolean;
  abRepeat: AbRepeat | null;
  currentTime: number;
  onPrev: () => void;
  onRepeat: () => void;
  onNext: () => void;
  onToggleTranslation: () => void;
  onToggleAbRepeat: () => void;
  onWordClick?: (time: number) => void;
}

export default function FocusPanel({
  segment,
  showTranslation,
  abRepeat,
  currentTime,
  onPrev,
  onRepeat,
  onNext,
  onToggleTranslation,
  onToggleAbRepeat,
  onWordClick,
}: FocusPanelProps) {
  if (!segment) return null;

  return (
    <div className="bg-card border-t border-border px-4 py-4">
      <div className="max-w-3xl mx-auto">
        <p className="text-base font-medium text-center leading-relaxed mb-1">
          <WordText
            text={segment.text}
            segmentStart={segment.start_time}
            segmentEnd={segment.end_time}
            words={segment.words}
            onWordClick={onWordClick}
            currentTime={currentTime}
            baseWordClassName="text-base font-medium"
          />
        </p>
        {showTranslation && segment.translation && (
          <p className="text-sm text-muted-foreground text-center mb-3">
            {segment.translation}
          </p>
        )}
        {!showTranslation && <div className="mb-3" />}

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onPrev}
            className="px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:opacity-80 transition-opacity"
            aria-label="Previous (A)"
          >
            <span className="hidden sm:inline">A </span>
            <svg
              className="inline w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>

          <button
            onClick={onRepeat}
            className="px-6 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
            aria-label="Repeat (S)"
          >
            <span className="hidden sm:inline">S </span>
            <svg
              className="inline w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 8a6 6 0 0111.46-2.46M14 8a6 6 0 01-11.46 2.46" />
              <path d="M14 2v4h-4M2 14v-4h4" />
            </svg>
          </button>

          <button
            onClick={onNext}
            className="px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:opacity-80 transition-opacity"
            aria-label="Next (D)"
          >
            <svg
              className="inline w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
            <span className="hidden sm:inline"> D</span>
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            onClick={onToggleTranslation}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              showTranslation
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
            aria-label="Toggle translation"
          >
            Trans
          </button>

          <button
            onClick={onToggleAbRepeat}
            className={`px-3 py-2 text-sm rounded-lg transition-colors font-mono ${
              abRepeat
                ? abRepeat.b !== null
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
            aria-label="AB Repeat (R)"
          >
            {abRepeat
              ? abRepeat.b !== null
                ? "A-B"
                : "A..."
              : "AB"}
          </button>
        </div>

        <div className="hidden sm:flex justify-center mt-2 gap-4 text-xs text-muted-foreground">
          <span>Space Play/Pause</span>
          <span>← → Skip 3s</span>
          <span>R AB Repeat</span>
        </div>
      </div>
    </div>
  );
}
