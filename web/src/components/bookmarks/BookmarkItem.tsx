"use client";

import { useRouter } from "next/navigation";
import { DotsIcon, DrillIcon, NoteIcon, PauseIcon, PlayIcon } from "./Icons";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export interface BookmarkItemData {
  bookmarkId: string;
  segmentId: string;
  videoId: string;
  text: string;
  translation: string | null;
  note: string | null;
  startTime: number;
  endTime: number;
  /** Pretty "x ago" string. */
  date: string;
}

interface Props {
  bm: BookmarkItemData;
  playing: boolean;
  onPlay: () => void;
  onRemove: () => void;
}

export default function BookmarkItem({ bm, playing, onPlay, onRemove }: Props) {
  const router = useRouter();

  const open = () => {
    router.push(`/player/${bm.videoId}?t=${bm.startTime.toFixed(2)}`);
  };

  return (
    <div
      className="bm-item"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="bm-time">{formatTime(bm.startTime)}</div>
      <div className="bm-text">
        <div className="bm-en">{bm.text}</div>
        {bm.translation ? <div className="bm-ko">{bm.translation}</div> : null}
        {bm.note ? (
          <div className="bm-note">
            <NoteIcon /> {bm.note}
          </div>
        ) : null}
      </div>
      <div className="bm-side" onClick={(e) => e.stopPropagation()}>
        <span className="bm-date">{bm.date}</span>
        <div className="bm-actions">
          <button
            type="button"
            className="bm-action"
            title="Shadow drill (coming soon)"
            aria-label="Shadow drill"
            disabled
          >
            <DrillIcon />
          </button>
          <button
            type="button"
            className={"bm-action primary" + (playing ? " is-playing" : "")}
            title={playing ? "Pause" : "Play from here"}
            aria-label={playing ? "Pause" : "Play from here"}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className="bm-action"
            title="Remove bookmark"
            aria-label="Remove bookmark"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Remove this bookmark?")) onRemove();
            }}
          >
            <DotsIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
