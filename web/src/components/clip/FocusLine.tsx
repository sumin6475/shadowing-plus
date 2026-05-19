"use client";

import type { Segment } from "@/lib/types";
import WordText from "@/components/WordText";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  segment: Segment | null;
  showTranslation: boolean;
  currentTime: number;
  onWordClick?: (time: number) => void;
}

export default function FocusLine({
  segment,
  showTranslation,
  currentTime,
  onWordClick,
}: Props) {
  return (
    <div className="focus">
      <div className="focus-time">
        {segment ? formatTime(segment.start_time) : ""}
      </div>
      <div className="focus-en">
        {segment ? (
          <WordText
            text={segment.text}
            segmentStart={segment.start_time}
            segmentEnd={segment.end_time}
            words={segment.words}
            currentTime={currentTime}
            onWordClick={onWordClick}
            playedClassName="clip-word-played"
            unplayedClassName="clip-word-unplayed"
          />
        ) : null}
      </div>
      <div className={"focus-ko" + (showTranslation ? "" : " is-hidden")}>
        {segment?.translation ?? ""}
      </div>
    </div>
  );
}
