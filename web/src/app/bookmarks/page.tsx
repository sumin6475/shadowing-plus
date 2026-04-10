"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Video, Segment, Bookmark } from "@/lib/types";

interface BookmarkWithDetails extends Bookmark {
  segment: Segment & { video: Video };
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithDetails[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [filterVideoId, setFilterVideoId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("bookmarks")
        .select("*, segment:segments(*, video:videos(*))")
        .order("created_at", { ascending: false });

      if (data) {
        setBookmarks(data as unknown as BookmarkWithDetails[]);
        // Extract unique videos
        const videoMap = new Map<string, Video>();
        for (const b of data as unknown as BookmarkWithDetails[]) {
          if (b.segment?.video) {
            videoMap.set(b.segment.video.id, b.segment.video);
          }
        }
        setVideos(Array.from(videoMap.values()));
      }
      setLoading(false);
    }
    load();
  }, []);

  const playSegment = useCallback(
    (bookmark: BookmarkWithDetails) => {
      const audio = audioRef.current;
      if (!audio) return;

      const seg = bookmark.segment;
      const videoUrl = seg.video.audio_url;

      if (audio.src !== videoUrl) {
        audio.src = videoUrl;
      }

      audio.currentTime = seg.start_time;
      audio.play();
      setPlayingId(bookmark.id);

      // Stop at segment end
      const checkEnd = () => {
        if (audio.currentTime >= seg.end_time) {
          audio.pause();
          audio.removeEventListener("timeupdate", checkEnd);
          setPlayingId(null);
        }
      };
      audio.addEventListener("timeupdate", checkEnd);
    },
    [],
  );

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
  }, []);

  const filtered =
    filterVideoId === "all"
      ? bookmarks
      : bookmarks.filter((b) => b.segment?.video?.id === filterVideoId);

  return (
    <div className="flex flex-col min-h-full">
      <audio ref={audioRef} preload="none" />

      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Home"
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
            <h1 className="text-lg font-bold">Bookmarks</h1>
          </div>

          {videos.length > 1 && (
            <select
              value={filterVideoId}
              onChange={(e) => setFilterVideoId(e.target.value)}
              className="text-sm bg-card border border-border rounded-lg px-2 py-1 text-foreground"
            >
              <option value="all">All</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg mb-2">No bookmarks yet</p>
              <p className="text-sm">
                Bookmark sentences while practicing
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((bookmark) => {
                const seg = bookmark.segment;
                if (!seg) return null;

                return (
                  <div
                    key={bookmark.id}
                    className="bg-card rounded-lg border border-border p-4"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => playSegment(bookmark)}
                        className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                          playingId === bookmark.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                        aria-label="Play"
                      >
                        {playingId === bookmark.id ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <rect x="3" y="2" width="4" height="12" rx="1" />
                            <rect x="9" y="2" width="4" height="12" rx="1" />
                          </svg>
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M4 2.5v11l9-5.5z" />
                          </svg>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-relaxed">
                          {seg.text}
                        </p>
                        {seg.translation && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {seg.translation}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Link
                            href={`/player/${seg.video?.id}`}
                            className="text-xs text-primary hover:underline truncate"
                          >
                            {seg.video?.title}
                          </Link>
                        </div>
                      </div>

                      <button
                        onClick={() => removeBookmark(bookmark.id)}
                        className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove bookmark"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
