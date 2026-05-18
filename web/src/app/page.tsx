"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Folder, Job, Video } from "@/lib/types";
import UploadDropzone from "@/components/UploadDropzone";
import JobCard from "@/components/JobCard";

const EXPANDED_KEY = "sp:folders:expanded";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function loadExpanded(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveExpanded(set: Set<string>) {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export default function HomePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<"main" | "move">("main");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(loadExpanded());
  }, []);

  const refreshAll = useCallback(async () => {
    const [foldersRes, videosRes, jobsRes] = await Promise.all([
      supabase.from("folders").select("*").order("created_at"),
      supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    setFolders(foldersRes.data ?? []);
    setVideos(videosRes.data ?? []);
    setJobs(jobsRes.data ?? []);
  }, []);

  useEffect(() => {
    refreshAll().then(() => setLoading(false));
  }, [refreshAll]);

  // Realtime subscription to jobs — keeps progress bars / retry state fresh.
  useEffect(() => {
    const channel = supabase
      .channel("jobs-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          setJobs((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((j) => j.id !== (payload.old as Job).id);
            }
            const next = payload.new as Job;
            const idx = prev.findIndex((j) => j.id === next.id);
            // When a job becomes "ready" a new video appears; refresh videos.
            if (
              next.status === "ready" &&
              (idx === -1 || prev[idx].status !== "ready")
            ) {
              refreshAll();
            }
            if (idx === -1) return [next, ...prev];
            const copy = prev.slice();
            copy[idx] = next;
            return copy;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  useEffect(() => {
    if (!menuOpenFor) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenFor(null);
        setMenuView("main");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenFor]);

  const toggleExpand = useCallback((folderId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      saveExpanded(next);
      return next;
    });
  }, []);

  const startCreateFolder = useCallback(() => {
    setCreatingFolder(true);
    setNewFolderName("");
    setTimeout(() => newFolderInputRef.current?.focus(), 0);
  }, []);

  const saveNewFolder = useCallback(async () => {
    const name = newFolderName.trim();
    if (!name) {
      setCreatingFolder(false);
      return;
    }
    const { data, error } = await supabase
      .from("folders")
      .insert({ name })
      .select()
      .single();
    if (error) {
      console.error("폴더 생성 실패:", error);
      alert(`폴더 생성 실패: ${error.message}`);
      return;
    }
    if (data) {
      setFolders((prev) => [...prev, data]);
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(data.id);
        saveExpanded(next);
        return next;
      });
    }
    setCreatingFolder(false);
    setNewFolderName("");
  }, [newFolderName]);

  const startRenameFolder = useCallback((folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
    setTimeout(() => folderInputRef.current?.select(), 0);
  }, []);

  const saveFolderName = useCallback(async () => {
    if (!editingFolderId) return;
    const trimmed = editFolderName.trim();
    if (!trimmed) {
      setEditingFolderId(null);
      return;
    }
    await supabase
      .from("folders")
      .update({ name: trimmed })
      .eq("id", editingFolderId);
    setFolders((prev) =>
      prev.map((f) => (f.id === editingFolderId ? { ...f, name: trimmed } : f)),
    );
    setEditingFolderId(null);
  }, [editingFolderId, editFolderName]);

  const deleteFolder = useCallback(async (folder: Folder) => {
    if (
      !confirm(
        `폴더 "${folder.name}"을 삭제할까요?\n안에 있는 영상은 루트로 이동합니다.`,
      )
    )
      return;
    await supabase.from("folders").delete().eq("id", folder.id);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setVideos((prev) =>
      prev.map((v) =>
        v.folder_id === folder.id ? { ...v, folder_id: null } : v,
      ),
    );
  }, []);

  const moveVideo = useCallback(
    async (videoId: string, folderId: string | null) => {
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, folder_id: folderId } : v)),
      );
      setMenuOpenFor(null);
      setMenuView("main");
      await supabase
        .from("videos")
        .update({ folder_id: folderId })
        .eq("id", videoId);
    },
    [],
  );

  const deleteVideo = useCallback(async (video: Video) => {
    if (
      !confirm(
        `Delete "${video.title}"?\nAll segments and bookmarks will also be deleted.`,
      )
    )
      return;
    // Server route cleans up R2 source + audio + JSON artifacts in addition to DB rows.
    await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    setMenuOpenFor(null);
    setMenuView("main");
  }, []);

  const startEditVideo = useCallback(
    (e: React.MouseEvent, video: Video) => {
      e.preventDefault();
      e.stopPropagation();
      setEditingVideoId(video.id);
      setEditVideoTitle(video.title);
      setTimeout(() => videoInputRef.current?.select(), 0);
    },
    [],
  );

  const saveVideoTitle = useCallback(async () => {
    if (!editingVideoId) return;
    const trimmed = editVideoTitle.trim();
    if (!trimmed) {
      setEditingVideoId(null);
      return;
    }
    await supabase
      .from("videos")
      .update({ title: trimmed })
      .eq("id", editingVideoId);
    setVideos((prev) =>
      prev.map((v) => (v.id === editingVideoId ? { ...v, title: trimmed } : v)),
    );
    setEditingVideoId(null);
  }, [editingVideoId, editVideoTitle]);

  const handleVideoKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveVideoTitle();
      } else if (e.key === "Escape") {
        setEditingVideoId(null);
      }
    },
    [saveVideoTitle],
  );

  const handleFolderKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveFolderName();
      } else if (e.key === "Escape") {
        setEditingFolderId(null);
      }
    },
    [saveFolderName],
  );

  const handleNewFolderKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveNewFolder();
      } else if (e.key === "Escape") {
        setCreatingFolder(false);
      }
    },
    [saveNewFolder],
  );

  const openMenu = useCallback(
    (e: React.MouseEvent, videoId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuOpenFor((cur) => (cur === videoId ? null : videoId));
      setMenuView("main");
    },
    [],
  );

  function renderVideoCard(video: Video) {
    const isMenuOpen = menuOpenFor === video.id;
    return (
      <Link
        key={video.id}
        href={`/player/${video.id}`}
        className="group relative block bg-card rounded-lg border border-border p-4 hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          {editingVideoId === video.id ? (
            <input
              ref={videoInputRef}
              value={editVideoTitle}
              onChange={(e) => setEditVideoTitle(e.target.value)}
              onBlur={saveVideoTitle}
              onKeyDown={handleVideoKey}
              onClick={(e) => e.preventDefault()}
              className="font-medium text-card-foreground bg-transparent border-b-2 border-primary outline-none flex-1 mr-3"
              autoFocus
            />
          ) : (
            <h2
              className="font-medium text-card-foreground truncate"
              onClick={(e) => startEditVideo(e, video)}
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
              onClick={(e) => openMenu(e, video.id)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="More actions"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3" cy="8" r="1.3" />
                <circle cx="8" cy="8" r="1.3" />
                <circle cx="13" cy="8" r="1.3" />
              </svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div
            ref={menuRef}
            onClick={(e) => e.preventDefault()}
            className="absolute right-3 top-12 z-20 bg-card border border-border rounded-lg shadow-lg min-w-[160px] py-1"
          >
            {menuView === "main" ? (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuView("move");
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  폴더로 이동 →
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteVideo(video);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  삭제
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuView("main");
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
                >
                  ← 뒤로
                </button>
                {video.folder_id && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      moveVideo(video.id, null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    루트로
                  </button>
                )}
                {folders
                  .filter((f) => f.id !== video.folder_id)
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        moveVideo(video.id, f.id);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors truncate"
                    >
                      📁 {f.name}
                    </button>
                  ))}
                {folders.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    폴더가 없습니다
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </Link>
    );
  }

  const rootVideos = videos.filter((v) => !v.folder_id);
  const videosByFolder = new Map<string, Video[]>();
  for (const v of videos) {
    if (v.folder_id) {
      const list = videosByFolder.get(v.folder_id) ?? [];
      list.push(v);
      videosByFolder.set(v.folder_id, list);
    }
  }

  const isEmpty =
    !loading && folders.length === 0 && videos.length === 0 && !creatingFolder;

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
        <div className="max-w-3xl mx-auto space-y-6">
          <UploadDropzone onJobQueued={refreshAll} />

          {jobs.filter((j) => j.status !== "ready").length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
                Processing
              </h2>
              <div className="grid gap-2">
                {jobs
                  .filter((j) => j.status !== "ready")
                  .map((j) => (
                    <JobCard key={j.id} job={j} onChanged={refreshAll} />
                  ))}
              </div>
            </section>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isEmpty ? (
            <>
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No videos yet</p>
                <p className="text-sm">Drop a file above to start studying.</p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={startCreateFolder}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  + 새 폴더
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                {creatingFolder ? (
                  <input
                    ref={newFolderInputRef}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={saveNewFolder}
                    onKeyDown={handleNewFolderKey}
                    placeholder="폴더 이름"
                    className="w-full px-3 py-2 text-sm bg-card border border-primary rounded-lg outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={startCreateFolder}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + 새 폴더
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                {folders.map((folder) => {
                  const isExpanded = expanded.has(folder.id);
                  const folderVideos = videosByFolder.get(folder.id) ?? [];
                  return (
                    <div
                      key={folder.id}
                      className="bg-card rounded-lg border border-border overflow-hidden"
                    >
                      <div className="flex items-center px-4 py-3">
                        <button
                          onClick={() => toggleExpand(folder.id)}
                          className="mr-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          >
                            <path d="M4 2l4 4-4 4" />
                          </svg>
                        </button>
                        <span className="mr-2 shrink-0">📁</span>
                        {editingFolderId === folder.id ? (
                          <input
                            ref={folderInputRef}
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            onBlur={saveFolderName}
                            onKeyDown={handleFolderKey}
                            className="font-medium bg-transparent border-b-2 border-primary outline-none flex-1 mr-3"
                            autoFocus
                          />
                        ) : (
                          <h2
                            className="font-medium flex-1 cursor-pointer truncate"
                            onClick={() => startRenameFolder(folder)}
                            title="Click to rename"
                          >
                            {folder.name}
                          </h2>
                        )}
                        <span className="text-xs text-muted-foreground font-mono mr-2 shrink-0">
                          {folderVideos.length}
                        </span>
                        <button
                          onClick={() => deleteFolder(folder)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          aria-label="Delete folder"
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

                      {isExpanded && folderVideos.length > 0 && (
                        <div className="border-t border-border bg-background/30 grid gap-2 p-2">
                          {folderVideos.map(renderVideoCard)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {rootVideos.map(renderVideoCard)}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
