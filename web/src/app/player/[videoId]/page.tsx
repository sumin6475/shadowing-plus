"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  use,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PracticeStatus, Video, Segment } from "@/lib/types";
import AudioPlayer, { type AudioPlayerHandle } from "@/components/AudioPlayer";
import YoutubePlayer from "@/components/YoutubePlayer";
import ClipHeader from "@/components/clip/ClipHeader";
import ClipPlayer from "@/components/clip/ClipPlayer";
import FocusLine from "@/components/clip/FocusLine";
import ClipControls from "@/components/clip/ClipControls";
import Transcript from "@/components/clip/Transcript";
import MobileClip from "@/components/mobile/MobileClip";
import { LoopIcon } from "@/components/mobile/Icons";
import { useIsMobile } from "@/lib/use-is-mobile";

import "./clip.css";

export type AbRepeat = { a: number; b: number | null };

const SPEEDS = [0.5, 0.7, 0.85, 1.0, 1.15, 1.25, 1.5];
const DEFAULT_SPEED_IDX = 3;

// Per-clip resume state. Reading users come back to the same clip many times
// during shadowing practice, so we restore both the play position and any A-B
// loop they've marked. Wiped via localStorage if a clip gets re-uploaded under
// the same id (rare).
type PlayerPersisted = { t: number; ab: AbRepeat | null; loop?: boolean };
const PLAYER_STORAGE_KEY = (id: string) => `sp:player:${id}`;

function loadPersisted(id: string): PlayerPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY(id));
    return raw ? (JSON.parse(raw) as PlayerPersisted) : null;
  } catch {
    return null;
  }
}

function savePersisted(id: string, value: PlayerPersisted) {
  try {
    localStorage.setItem(PLAYER_STORAGE_KEY(id), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export default function PlayerPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = use(params);
  const searchParams = useSearchParams();
  const seekedFromQueryRef = useRef(false);

  const [video, setVideo] = useState<Video | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showTranslation, setShowTranslation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [hideVideo, setHideVideo] = useState(false);
  const [hideFocus, setHideFocus] = useState(false);
  const [abRepeat, setAbRepeat] = useState<AbRepeat | null>(null);
  const [loopClip, setLoopClip] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(DEFAULT_SPEED_IDX);

  const playerRef = useRef<AudioPlayerHandle>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const desktopVideoSlotRef = useRef<HTMLDivElement>(null);
  const mobileVideoSlotRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const currentIndexRef = useRef(0);
  const segmentsRef = useRef<Segment[]>([]);
  const abRepeatRef = useRef<AbRepeat | null>(null);
  const loopClipRef = useRef(false);
  const currentTimeRef = useRef(0);
  const restoredRef = useRef(false);
  const lastSaveRef = useRef(0);
  // Guard so the initial render (t=0, ab=null, before restore applies)
  // doesn't immediately overwrite the persisted state. Flips to true as
  // soon as playback advances past 1s or AB is set — both signals that
  // the current state is meaningful and worth saving.
  const hasInteractedRef = useRef(false);

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
  useEffect(() => {
    loopClipRef.current = loopClip;
  }, [loopClip]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Fetch video + segments + bookmarks. Initial segments query drops the
  // `words` JSONB column — a 40-min clip's full payload is ~1–3 MB otherwise,
  // which stalls badly on cellular. Words are lazy-fetched per focused row
  // below. The whole load is guarded with a 30s AbortController so a stalled
  // request can't trap the page in "Loading…" forever.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    async function load() {
      try {
        const [videoRes, segmentsRes] = await Promise.all([
          supabase
            .from("videos")
            .select("*")
            .eq("id", videoId)
            .abortSignal(controller.signal)
            .single(),
          supabase
            .from("segments")
            .select(
              "id, video_id, index, start_time, end_time, text, translation, created_at",
            )
            .eq("video_id", videoId)
            .order("index")
            .abortSignal(controller.signal),
        ]);
        if (cancelled) return;

        if (videoRes.error) throw videoRes.error;
        if (segmentsRes.error) throw segmentsRes.error;

        if (videoRes.data) {
          setVideo(videoRes.data);
          if (videoRes.data.folder_id) {
            const { data: folder } = await supabase
              .from("folders")
              .select("name")
              .eq("id", videoRes.data.folder_id)
              .abortSignal(controller.signal)
              .maybeSingle();
            if (!cancelled && folder?.name) setFolderName(folder.name);
          }
        }
        // Backfill words=null so the lazy-fetch effect knows what's missing.
        const segs: Segment[] = (segmentsRes.data ?? []).map((s) => ({
          ...(s as Omit<Segment, "words">),
          words: null,
        }));
        setSegments(segs);

        if (segs.length > 0) {
          const segIds = segs.map((s) => s.id);
          const { data: bookmarks } = await supabase
            .from("bookmarks")
            .select("segment_id")
            .in("segment_id", segIds)
            .abortSignal(controller.signal);

          if (!cancelled && bookmarks) {
            setBookmarkedIds(new Set(bookmarks.map((b) => b.segment_id)));
          }
        }

        if (!cancelled) setLoadError(null);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof Error
            ? e.name === "AbortError"
              ? "Request timed out"
              : e.message
            : String(e);
        setLoadError(msg);
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [videoId, loadAttempt]);

  // Lazy-fetch the `words` array for the currently-focused segment only.
  // Initial fetch above strips words to keep the payload small; word-level
  // seek/highlight only needs the active row. Words stay cached after.
  useEffect(() => {
    const seg = segments[currentIndex];
    if (!seg || seg.words !== null) return;
    let cancelled = false;
    supabase
      .from("segments")
      .select("words")
      .eq("id", seg.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSegments((prev) =>
          prev.map((s) => (s.id === seg.id ? { ...s, words: data.words } : s)),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [currentIndex, segments]);

  // Apply playback rate whenever speed index changes
  useEffect(() => {
    playerRef.current?.setPlaybackRate(SPEEDS[speedIdx]);
  }, [speedIdx]);

  // Deep-link: seek to ?t= once segments are loaded.
  useEffect(() => {
    if (loading || seekedFromQueryRef.current) return;
    const t = Number(searchParams.get("t"));
    if (!Number.isFinite(t) || t <= 0) return;
    seekedFromQueryRef.current = true;
    // Defer until AudioPlayer's imperative handle is wired.
    const id = setTimeout(() => {
      playerRef.current?.seekTo(t);
      playerRef.current?.play();
    }, 50);
    return () => clearTimeout(id);
  }, [loading, searchParams]);

  // Restore A-B + resume position from localStorage (once per mount, after load).
  // Query ?t= still wins over the persisted t — that's an explicit user intent.
  useEffect(() => {
    if (loading || restoredRef.current) return;
    restoredRef.current = true;

    const persisted = loadPersisted(videoId);
    if (!persisted) return;

    if (persisted.ab) setAbRepeat(persisted.ab);
    if (persisted.loop) setLoopClip(true);

    const queryT = Number(searchParams.get("t"));
    const queryTValid = Number.isFinite(queryT) && queryT > 0;
    if (!queryTValid && Number.isFinite(persisted.t) && persisted.t > 1) {
      const id = setTimeout(() => playerRef.current?.seekTo(persisted.t), 50);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Throttled save while playback advances. Trails by up to 2s so a sudden
  // close still loses very little. Normalize a near-finished t to 0 so a
  // re-watch starts from the top. Skips entirely until the user has done
  // something meaningful (currentTime >= 1 or AB set) so the initial empty
  // state doesn't overwrite a persisted resume point.
  useEffect(() => {
    if (loading) return;
    if (currentTime >= 1) hasInteractedRef.current = true;
    if (!hasInteractedRef.current) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 2000) return;
    lastSaveRef.current = now;
    const duration = video?.duration ?? 0;
    const tToSave =
      duration > 0 && currentTime >= duration - 3 ? 0 : currentTime;
    savePersisted(videoId, { t: tToSave, ab: abRepeat, loop: loopClipRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, loading, videoId]);

  // AB toggle saves immediately (these changes are rare and high-signal).
  useEffect(() => {
    if (loading) return;
    if (abRepeat !== null) hasInteractedRef.current = true;
    if (!hasInteractedRef.current) return;
    savePersisted(videoId, {
      t: currentTimeRef.current,
      ab: abRepeat,
      loop: loopClipRef.current,
    });
  }, [abRepeat, loading, videoId]);

  // Loop toggle saves immediately too.
  useEffect(() => {
    if (loading) return;
    hasInteractedRef.current = true;
    savePersisted(videoId, {
      t: currentTimeRef.current,
      ab: abRepeatRef.current,
      loop: loopClip,
    });
  }, [loopClip, loading, videoId]);

  // Flush latest position when leaving the page.
  useEffect(() => {
    return () => {
      if (!hasInteractedRef.current) return;
      const duration = video?.duration ?? 0;
      const t = currentTimeRef.current;
      const tToSave = duration > 0 && t >= duration - 3 ? 0 : t;
      savePersisted(videoId, {
        t: tToSave,
        ab: abRepeatRef.current,
        loop: loopClipRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Time update handler — AB enforcement + segment tracking + karaoke
  const handleTimeUpdate = useCallback((time: number) => {
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

  const seekBy = useCallback((delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(Math.max(0, p.getCurrentTime() + delta));
  }, []);

  const togglePlay = useCallback(() => {
    if (playerRef.current?.isPlaying()) {
      playerRef.current.pause();
    } else {
      playerRef.current?.play();
    }
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

  const toggleLoop = useCallback(() => {
    setLoopClip((v) => !v);
  }, []);

  // Full-clip loop: when the media ends and loop is on, restart from the top.
  // Fires off the players' native end events (HTML `ended` / YT ENDED state),
  // so it triggers exactly once at the true end rather than racing timeupdate.
  const handleEnded = useCallback(() => {
    if (!loopClipRef.current) return;
    playerRef.current?.seekTo(0);
    playerRef.current?.play();
  }, []);

  const selectSpeed = useCallback((s: number) => {
    const idx = SPEEDS.indexOf(s);
    if (idx !== -1) setSpeedIdx(idx);
  }, []);

  const toggleBookmark = useCallback(
    async (segmentId: string) => {
      const isBookmarked = bookmarkedIds.has(segmentId);

      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.delete(segmentId);
        else next.add(segmentId);
        return next;
      });

      if (isBookmarked) {
        supabase.from("bookmarks").delete().eq("segment_id", segmentId).then();
      } else {
        const { data: existing } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("segment_id", segmentId)
          .limit(1);
        if (!existing || existing.length === 0) {
          supabase.from("bookmarks").insert({ segment_id: segmentId }).then();
        }
      }
    },
    [bookmarkedIds],
  );

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
        case "l":
          e.preventDefault();
          toggleLoop();
          break;
        case "t":
          e.preventDefault();
          setShowTranslation((v) => !v);
          break;
        case " ":
          e.preventDefault();
          togglePlay();
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
  }, [goToPrev, goToNext, repeatCurrent, toggleAbRepeat, toggleLoop, togglePlay]);

  // Media Session: lock-screen / notification transport controls + metadata.
  // This is what keeps uploaded audio/video playing in the background on mobile
  // (Android especially) and surfaces controls on the lock screen. YouTube clips
  // play inside an iframe that owns its own media session AND blocks background
  // playback, so we skip wiring it for them.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!video) return;
    if (video.audio_url?.startsWith("youtube://")) return;

    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: video.title || "Shadowing+",
      artist: folderName || "Shadowing+",
      album: "Shadowing+",
      artwork: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    });

    const set = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* action not supported on this platform */
      }
    };

    set("play", () => playerRef.current?.play());
    set("pause", () => playerRef.current?.pause());
    set("previoustrack", () => goToPrev());
    set("nexttrack", () => goToNext());
    set("seekbackward", (d) => seekBy(-(d.seekOffset ?? 10)));
    set("seekforward", (d) => seekBy(d.seekOffset ?? 10));
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") playerRef.current?.seekTo(d.seekTime);
    });

    const actions: MediaSessionAction[] = [
      "play",
      "pause",
      "previoustrack",
      "nexttrack",
      "seekbackward",
      "seekforward",
      "seekto",
    ];
    return () => actions.forEach((a) => set(a, null));
  }, [video, folderName, goToPrev, goToNext, seekBy]);

  // Keep the OS transport UI in sync with play state + scrubber position.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.playbackState = playing ? "playing" : "paused";
    const dur = video?.duration ?? 0;
    if (dur > 0 && "setPositionState" in ms) {
      try {
        ms.setPositionState({
          duration: dur,
          position: Math.min(Math.max(0, currentTime), dur),
          playbackRate: SPEEDS[speedIdx],
        });
      } catch {
        /* invalid state (e.g. position > duration mid-seek) — ignore */
      }
    }
  }, [playing, currentTime, video?.duration, speedIdx]);

  // Hoisted-video projection: the single <video> element below lives in a
  // hidden pool. After mount (and whenever the active shell changes), we
  // appendChild it into the visible slot. appendChild MOVES the node rather
  // than re-creating it, so playback state survives the swap.
  useLayoutEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const target = isMobile
      ? mobileVideoSlotRef.current
      : desktopVideoSlotRef.current;
    if (target && v.parentElement !== target) {
      target.appendChild(v);
    }
  }, [isMobile, loading, video]);

  // Soft re-fetch: bump loadAttempt (a dep of the fetch effect) instead of a
  // full page reload, so retrying keeps SPA state. Shared by both shells.
  const retryLoad = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setLoadAttempt((n) => n + 1);
  }, []);

  if (loading) {
    // Both shells render; the 768px media query shows exactly one. The mobile
    // copy is essential: `.clip-page` is `display:none` on mobile, so without
    // an `.m-app` sibling the screen is blank while a (long) clip loads.
    return (
      <>
        <div className="clip-page">
          <div className="clip-loading">Loading…</div>
        </div>
        <div className="m-app">
          <div className="m-clip-status">
            <div className="m-clip-status-msg">Loading…</div>
          </div>
        </div>
      </>
    );
  }

  if (loadError || !video) {
    const label = loadError ? "Couldn't load this clip" : "Clip not found";
    return (
      <>
        <div className="clip-page">
          <div className="clip-loading">
            <span>{label} · </span>
            {loadError ? (
              <button
                type="button"
                onClick={retryLoad}
                style={{
                  color: "var(--accent-text)",
                  marginLeft: 6,
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  font: "inherit",
                  textDecoration: "underline",
                }}
              >
                Retry
              </button>
            ) : (
              <Link
                href="/"
                style={{ color: "var(--accent-text)", marginLeft: 6 }}
              >
                Back to library
              </Link>
            )}
          </div>
        </div>
        <div className="m-app">
          <div className="m-clip-status">
            <div className="m-clip-status-title">{label}</div>
            {loadError ? (
              <>
                <div className="m-clip-status-sub">
                  Check your connection and try again.
                </div>
                <button
                  type="button"
                  className="m-clip-reload"
                  onClick={retryLoad}
                >
                  <LoopIcon />
                  Reload
                </button>
              </>
            ) : (
              <Link href="/" className="m-clip-reload">
                Back to library
              </Link>
            )}
          </div>
        </div>
      </>
    );
  }

  const currentSegment = segments[currentIndex] ?? null;
  const isYoutube = video.audio_url?.startsWith("youtube://") ?? false;
  const youtubeVideoId = isYoutube ? video.audio_url.replace("youtube://", "") : null;
  const isVideo = (video.media_type === "video" && !!video.video_url) || isYoutube;
  const showVideoFrame = isVideo && !hideVideo;
  const practiceStatus: PracticeStatus = video.practice_status || "none";

  const setPracticeStatus = async (next: PracticeStatus) => {
    setVideo((prev) => (prev ? { ...prev, practice_status: next } : prev));
    const { error } = await supabase
      .from("videos")
      .update({ practice_status: next })
      .eq("id", video.id);
    if (error) {
      console.warn("video status update failed:", error.message);
      alert(
        "Couldn't save status. Apply supabase/migrations/005_video_practice_status.sql.",
      );
    }
  };

  return (
    <>
      <div className="clip-page">
        {/* YouTube has no separate audio track — the iframe must stay mounted,
            so audio-only "Hide video" isn't supported for YouTube clips. */}
        <ClipHeader
          title={video.title}
          folderName={folderName}
          showVideo={!hideVideo}
          canHideVideo={isVideo && !isYoutube}
          onToggleVideo={() => setHideVideo((v) => !v)}
          showFocus={!hideFocus}
          onToggleFocus={() => setHideFocus((v) => !v)}
          status={practiceStatus}
          onSetStatus={setPracticeStatus}
        />

        <div className={"clip-body" + (showVideoFrame ? "" : " hide-video")}>
          <div className={"player-col" + (hideFocus ? " no-focus" : "")}>
            <ClipPlayer
              mediaType={video.media_type}
              videoSrc={showVideoFrame ? video.video_url : null}
              videoSlotRef={desktopVideoSlotRef}
              playing={playing}
              currentTime={currentTime}
              duration={video.duration ?? 0}
              abA={abRepeat?.a ?? null}
              abB={abRepeat?.b ?? null}
              onTogglePlay={togglePlay}
              onSeek={seekToTime}
            />
            {!hideFocus && (
              <FocusLine
                segment={currentSegment}
                showTranslation={showTranslation}
                currentTime={currentTime}
                onWordClick={seekToTime}
              />
            )}
            <ClipControls
              onPrev={goToPrev}
              onNext={goToNext}
              onReplay={repeatCurrent}
              abActive={abRepeat !== null}
              onToggleAB={toggleAbRepeat}
              loopActive={loopClip}
              onToggleLoop={toggleLoop}
              showTranslation={showTranslation}
              onToggleTranslation={() => setShowTranslation((v) => !v)}
              speed={SPEEDS[speedIdx]}
              speeds={SPEEDS}
              onSelectSpeed={selectSpeed}
            />
          </div>

          <Transcript
            segments={segments}
            currentIndex={currentIndex}
            showTranslation={showTranslation}
            bookmarkedIds={bookmarkedIds}
            onSelect={goToSegment}
            onToggleBookmark={toggleBookmark}
          />
        </div>

        {/* AudioPlayer mounts the <audio> element for audio-only or wires to
            the <video> via externalMediaRef. Chrome hidden — ClipPlayer owns the UI. */}
        {isYoutube ? (
          // Hidden pool: the YoutubePlayer hoists its (absolutely-positioned)
          // container into the active slot via appendChild. Keeping its home
          // here display:none means it can never overlay the page if hoisting
          // hasn't happened yet (mirrors the hoisted <video> pool below).
          <div style={{ display: "none" }} aria-hidden>
            <YoutubePlayer
              ref={playerRef}
              videoId={youtubeVideoId!}
              onTimeUpdate={handleTimeUpdate}
              onPlayingChange={setPlaying}
              onEnded={handleEnded}
              videoSlotRef={isMobile ? mobileVideoSlotRef : desktopVideoSlotRef}
            />
          </div>
        ) : (
          <AudioPlayer
            ref={playerRef}
            src={video.audio_url}
            duration={video.duration ?? 0}
            onTimeUpdate={handleTimeUpdate}
            externalMediaRef={showVideoFrame ? videoRef : undefined}
            abRepeat={abRepeat}
            onPlayingChange={setPlaying}
            onEnded={handleEnded}
            hideChrome
          />
        )}
      </div>

      <MobileClip
        video={video}
        segments={segments}
        currentIndex={currentIndex}
        showTranslation={showTranslation}
        playing={playing}
        currentTime={currentTime}
        abActive={abRepeat !== null}
        loopActive={loopClip}
        speed={SPEEDS[speedIdx]}
        videoSlotRef={mobileVideoSlotRef}
        bookmarkedIds={
          new Set(
            segments
              .filter((s) => bookmarkedIds.has(s.id))
              .map((s) => s.id),
          )
        }
        onTogglePlay={togglePlay}
        onPrev={goToPrev}
        onNext={goToNext}
        onReplay={repeatCurrent}
        onToggleAB={toggleAbRepeat}
        onToggleLoop={toggleLoop}
        onToggleTranslation={() => setShowTranslation((v) => !v)}
        onSeek={seekToTime}
        onSeekBy={seekBy}
        onSelectSegment={goToSegment}
        onToggleSegmentBookmark={toggleBookmark}
      />

      {/* Hoisted <video>: lives in a hidden pool until the useLayoutEffect
          above moves it into the active shell's slot via appendChild. */}
      {showVideoFrame && !isYoutube && (
        <div style={{ display: "none" }} aria-hidden>
          <video
            ref={videoRef}
            src={video.video_url ?? undefined}
            className="player-video"
            preload="metadata"
            playsInline
          />
        </div>
      )}
    </>
  );
}
