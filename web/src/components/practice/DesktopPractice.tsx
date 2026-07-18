"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SrsVerdict } from "@/lib/types";
import { folderColor } from "@/lib/folder-color";
import { applyVerdict, type SrsState } from "@/lib/srs";
import { resolveAudioUrl } from "@/lib/resolve-media";
import type { PracticeQueueItem } from "@/components/mobile/MobilePractice";
import { PauseIcon, PlayIcon } from "@/components/clip/Icons";
import { SettingsIcon } from "@/components/mobile/Icons";
import { PlayIcon as ThumbPlayIcon } from "@/components/home/Icons";

const SPEEDS = [0.5, 0.7, 0.85, 1.0, 1.15, 1.25, 1.5];

interface UndoEntry {
  item: PracticeQueueItem;
  prevSrs: SrsState;
  cursorWas: number;
  wasAgain: boolean;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function prettySpeed(s: number): string {
  return s.toFixed(2).replace(/\.?0+$/, "") + "×";
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

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
function ShadowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8c1-2.5 2.4-3.5 4.5-3.5S11.5 5.5 12.5 8" />
      <path d="M3.5 8c1 2.5 2.4 3.5 4.5 3.5S11.5 10.5 12.5 8" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}
function LoopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5.5h7a3 3 0 010 6H5.5" />
      <path d="M5 3.5L3 5.5l2 2" />
      <path d="M11 13.5l2-2-2-2" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8s2.2-3.5 6-3.5S14 8 14 8s-2.2 3.5-6 3.5S2 8 2 8z" />
      <circle cx="8" cy="8" r="1.6" />
    </svg>
  );
}
function DoneCheck() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5 11-11" />
    </svg>
  );
}

export default function DesktopPractice({
  initialQueue,
}: {
  initialQueue: PracticeQueueItem[];
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<PracticeQueueItem[]>(initialQueue);
  const [cursor, setCursor] = useState(0);
  const [verdicts, setVerdicts] = useState<SrsVerdict[]>([]);
  const [showKo, setShowKo] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [loop, setLoop] = useState(true);
  const [speedI, setSpeedI] = useState(2); // 0.85
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  const total = queue.length;
  const item = queue[cursor];
  const isDone = !item;
  const speed = SPEEDS[speedI];

  // Wire audio src + seek. Seek must wait for loadedmetadata; setting
  // currentTime before metadata is ignored by some browsers (iOS Safari).
  // The item's audioUrl is a bare R2 key, so resolve it to a signed URL first.
  useEffect(() => {
    if (!item || !audioRef.current) return;
    const a = audioRef.current;
    let cancelled = false;
    const seek = () => {
      a.currentTime = item.startTime;
      setCurrentTime(item.startTime);
    };
    a.playbackRate = speed;
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
      if (item && a.currentTime >= item.endTime) {
        if (loop) a.currentTime = item.startTime;
        else a.pause();
      }
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
  }, [item, loop]);

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
      const next = applyVerdict(prevSrs, verdict);
      const newSrs: SrsState = {
        ease_factor: next.ease_factor,
        interval_days: next.interval_days,
        lapses: next.lapses,
      };

      setQueue((prev) => {
        const copy = prev.slice();
        if (verdict === "again") {
          const moved = { ...copy[cursorWas], srs: newSrs };
          copy.splice(cursorWas, 1);
          copy.push(moved);
        } else {
          copy[cursorWas] = { ...copy[cursorWas], srs: newSrs };
        }
        return copy;
      });
      if (verdict !== "again") setCursor((c) => c + 1);
      setVerdicts((v) => [...v, verdict]);
      setUndoStack((u) => [...u.slice(-2), { item, prevSrs, cursorWas, wasAgain: verdict === "again" }]);

      try {
        await fetch(`/api/bookmarks/${item.bookmarkId}/verdict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verdict }),
        });
      } catch {
        /* swallow */
      }
    },
    [cursor, item],
  );

  const undo = useCallback(async () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((u) => u.slice(0, -1));
    setVerdicts((v) => v.slice(0, -1));
    setQueue((prev) => {
      const copy = prev.slice();
      const idx = copy.findIndex((q) => q.bookmarkId === last.item.bookmarkId);
      if (idx >= 0) copy.splice(idx, 1);
      copy.splice(last.cursorWas, 0, { ...last.item, srs: last.prevSrs });
      return copy;
    });
    setCursor(last.cursorWas);
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

  const restart = useCallback(() => {
    setQueue(initialQueue);
    setCursor(0);
    setVerdicts([]);
    setUndoStack([]);
  }, [initialQueue]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (isDone) {
        if (e.key === "Escape") router.push("/bookmarks");
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "1") advance("again");
      else if (e.key === "2") advance("good");
      else if (e.key === "3") advance("easy");
      else if (e.key === "k" || e.key === "K" || e.key === "t" || e.key === "T") {
        setShowKo((v) => !v);
      } else if (e.key === "l" || e.key === "L") setLoop((v) => !v);
      else if (e.key === "s" || e.key === "S") setShadow((v) => !v);
      else if (e.key === ",") setSpeedI((i) => (i + 1) % SPEEDS.length);
      else if (e.key === "Escape") router.push("/bookmarks");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, isDone, router, togglePlay]);

  if (isDone) {
    const stats = {
      total: verdicts.length,
      again: verdicts.filter((v) => v === "again").length,
      good: verdicts.filter((v) => v === "good").length,
      easy: verdicts.filter((v) => v === "easy").length,
    };
    return (
      <div className="pr-page">
        <div className="pr-bar">
          <div className="pr-bar-inner">
            <div className="pr-bar-left">
              <button
                type="button"
                className="pr-back"
                onClick={() => router.push("/bookmarks")}
                aria-label="Exit"
              >
                <CloseIcon />
              </button>
              <div className="pr-crumb">
                <Link href="/bookmarks">Bookmarks</Link>
                <span className="sep">›</span>
                <span className="current">Practice all</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pr-done">
          <span className="pr-done-glyph"><DoneCheck /></span>
          <h1 className="pr-done-title">Session complete</h1>
          <p className="pr-done-sub">
            Nice work. {stats.total} sentence{stats.total === 1 ? "" : "s"} reviewed.
            Cards you marked <b style={{ color: "oklch(0.50 0.16 28)" }}>Again</b> are
            scheduled to return shortly.
          </p>
          <div className="pr-done-stats">
            <div className="pr-done-stat">
              <div className="pr-done-stat-num">{stats.again}</div>
              <div className="pr-done-stat-label">Again</div>
            </div>
            <div className="pr-done-stat">
              <div className="pr-done-stat-num">{stats.good}</div>
              <div className="pr-done-stat-label">Good</div>
            </div>
            <div className="pr-done-stat">
              <div className="pr-done-stat-num">{stats.easy}</div>
              <div className="pr-done-stat-label">Easy</div>
            </div>
          </div>
          <div className="pr-done-actions">
            <button type="button" className="pr-done-btn" onClick={restart}>
              Practice again
            </button>
            <Link href="/bookmarks" className="pr-done-btn primary">
              Back to bookmarks
            </Link>
          </div>
        </div>
        <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
      </div>
    );
  }

  const folderTint = item.folder ? folderColor(item.folder) : "var(--text-3)";
  const upNext = queue.slice(cursor + 1, cursor + 3);
  const playerDuration = item.endTime - item.startTime;
  const playerPos = Math.max(0, currentTime - item.startTime);
  const playerPct = playerDuration > 0 ? Math.min(100, (playerPos / playerDuration) * 100) : 0;

  return (
    <div className="pr-page">
      {/* Top bar */}
      <div className="pr-bar">
        <div className="pr-bar-inner">
          <div className="pr-bar-left">
            <button
              type="button"
              className="pr-back"
              onClick={() => router.push("/bookmarks")}
              aria-label="Exit"
            >
              <CloseIcon />
            </button>
            <div className="pr-crumb">
              <Link href="/bookmarks">Bookmarks</Link>
              <span className="sep">›</span>
              <span className="current">Practice all</span>
            </div>
          </div>
          <div className="pr-bar-right">
            <button
              type="button"
              className="pr-undo-btn"
              onClick={undo}
              disabled={undoStack.length === 0}
            >
              ← Undo
            </button>
            <div className="pr-progress-pill">
              <span>
                <b>{cursor + 1}</b> / {total}
              </span>
              <div className="pr-pip-track">
                <div
                  className="pr-pip-fill"
                  style={{ width: `${((cursor + 1) / total) * 100}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              className="pr-back"
              aria-label="Settings"
              title="Settings (coming soon)"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="pr-stage">
        <div className="pr-stage-col">
          {/* Source pill */}
          <Link
            href={`/player/${item.videoId}?t=${item.startTime}`}
            className="pr-src"
            style={{ color: folderTint }}
          >
            <span className="pr-src-thumb"><ThumbPlayIcon /></span>
            {item.folderName && (
              <span className="pr-src-folder">
                <span className="pr-src-dot" />
                <span style={{ color: "var(--text-2)" }}>{item.folderName}</span>
              </span>
            )}
            <span className="pr-src-clip">{item.videoTitle}</span>
            <span className="pr-src-time">{formatTime(item.startTime)}</span>
          </Link>

          {/* Sentence */}
          <div className="pr-sentence">
            <p className="pr-en">{item.text}</p>
            {item.translation && (
              showKo ? (
                <p className="pr-ko">{item.translation}</p>
              ) : (
                <>
                  <p className="pr-ko is-peeking" onClick={() => setShowKo(true)}>
                    {item.translation}
                  </p>
                  <button
                    type="button"
                    className="pr-peek-row"
                    onClick={() => setShowKo(true)}
                  >
                    Tap to reveal translation
                    <kbd>K</kbd>
                  </button>
                </>
              )
            )}
            {item.note && (
              <span className="pr-note">{item.note}</span>
            )}
          </div>

          {/* Compact player */}
          <div className="pr-player">
            <button
              type="button"
              className="pr-player-play"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <span className="pr-player-time">{formatTime(playerPos)}</span>
            <div
              className="pr-player-progress"
              role="slider"
              aria-valuemin={0}
              aria-valuemax={playerDuration}
              aria-valuenow={playerPos}
              onClick={(e) => {
                const a = audioRef.current;
                if (!a) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                a.currentTime = item.startTime + Math.max(0, Math.min(1, ratio)) * playerDuration;
              }}
            >
              <div className="pr-player-progress-fill" style={{ width: `${playerPct}%` }} />
            </div>
            <span className="pr-player-time" style={{ textAlign: "right" }}>
              {formatTime(playerDuration)}
            </span>
            <button
              type="button"
              className="pr-player-speed"
              onClick={() => setSpeedI((i) => (i + 1) % SPEEDS.length)}
              aria-label="Cycle speed"
            >
              {prettySpeed(speed)}
            </button>
          </div>

          {/* Tools */}
          <div className="pr-tools">
            <button
              type="button"
              className={"pr-tool" + (shadow ? " is-on" : "")}
              onClick={() => setShadow((v) => !v)}
            >
              <ShadowIcon /> Shadow line <span className="key">S</span>
            </button>
            <button
              type="button"
              className={"pr-tool" + (loop ? " is-on" : "")}
              onClick={() => setLoop((v) => !v)}
            >
              <LoopIcon /> A–B loop <span className="key">L</span>
            </button>
            <button
              type="button"
              className={"pr-tool" + (!showKo ? " is-on" : "")}
              onClick={() => setShowKo((v) => !v)}
            >
              <EyeIcon /> {showKo ? "Hide translation" : "Show translation"}{" "}
              <span className="key">K</span>
            </button>
          </div>
        </div>

        {/* SRS row */}
        <div className="pr-srs-wrap">
          <div className="pr-srs-label">How well did you shadow this?</div>
          <div className="pr-srs">
            <button type="button" className="pr-srs-btn again" onClick={() => advance("again")}>
              <span className="pr-srs-key">1</span>
              <span className="pr-srs-btn-label">Again</span>
              <span className="pr-srs-btn-sub">{intervalLabel("again", item.srs)}</span>
            </button>
            <button type="button" className="pr-srs-btn good" onClick={() => advance("good")}>
              <span className="pr-srs-key">2</span>
              <span className="pr-srs-btn-label">Good</span>
              <span className="pr-srs-btn-sub">{intervalLabel("good", item.srs)}</span>
            </button>
            <button type="button" className="pr-srs-btn easy" onClick={() => advance("easy")}>
              <span className="pr-srs-key">3</span>
              <span className="pr-srs-btn-label">Easy</span>
              <span className="pr-srs-btn-sub">{intervalLabel("easy", item.srs)}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pr-foot">
          <div className="pr-foot-left">
            <span className="pr-up-label">Up next</span>
            <div className="pr-up-list">
              {upNext.length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--text-4)" }}>
                  You&apos;re on the last one
                </span>
              ) : (
                upNext.map((nx) => (
                  <span key={nx.bookmarkId} className="pr-up-pill">
                    <span className="t">{formatTime(nx.startTime)}</span>
                    <span className="en">{nx.text}</span>
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="pr-shortcuts">
            <span><b>Space</b>Play</span>
            <span><b>1·2·3</b>Verdict</span>
            <span><b>K</b>Translation</span>
            <span><b>Esc</b>Exit</span>
          </div>
        </div>
      </div>

      <audio ref={audioRef} preload="auto" style={{ display: "none" }} />
    </div>
  );
}
