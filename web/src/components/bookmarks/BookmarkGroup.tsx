"use client";

import Link from "next/link";
import type { MediaType } from "@/lib/types";
import BookmarkItem, { type BookmarkItemData } from "./BookmarkItem";
import { PlayIcon } from "./Icons";

function formatDurationLabel(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlayState {
  /** Which bookmark, if any, is currently playing inside this group. */
  playingBookmarkId: string | null;
}

interface Props {
  videoId: string;
  videoTitle: string;
  mediaType: MediaType;
  folderName: string | null;
  duration: number | null;
  items: BookmarkItemData[];
  play: PlayState;
  /** Deep-link target to highlight + scroll to, if it lives in this group. */
  highlightedBookmarkId?: string | null;
  onPlayBookmark: (bm: BookmarkItemData) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
}

export default function BookmarkGroup({
  videoId,
  videoTitle,
  mediaType,
  folderName,
  duration,
  items,
  play,
  highlightedBookmarkId,
  onPlayBookmark,
  onRemoveBookmark,
}: Props) {
  const count = items.length;
  return (
    <section className="bm-group">
      <div className="bm-group-head">
        <div className="bm-group-thumb" data-kind={mediaType}>
          <PlayIcon />
        </div>
        <div className="bm-group-body">
          <Link href={`/player/${videoId}`} className="bm-group-title">
            {videoTitle}
          </Link>
          <div className="bm-group-meta">
            {folderName ? (
              <>
                <b>{folderName}</b>
                <span className="dot" />
              </>
            ) : null}
            {count} {count === 1 ? "bookmark" : "bookmarks"}
            <span className="dot" />
            {formatDurationLabel(duration)}
          </div>
        </div>
        <button
          type="button"
          className="btn ghost bm-group-action"
          disabled
          title="Practice mode (coming soon)"
        >
          Practice {count}
        </button>
      </div>
      <div className="bm-list">
        {items.map((bm) => (
          <BookmarkItem
            key={bm.bookmarkId}
            bm={bm}
            playing={play.playingBookmarkId === bm.bookmarkId}
            highlighted={highlightedBookmarkId === bm.bookmarkId}
            onPlay={() => onPlayBookmark(bm)}
            onRemove={() => onRemoveBookmark(bm.bookmarkId)}
          />
        ))}
      </div>
    </section>
  );
}
