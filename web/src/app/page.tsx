"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Video } from "@/lib/types";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setVideos(data ?? []);
        setLoading(false);
      });
  }, []);

  const deleteVideo = useCallback(async (e: React.MouseEvent, video: Video) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${video.title}"?\nAll segments and bookmarks will also be deleted.`)) {
      return;
    }
    await supabase.from("videos").delete().eq("id", video.id);
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
  }, []);

  const startEditing = useCallback((e: React.MouseEvent, video: Video) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(video.id);
    setEditTitle(video.title);
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  const saveTitle = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    await supabase.from("videos").update({ title: trimmed }).eq("id", editingId);
    setVideos((prev) =>
      prev.map((v) => (v.id === editingId ? { ...v, title: trimmed } : v)),
    );
    setEditingId(null);
  }, [editingId, editTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveTitle();
      } else if (e.key === "Escape") {
        setEditingId(null);
      }
    },
    [saveTitle],
  );

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary">Shadowing+</h1>
          <Link
            href="/bookmarks"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Bookmarks
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg mb-2">No videos yet</p>
              <p className="text-sm">
                Process a video with process.py to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {videos.map((video) => (
                <Link
                  key={video.id}
                  href={`/player/${video.id}`}
                  className="group block bg-card rounded-lg border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {editingId === video.id ? (
                      <input
                        ref={inputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.preventDefault()}
                        className="font-medium text-card-foreground bg-transparent border-b-2 border-primary outline-none flex-1 mr-3"
                        autoFocus
                      />
                    ) : (
                      <h2
                        className="font-medium text-card-foreground"
                        onClick={(e) => startEditing(e, video)}
                        title="Click to edit title"
                      >
                        {video.title}
                      </h2>
                    )}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-muted-foreground font-mono">
                        {formatDuration(video.duration)}
                      </span>
                      <button
                        onClick={(e) => deleteVideo(e, video)}
                        className="p-1 text-transparent group-hover:text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete video"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
