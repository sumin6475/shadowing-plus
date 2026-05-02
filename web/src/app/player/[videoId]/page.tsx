"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Video, Segment } from "@/lib/types";
import AudioPlayer, { type AudioPlayerHandle } from "@/components/AudioPlayer";
import SubtitlePanel from "@/components/SubtitlePanel";
import FocusPanel from "@/components/FocusPanel";

export type AbRepeat = { a: number; b: number | null };

export default function PlayerPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = use(params);

  const [video, setVideo] = useState<Video | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showTranslation, setShowTranslation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasVideo, setHasVideo] = useState(false);
  const [abRepeat, setAbRepeat] = useState<AbRepeat | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const playerRef = useRef<AudioPlayerHandle>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentIndexRef = useRef(0);
  const segmentsRef = useRef<Segment[]>([]);
  const abRepeatRef = useRef<AbRepeat | null>(null);

  // Keep refs in sync
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);
  useEffect(() => {
    abRepeatRef.current = abRepeat;
  }, [abRepeat]);

  // Check if local video is available
  useEffect(() => {
    fetch(`/api/video/${videoId}`, { method: "HEAD" })
      .then((res) => setHasVideo(res.ok))
      .catch(() => setHasVideo(false));
  }, [videoId]);

  // Fetch video + segments + bookmarks
  useEffect(() => {
    async function load() {
      const [videoRes, segmentsRes] = await Promise.all([
        supabase.from("videos").select("*").eq("id", videoId).single(),
        supabase
          .from("segments")
          .select("*")
          .eq("video_id", videoId)
          .order("index"),
      ]);

      if (videoRes.data) setVideo(videoRes.data);
      if (segmentsRes.data) setSegments(segmentsRes.data);

      // Load bookmarks for these segments
      if (segmentsRes.data && segmentsRes.data.length > 0) {
        const segIds = segmentsRes.data.map((s) => s.id);
        const { data: bookmarks } = await supabase
          .from("bookmarks")
          .select("segment_id")
          .in("segment_id", segIds);

        if (bookmarks) {
          setBookmarkedIds(new Set(bookmarks.map((b) => b.segment_id)));
        }
      }

      setLoading(false);
    }
    load();
  }, [videoId]);

  // Time update handler — AB enforcement + segment tracking + karaoke
  const handleTimeUpdate = useCallback((time: number) => {
    // AB repeat enforcement
    const ab = abRepeatRef.current;
    if (ab && ab.b !== null && time >= ab.b) {
      playerRef.current?.seekTo(ab.a);
      return;
    }

    setCurrentTime(time);

    const segs = segmentsRef.current;
    if (segs.length === 0) return;

    for (let i = segs.length - 1; i >= 0; i--) {
      if (time >= segs[i].start_time) {
        if (i !== currentIndexRef.current) {
          setCurrentIndex(i);
        }
        return;
      }
    }
    if (currentIndexRef.current !== 0) {
      setCurrentIndex(0);
    }
  }, []);

  const goToSegment = useCallback((index: number) => {
    if (index < 0 || index >= segmentsRef.current.length) return;
    setCurrentIndex(index);
    playerRef.current?.seekTo(segmentsRef.current[index].start_time);
    playerRef.current?.play();
  }, []);

  const goToPrev = useCallback(() => {
    goToSegment(currentIndexRef.current - 1);
  }, [goToSegment]);

  const goToNext = useCallback(() => {
    goToSegment(currentIndexRef.current + 1);
  }, [goToSegment]);

  const repeatCurrent = useCallback(() => {
    goToSegment(currentIndexRef.current);
  }, [goToSegment]);

  const seekToTime = useCallback((time: number) => {
    playerRef.current?.seekTo(time);
    playerRef.current?.play();
  }, []);

  const toggleAbRepeat = useCallback(() => {
    const current = abRepeatRef.current;
    const now = playerRef.current?.getCurrentTime() ?? 0;

    if (!current) {
      setAbRepeat({ a: now, b: null });
    } else if (current.b === null) {
      if (now > current.a) {
        setAbRepeat({ a: current.a, b: now });
      }
    } else {
      setAbRepeat(null);
    }
  }, []);

  const toggleBookmark = useCallback(async (segmentId: string) => {
    const isBookmarked = bookmarkedIds.has(segmentId);

    // Update UI first
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) {
        next.delete(segmentId);
      } else {
        next.add(segmentId);
      }
      return next;
    });

    // DB call outside setter to avoid StrictMode double-invoke
    if (isBookmarked) {
      supabase.from("bookmarks").delete().eq("segment_id", segmentId).then();
    } else {
      // Prevent duplicates: check existence before insert
      const { data: existing } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("segment_id", segmentId)
        .limit(1);
      if (!existing || existing.length === 0) {
        supabase.from("bookmarks").insert({ segment_id: segmentId }).then();
      }
    }
  }, [bookmarkedIds]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          goToPrev();
          break;
        case "d":
          e.preventDefault();
          goToNext();
          break;
        case "s":
          e.preventDefault();
          repeatCurrent();
          break;
        case "r":
          e.preventDefault();
          toggleAbRepeat();
          break;
        case " ":
          e.preventDefault();
          if (playerRef.current?.isPlaying()) {
            playerRef.current.pause();
          } else {
            playerRef.current?.play();
          }
          break;
        case "arrowleft":
          e.preventDefault();
          if (playerRef.current) {
            const t = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(Math.max(0, t - 3));
          }
          break;
        case "arrowright":
          e.preventDefault();
          if (playerRef.current) {
            const t = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(t + 3);
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goToPrev, goToNext, repeatCurrent, toggleAbRepeat]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Video not found</p>
        <Link href="/" className="text-primary hover:underline text-sm">
          Back to home
        </Link>
      </div>
    );
  }

  const currentSegment = segments[currentIndex] ?? null;

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-2 flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M13 4L7 10l6 6" />
          </svg>
        </Link>
        <h1 className="text-sm font-medium truncate flex-1">{video.title}</h1>
        <Link
          href="/bookmarks"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Bookmarks
        </Link>
      </header>

      {hasVideo ? (
        /* ── Video mode: split layout ── */
        <>
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Left: Video + Progress */}
            <div className="md:w-1/2 flex flex-col shrink-0">
              <div className="aspect-video bg-black">
                <video
                  ref={videoRef}
                  src={`/api/video/${videoId}`}
                  className="w-full h-full object-contain"
                  preload="auto"
                />
              </div>
              <div className="shrink-0">
                <AudioPlayer
                  ref={playerRef}
                  src={video.audio_url}
                  duration={video.duration ?? 0}
                  onTimeUpdate={handleTimeUpdate}
                  externalMediaRef={videoRef}
                  abRepeat={abRepeat}
                />
              </div>
            </div>

            {/* Right: Subtitle Panel */}
            <div className="flex-1 min-h-0 md:border-l border-border">
              <SubtitlePanel
                segments={segments}
                currentIndex={currentIndex}
                currentTime={currentTime}
                bookmarkedIds={bookmarkedIds}
                showTranslation={showTranslation}
                onSegmentClick={goToSegment}
                onToggleBookmark={toggleBookmark}
                onWordClick={seekToTime}
              />
            </div>
          </div>

          <div className="shrink-0">
            <FocusPanel
              segment={currentSegment}
              showTranslation={showTranslation}
              abRepeat={abRepeat}
              currentTime={currentTime}
              onPrev={goToPrev}
              onRepeat={repeatCurrent}
              onNext={goToNext}
              onToggleTranslation={() => setShowTranslation((v) => !v)}
              onToggleAbRepeat={toggleAbRepeat}
              onWordClick={seekToTime}
            />
          </div>
        </>
      ) : (
        /* ── Audio-only mode: subtitle → focus → progress (bottom) ── */
        <>
          <div className="flex-1 min-h-0">
            <SubtitlePanel
              segments={segments}
              currentIndex={currentIndex}
              currentTime={currentTime}
              bookmarkedIds={bookmarkedIds}
              showTranslation={showTranslation}
              onSegmentClick={goToSegment}
              onToggleBookmark={toggleBookmark}
              onWordClick={seekToTime}
            />
          </div>

          <div className="shrink-0">
            <FocusPanel
              segment={currentSegment}
              showTranslation={showTranslation}
              abRepeat={abRepeat}
              currentTime={currentTime}
              onPrev={goToPrev}
              onRepeat={repeatCurrent}
              onNext={goToNext}
              onToggleTranslation={() => setShowTranslation((v) => !v)}
              onToggleAbRepeat={toggleAbRepeat}
              onWordClick={seekToTime}
            />
          </div>

          <div className="shrink-0">
            <AudioPlayer
              ref={playerRef}
              src={video.audio_url}
              duration={video.duration ?? 0}
              onTimeUpdate={handleTimeUpdate}
              abRepeat={abRepeat}
            />
          </div>
        </>
      )}
    </div>
  );
}
