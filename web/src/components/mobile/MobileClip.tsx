"use client";

import { useEffect, useRef, type RefObject, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Segment, Video } from "@/lib/types";
import WordText from "@/components/WordText";
import {
  BackIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  EyeOffIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  ShadowIcon,
  Skip3BackIcon,
  Skip3ForwardIcon,
} from "./Icons";
import { ChevronDownIcon, DotsIcon, SearchIcon } from "@/components/home/Icons";

interface Props {
  video: Video;
  segments: Segment[];
  currentIndex: number;
  showTranslation: boolean;
  playing: boolean;
  currentTime: number;
  abActive: boolean;
  speed: number;
  videoSlotRef: RefObject<HTMLDivElement | null>;
  bookmarkedIds: Set<string>;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
  onToggleAB: () => void;
  onToggleTranslation: () => void;
  onSeek: (t: number) => void;
  onSeekBy: (delta: number) => void;
  onSelectSegment: (i: number) => void;
  onToggleSegmentBookmark: (segmentId: string) => void;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatSpeed(s: number): string {
  return s.toFixed(2).replace(/\.?0+$/, "") + "×";
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export default function MobileClip({
  video,
  segments,
  currentIndex,
  showTranslation,
  playing,
  currentTime,
  abActive,
  speed,
  videoSlotRef,
  bookmarkedIds,
  onTogglePlay,
  onPrev,
  onNext,
  onReplay,
  onToggleAB,
  onToggleTranslation,
  onSeek,
  onSeekBy,
  onSelectSegment,
  onToggleSegmentBookmark,
}: Props) {
  const router = useRouter();
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isVideo = video.media_type === "video" && !!video.video_url;
  const segment = segments[currentIndex] ?? null;
  const duration = video.duration ?? 0;
  const progressPct = duration > 0 ? clamp01(currentTime / duration) * 100 : 0;

  // Autoscroll: only "turn the page" when the current line drifts into the
  // bottom 40% of the visible transcript (or already goes past the bottom
  // edge near the dock). Then snap it to the top so upcoming lines fill
  // the rest. Lines that move through the upper 60% stay in place.
  useEffect(() => {
    const listEl = transcriptRef.current;
    const lineEl = listEl?.querySelector<HTMLElement>(".m-line.is-current");
    if (!listEl || !lineEl) return;

    const listRect = listEl.getBoundingClientRect();
    const lineRect = lineEl.getBoundingClientRect();
    const visibleHeight = listRect.height;
    const lineTopWithin = lineRect.top - listRect.top;

    const pastUpperThird = lineTopWithin > visibleHeight * 0.6;
    const clippedAtBottom = lineRect.bottom > listRect.bottom;
    const fullyAboveView = lineRect.bottom < listRect.top;

    if (pastUpperThird || clippedAtBottom || fullyAboveView) {
      lineEl.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }, [currentIndex]);

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = clamp01((e.clientX - rect.left) / rect.width);
    onSeek(ratio * duration);
  };

  return (
    <div className="m-app">
      {/* TOP BAR */}
      <div className="m-bar clip-bar">
        <button
          type="button"
          className="m-icon-btn bordered"
          aria-label="Back"
          onClick={() => router.push("/")}
        >
          <BackIcon />
        </button>
        <div className="m-bar-clip-title">{video.title}</div>
        <button
          type="button"
          className={"m-icon-btn" + (showTranslation ? "" : " is-on")}
          aria-label="Toggle translation"
          onClick={onToggleTranslation}
        >
          <EyeOffIcon />
        </button>
      </div>

      {/* CONTENT — clip-mode keeps player+focus pinned, only transcript scrolls */}
      <div className="m-content m-content-clip">
        {/* Player */}
        <div className="m-player">
          {isVideo ? (
            <div ref={videoSlotRef} className="m-player-video-slot" />
          ) : (
            <div className="m-player-stage">Audio</div>
          )}
          <div className="m-player-bar">
            <button
              type="button"
              className="m-play-fab"
              onClick={onTogglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <span>{formatTime(currentTime)}</span>
            <div
              className="m-progress"
              onClick={handleProgressClick}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
            >
              <div className="m-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Focus card */}
        {segment && (
          <div className="m-focus">
            <div className="m-focus-time">{formatTime(segment.start_time)}</div>
            <p className="m-focus-en">
              <WordText
                text={segment.text}
                segmentStart={segment.start_time}
                segmentEnd={segment.end_time}
                words={segment.words}
                currentTime={currentTime}
                onWordClick={onSeek}
                playedClassName="m-word-played"
                unplayedClassName="m-word-unplayed"
              />
            </p>
            {showTranslation && segment.translation && (
              <p className="m-focus-ko">{segment.translation}</p>
            )}
          </div>
        )}

        {/* Transcript */}
        <div className="m-transcript">
          <div className="m-transcript-head">
            <div className="m-transcript-title">
              Transcript · {segments.length} lines
            </div>
            <div className="m-transcript-actions" style={{ display: "flex", gap: 2 }}>
              <button type="button" aria-label="Search" className="m-icon-btn" style={{ width: 30, height: 30 }}>
                <SearchIcon />
              </button>
              <button type="button" aria-label="More" className="m-icon-btn" style={{ width: 30, height: 30 }}>
                <DotsIcon />
              </button>
            </div>
          </div>
          <div ref={transcriptRef} className="m-transcript-list">
            {segments.map((seg, i) => {
              const isBookmarked = bookmarkedIds.has(seg.id);
              return (
                <div
                  key={seg.id}
                  className={"m-line" + (i === currentIndex ? " is-current" : "")}
                  onClick={() => onSelectSegment(i)}
                >
                  <div className="m-line-time">{formatTime(seg.start_time)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="m-line-en">{seg.text}</div>
                    {showTranslation && seg.translation && (
                      <div className="m-line-ko">{seg.translation}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={"m-line-bookmark" + (isBookmarked ? " is-on" : "")}
                    aria-label="Bookmark line"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSegmentBookmark(seg.id);
                    }}
                  >
                    {isBookmarked ? <BookmarkFilledIcon /> : <BookmarkIcon />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DOCK */}
      <div className="m-dock">
        <div className="m-dock-tools">
          <button type="button" className="m-tool-chip" onClick={onReplay}>
            <ShadowIcon /> Shadow line
            <span className="m-tool-chip-key">S</span>
          </button>
          <button
            type="button"
            className={"m-tool-chip" + (showTranslation ? " is-on" : "")}
            onClick={onToggleTranslation}
          >
            Trans
            <span className="m-tool-chip-key">T</span>
          </button>
          <button
            type="button"
            className={"m-tool-chip" + (abActive ? " is-on" : "")}
            onClick={onToggleAB}
          >
            A–B
            <span className="m-tool-chip-key">R</span>
          </button>
          <button type="button" className="m-tool-chip" title="Playback speed">
            <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", letterSpacing: 0 }}>
              {formatSpeed(speed)}
            </span>
            <ChevronDownIcon />
          </button>
        </div>
        <div className="m-dock-main">
          <button type="button" className="m-dock-btn" onClick={onPrev} aria-label="Previous line">
            <PrevIcon />
          </button>
          <button type="button" className="m-dock-btn" onClick={() => onSeekBy(-3)} aria-label="Skip back 3s">
            <Skip3BackIcon />
          </button>
          <button type="button" className="m-dock-play" onClick={onTogglePlay}>
            {playing ? <PauseIcon /> : <PlayIcon />}
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className="m-dock-btn" onClick={() => onSeekBy(3)} aria-label="Skip forward 3s">
            <Skip3ForwardIcon />
          </button>
          <button type="button" className="m-dock-btn" onClick={onNext} aria-label="Next line">
            <NextIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
