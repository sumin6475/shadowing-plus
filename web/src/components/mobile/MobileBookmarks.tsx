"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Video } from "@/lib/types";
import type { BookmarkItemData } from "@/components/bookmarks/BookmarkItem";
import MobileTabBar from "./MobileTabBar";
import {
  BackIcon,
  DotsIcon,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  PracticeIcon,
  SortIcon,
  TrashIcon,
} from "./Icons";

export interface MobileBookmarkGroup {
  videoId: string;
  videoTitle: string;
  mediaType: Video["media_type"];
  folderName: string | null;
  folderColor: string | null;
  duration: number | null;
  items: BookmarkItemData[];
}

interface Props {
  groups: MobileBookmarkGroup[];
  visible: MobileBookmarkGroup[];
  filters: { id: string; label: string; count: number }[];
  filterVideoId: string;
  setFilter: (id: string) => void;
  totalCount: number;
  loading: boolean;
  playingBookmarkId: string | null;
  /** Deep-link target to highlight + scroll to (from the Review bot). */
  highlightedBookmarkId?: string | null;
  onPlay: (bm: BookmarkItemData) => void;
  onRemove: (bookmarkId: string) => void;
  onEditNote: (bookmarkId: string, current: string | null) => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function MobileBookmarks({
  groups,
  visible,
  filters,
  filterVideoId,
  setFilter,
  totalCount,
  loading,
  playingBookmarkId,
  highlightedBookmarkId,
  onPlay,
  onRemove,
  onEditNote,
}: Props) {
  const router = useRouter();

  return (
    <div className="m-app">
      {/* TOP BAR */}
      <div className="m-bar">
        <button
          type="button"
          className="m-icon-btn bordered"
          aria-label="Back"
          onClick={() => router.push("/")}
        >
          <BackIcon />
        </button>
        <div className="m-bar-spacer">
          <div className="m-bar-title" style={{ fontSize: 18 }}>
            Bookmarks
          </div>
        </div>
        <button type="button" className="m-icon-btn" aria-label="Sort">
          <SortIcon />
        </button>
        <button type="button" className="m-icon-btn" aria-label="More">
          <DotsIcon />
        </button>
      </div>

      {/* CONTENT */}
      <div className="m-content">
        <div>
          <h1 className="m-page-title">Saved sentences</h1>
          <div className="m-bm-stats">
            <span><b>{totalCount}</b> sentences</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span>from <b>{groups.length}</b> {groups.length === 1 ? "clip" : "clips"}</span>
          </div>
        </div>

        {loading ? (
          <div className="m-empty">Loading bookmarks…</div>
        ) : groups.length === 0 ? (
          <div className="m-empty">
            <p style={{ marginBottom: 12 }}>No bookmarks yet.</p>
            <Link href="/" style={{ color: "var(--accent-text)" }}>
              Pick a clip to start saving sentences →
            </Link>
          </div>
        ) : (
          <>
            <div className="m-chips" role="tablist">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={"m-chip" + (filterVideoId === f.id ? " active" : "")}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  <span className="m-chip-count">{f.count}</span>
                </button>
              ))}
            </div>

            {visible.map((g) => (
              <div className="m-bm-group" key={g.videoId}>
                <div className="m-bm-group-head">
                  <span className="m-bm-group-thumb">
                    <PlayIcon />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Link
                      href={`/player/${g.videoId}`}
                      className="m-bm-group-title"
                      style={{ display: "block", color: "inherit", textDecoration: "none" }}
                    >
                      {g.videoTitle}
                    </Link>
                    <div className="m-bm-group-meta">
                      {g.folderName ? (
                        <>
                          <b style={{ color: g.folderColor ?? "var(--text-3)" }}>
                            {g.folderName}
                          </b>
                          {" · "}
                        </>
                      ) : null}
                      {g.items.length} bookmark{g.items.length === 1 ? "" : "s"}
                      {g.duration ? ` · ${formatDuration(g.duration)}` : ""}
                    </div>
                  </div>
                  <Link
                    href={`/practice?clip=${g.videoId}`}
                    className="m-icon-btn"
                    style={{ color: "var(--accent-text)" }}
                    aria-label="Practice this clip"
                  >
                    <PracticeIcon />
                  </Link>
                </div>

                {g.items.map((bm) => {
                  const isPlaying = playingBookmarkId === bm.bookmarkId;
                  const isHighlighted =
                    highlightedBookmarkId === bm.bookmarkId;
                  return (
                    <div
                      key={bm.bookmarkId}
                      id={`m-bm-${bm.bookmarkId}`}
                      className={
                        "m-bm-card" + (isHighlighted ? " highlighted" : "")
                      }
                    >
                      <div className="m-bm-card-time">{formatTime(bm.startTime)}</div>
                      <p className="m-bm-card-en">{bm.text}</p>
                      {bm.translation && (
                        <p className="m-bm-card-ko">{bm.translation}</p>
                      )}
                      {bm.note && (
                        <span className="m-bm-card-note">
                          <NoteIcon />
                          {bm.note}
                        </span>
                      )}
                      <div className="m-bm-card-foot">
                        <span className="m-bm-card-date">{bm.date}</span>
                        <div className="m-bm-card-actions">
                          <button
                            type="button"
                            className="m-bm-action"
                            aria-label="Edit note"
                            onClick={() => onEditNote(bm.bookmarkId, bm.note)}
                          >
                            <NoteIcon />
                          </button>
                          <button
                            type="button"
                            className="m-bm-action"
                            aria-label="Delete"
                            onClick={() => onRemove(bm.bookmarkId)}
                          >
                            <TrashIcon />
                          </button>
                          <button
                            type="button"
                            className="m-bm-action primary"
                            aria-label={isPlaying ? "Pause" : "Play"}
                            onClick={() => onPlay(bm)}
                          >
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Practice all FAB */}
      <Link href="/practice" className="m-fab">
        <PracticeIcon /> Practice all
      </Link>

      <MobileTabBar active="bookmarks" />
    </div>
  );
}
