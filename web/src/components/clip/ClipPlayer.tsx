"use client";

import type { RefObject, MouseEvent } from "react";
import type { MediaType } from "@/lib/types";
import { PauseIcon, PlayIcon } from "./Icons";

interface Props {
  mediaType: MediaType;
  videoSrc: string | null;
  /** Empty positioned container the page projects the hoisted <video> into. */
  videoSlotRef: RefObject<HTMLDivElement | null>;
  playing: boolean;
  currentTime: number;
  duration: number;
  abA: number | null;
  abB: number | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export default function ClipPlayer({
  mediaType,
  videoSrc,
  videoSlotRef,
  playing,
  currentTime,
  duration,
  abA,
  abB,
  onTogglePlay,
  onSeek,
}: Props) {
  const showVideoEl = mediaType === "video" && !!videoSrc;
  const progressPct = duration > 0 ? clamp01(currentTime / duration) * 100 : 0;
  const aPct = abA !== null && duration > 0 ? clamp01(abA / duration) * 100 : null;
  const bPct = abB !== null && duration > 0 ? clamp01(abB / duration) * 100 : null;

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp01((e.clientX - rect.left) / rect.width);
    onSeek(ratio * duration);
  };

  return (
    <div className={"player" + (showVideoEl ? "" : " audio-only")}>
      {showVideoEl ? (
        <div ref={videoSlotRef} className="player-video-slot" />
      ) : (
        <div className="player-stage">Audio</div>
      )}
      <div className="player-bar">
        <button
          type="button"
          className="play-fab"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <span>{formatTime(currentTime)}</span>
        <div className="progress" onClick={handleProgressClick}>
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          <div className="progress-knob" style={{ left: `${progressPct}%` }} />
          {aPct !== null && (
            <div className="ab-marker" style={{ left: `${aPct}%` }} />
          )}
          {bPct !== null && (
            <div className="ab-marker" style={{ left: `${bPct}%` }} />
          )}
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
