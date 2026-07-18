"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Folder, SrsVerdict } from "@/lib/types";
import { folderColor } from "@/lib/folder-color";
import { applyVerdict, type SrsState } from "@/lib/srs";
import { resolveAudioUrl } from "@/lib/resolve-media";
import {
  CloseIcon,
  LoopIcon,
  EyeIcon,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  SettingsIcon,
  ShadowIcon,
} from "./Icons";
import { PlayIcon as ThumbPlayIcon } from "@/components/home/Icons";

export interface PracticeQueueItem {
  bookmarkId: string;
  segmentId: string;
  videoId: string;
  videoTitle: string;
  audioUrl: string;
  folder: Pick<Folder, "id" | "color"> | null;
  folderName: string | null;
  startTime: number;
  endTime: number;
  text: string;
  translation: string | null;
  note: string | null;
  srs: SrsState;
}

const SPEEDS = [0.5, 0.7, 0.85, 1.0, 1.15, 1.25, 1.5];

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function intervalLabel(verdict: SrsVerdict, state: SrsState): string {
  const next = applyVerdict(state, verdict, new Date());
  if (verdict === "again") return "< 1 min";
  const days = next.interval_days;
  if (days < 1) return "< 1 day";
  if (days < 30) return `${Math.round(days)} day${days >= 2 ? "s" : ""}`;
  const months = days / 30;
  return `${months.toFixed(months < 10 ? 1 : 0)} mo`;
}

interface UndoEntry {
  item: PracticeQueueItem;
  prevSrs: SrsState;
  cursorWas: number;
  removedFromCursor: number | null;
}

export default function MobilePractice({ initialQueue }: { initialQueue: PracticeQueueItem[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState<PracticeQueueItem[]>(initialQueue);
  const [cursor, setCursor] = useState(0);
  const [showKo, setShowKo] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [loop, setLoop] = useState(true);
  const [speedI, setSpeedI] = useState(2); // 0.85x
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  // Set true while a loop-reset seek is in flight. iOS Safari fires multiple
  // timeupdate events during a seek; without this guard, each one re-triggers
  // the loop branch and the audio lands at unpredictable positions.
  const loopGuardRef = useRef(false);

  const item = queue[cursor];
  const total = queue.length;
  const speed = SPEEDS[speedI];

  // Wire audio src + seek. Setting currentTime before metadata loads is
  // a no-op in iOS Safari, so we defer the seek to loadedmetadata when the
  // src has just been swapped. Note: audio.load() resets playbackRate to
  // 1.0, so we re-apply the rate inside `seek` (which runs post-load).
  useEffect(() => {
    if (!item || !audioRef.current) return;
    const a = audioRef.current;
    let cancelled = false;
    const seek = () => {
      a.currentTime = item.startTime;
      a.playbackRate = speed;
      setCurrentTime(item.startTime);
    };
    // item.audioUrl is a bare R2 key; resolve it to a signed URL first.
    resolveAudioUrl(item.videoId).then((url) => {
      if (cancelled || !url) return;
      if (a.src !== url) {
        a.src = url;
        a.addEventListener("loadedmetadata", seek, { once: true });
        a.load();
      } else if (a.readyState >= 1) {
        seek();
      } else {
        a.addEventListener("loadedmetadata", seek, { once: true });
      }
    });
    return () => {
      cancelled = true;
      a.removeEventListener("loadedmetadata", seek);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.bookmarkId]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrentTime(a.currentTime);
      if (loopGuardRef.current) return;
      if (!item) return;
      if (a.currentTime < item.endTime) return;
      if (!loop) {
        a.pause();
        return;
      }
      // Pause-seek-verify-play sequence. iOS Safari's mid-play `currentTime`
      // setter rounds to the nearest decoded MP3 frame, which on VBR audio
      // drifts slightly earlier each loop. Pausing first dodges that
      // quirk; the seeked → verify → tiny nudge corrects any residual drift
      // before play resumes.
      loopGuardRef.current = true;
      a.pause();
      a.currentTime = item.startTime;
      const onSeeked = () => {
        a.removeEventListener("seeked", onSeeked);
        const drift = item.startTime - a.currentTime;
        if (drift > 0.02) {
          // Landed before startTime — nudge slightly past target so the
          // next decoded frame falls at or after startTime.
          a.currentTime = item.startTime + 0.01;
        }
        a.playbackRate = speed;
        a.play()
          .then(() => {
            loopGuardRef.current = false;
          })
          .catch(() => {
            loopGuardRef.current = false;
          });
      };
      a.addEventListener("seeked", onSeeked);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [item, loop, speed]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const advance = useCallback(
    async (verdict: SrsVerdict) => {
      if (!item) return;
      const prevSrs = item.srs;
      const cursorWas = cursor;
      // Optimistic local apply
      const next = applyVerdict(prevSrs, verdict);
      const newSrs: SrsState = {
        ease_factor: next.ease_factor,
        interval_days: next.interval_days,
        lapses: next.lapses,
      };

      let removedFromCursor: number | null = null;
      setQueue((prev) => {
        const copy = prev.slice();
        if (verdict === "again") {
          // re-insert this item at the back so the user sees it again in-session
          const moved = { ...copy[cursorWas], srs: newSrs };
          copy.splice(cursorWas, 1);
          copy.push(moved);
          removedFromCursor = null; // cursor stays the same; next item is at same index
        } else {
          copy[cursorWas] = { ...copy[cursorWas], srs: newSrs };
          removedFromCursor = cursorWas;
        }
        return copy;
      });
      if (verdict !== "again") {
        setCursor((c) => c + 1);
      }
      setUndoStack((u) => [...u.slice(-2), { item, prevSrs, cursorWas, removedFromCursor }]);

      // Persist
      try {
        await fetch(`/api/bookmarks/${item.bookmarkId}/verdict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verdict }),
        });
      } catch {
        /* swallow; client state already updated */
      }
    },
    [cursor, item],
  );

  const undo = useCallback(async () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((u) => u.slice(0, -1));
    setQueue((prev) => {
      const copy = prev.slice();
      // Find the item by id (it might be at the back if it was an Again)
      const idx = copy.findIndex((q) => q.bookmarkId === last.item.bookmarkId);
      if (idx >= 0) copy.splice(idx, 1);
      copy.splice(last.cursorWas, 0, { ...last.item, srs: last.prevSrs });
      return copy;
    });
    setCursor(last.cursorWas);

    // Persist previous state via the restore branch
    try {
      await fetch(`/api/bookmarks/${last.item.bookmarkId}/verdict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: last.prevSrs }),
      });
    } catch {
      /* swallow */
    }
  }, [undoStack]);

  if (!item) {
    return (
      <div className="m-practice">
        <div className="m-practice-bar">
          <button
            type="button"
            className="m-icon-btn"
            aria-label="Exit"
            onClick={() => router.push("/bookmarks")}
          >
            <CloseIcon />
          </button>
          <div className="m-practice-progress-text">
            <div className="m-practice-progress-label">Practice all</div>
            <div className="m-practice-progress-num">done</div>
          </div>
          <div style={{ width: 40 }} />
        </div>
        <div className="m-practice-body" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 36, margin: 0, fontWeight: 400 }}>
            All done.
          </h2>
          <p style={{ color: "var(--text-3)", margin: 0 }}>
            You&apos;ve practiced everything that was due. Come back later — more sentences will surface as their intervals elapse.
          </p>
          <Link href="/bookmarks" style={{ color: "var(--accent-text)" }}>
            ← Back to bookmarks
          </Link>
        </div>
      </div>
    );
  }

  const folderTint = item.folder ? folderColor(item.folder) : "var(--text-3)";

  return (
    <div className="m-practice">
      {/* Top bar */}
      <div className="m-practice-bar">
        <button
          type="button"
          className="m-icon-btn"
          aria-label="Exit"
          onClick={() => router.push("/bookmarks")}
        >
          <CloseIcon />
        </button>
        <div className="m-practice-progress-text">
          <div className="m-practice-progress-label">Practice all</div>
          <div className="m-practice-progress-num">
            {cursor + 1} / {total}
          </div>
        </div>
        <button type="button" className="m-icon-btn" aria-label="Settings">
          <SettingsIcon />
        </button>
      </div>

      <div className="m-practice-bar-track">
        <div
          className="m-practice-bar-fill"
          style={{ width: `${((cursor + 1) / total) * 100}%` }}
        />
      </div>

      <div className="m-practice-body">
        {/* Source pill */}
        <Link
          href={`/player/${item.videoId}?t=${item.startTime}`}
          className="m-practice-src"
          style={{ color: folderTint }}
        >
          <span className="m-practice-src-thumb"><ThumbPlayIcon /></span>
          <span className="m-practice-src-folder">
            {item.folderName && (
              <>
                <span className="m-practice-src-folder-dot" />
                <span style={{ color: "var(--text-2)" }}>{item.folderName}</span>
              </>
            )}
            {!item.folderName && (
              <span style={{ color: "var(--text-3)" }}>{item.videoTitle}</span>
            )}
          </span>
          <span className="m-practice-src-time">{formatTime(item.startTime)}</span>
        </Link>

        {/* Sentence card */}
        <div className="m-practice-card">
          <p className="m-practice-en">{item.text}</p>
          {item.translation && (
            <p
              className={"m-practice-ko" + (showKo ? "" : " is-peeking")}
              onClick={() => !showKo && setShowKo(true)}
            >
              {item.translation}
            </p>
          )}
          {item.note && (
            <span className="m-practice-note">
              <NoteIcon />
              {item.note}
            </span>
          )}
        </div>

        {/* Compact player */}
        <div className="m-practice-player">
          <button
            type="button"
            className="m-practice-player-play"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="m-practice-player-time">
            {formatTime(currentTime - item.startTime)}
          </span>
          <div className="m-practice-player-spacer" />
          <button
            type="button"
            className="m-practice-player-speed"
            onClick={() => setSpeedI((i) => (i + 1) % SPEEDS.length)}
            aria-label="Cycle speed"
          >
            {speed.toFixed(2).replace(/\.?0+$/, "")}×
          </button>
        </div>

        {/* Tool chips */}
        <div className="m-practice-tools">
          <button
            type="button"
            className={"m-practice-tool" + (shadow ? " is-on" : "")}
            onClick={() => setShadow((v) => !v)}
          >
            <ShadowIcon /> Shadow
          </button>
          <button
            type="button"
            className={"m-practice-tool" + (loop ? " is-on" : "")}
            onClick={() => setLoop((v) => !v)}
          >
            <LoopIcon /> A–B loop
          </button>
          <button
            type="button"
            className={"m-practice-tool" + (!showKo ? " is-on" : "")}
            onClick={() => setShowKo((v) => !v)}
          >
            <EyeIcon /> {showKo ? "Hide KO" : "Show KO"}
          </button>
        </div>
      </div>

      {/* SRS footer */}
      <div className="m-practice-foot">
        <div className="m-practice-foot-label">How well did you shadow this?</div>
        <div className="m-practice-srs">
          <button type="button" className="m-srs-btn again" onClick={() => advance("again")}>
            <span className="m-srs-btn-label">Again</span>
            <span className="m-srs-btn-sub">{intervalLabel("again", item.srs)}</span>
          </button>
          <button type="button" className="m-srs-btn good" onClick={() => advance("good")}>
            <span className="m-srs-btn-label">Good</span>
            <span className="m-srs-btn-sub">{intervalLabel("good", item.srs)}</span>
          </button>
          <button type="button" className="m-srs-btn easy" onClick={() => advance("easy")}>
            <span className="m-srs-btn-label">Easy</span>
            <span className="m-srs-btn-sub">{intervalLabel("easy", item.srs)}</span>
          </button>
        </div>
        <button
          type="button"
          className="m-srs-btn undo"
          onClick={undo}
          disabled={undoStack.length === 0}
        >
          ← Undo last
        </button>
      </div>

      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        style={{ display: "none" }}
      />
    </div>
  );
}
