"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Folder, Job, PracticeStatus, Video } from "@/lib/types";
import UploadDropzone, {
  type UploadDropzoneHandle,
} from "@/components/UploadDropzone";
import JobCard from "@/components/JobCard";
import Sidebar, { type ActiveSection } from "@/components/home/Sidebar";
import NewFolderModal from "@/components/home/NewFolderModal";
import ConfirmDeleteClipModal from "@/components/home/ConfirmDeleteClipModal";
import UndoToast from "@/components/home/UndoToast";
import StatusControl from "@/components/home/StatusControl";
import MobileLibrary from "@/components/mobile/MobileLibrary";
import {
  CheckIcon,
  ChevronDownIcon,
  DotsIcon,
  PlayIcon,
  PlusIcon,
  SortIcon,
} from "@/components/home/Icons";
import { folderColor } from "@/lib/folder-color";
import { clipKind } from "@/lib/clip-kind";

import "./home.css";

const ACTIVE_SECTION_KEY = "sp:home:section";
const RECENT_DAYS = 14;

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function loadActiveSection(): ActiveSection {
  if (typeof window === "undefined") return { kind: "all" };
  try {
    const raw = localStorage.getItem(ACTIVE_SECTION_KEY);
    if (!raw) return { kind: "all" };
    const parsed = JSON.parse(raw) as ActiveSection;
    if (
      parsed?.kind === "all" ||
      parsed?.kind === "recent" ||
      (parsed?.kind === "folder" && typeof parsed.id === "string")
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { kind: "all" };
}

function saveActiveSection(s: ActiveSection) {
  try {
    localStorage.setItem(ACTIVE_SECTION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export default function HomePage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ActiveSection>({ kind: "all" });

  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editVideoTitle, setEditVideoTitle] = useState("");
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);

  // Two-step destructive delete:
  // - pendingDelete: clip queued for the confirm modal
  // - recentlyDeleted: clip hidden locally after confirm; if Undo isn't pressed
  //   within `deleteTimerRef`'s window, commitDelete fires the real DELETE.
  const [pendingDelete, setPendingDelete] = useState<Video | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Video | null>(null);
  const deleteTimerRef = useRef<number | null>(null);
  const recentlyDeletedRef = useRef<Video | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "focusing" | "done">(
    "all",
  );

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuView, setMenuView] = useState<"main" | "move">("main");
  const menuRef = useRef<HTMLDivElement>(null);

  // Bulk selection: pick multiple clips and move them to a folder at once.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  const dropzoneRef = useRef<UploadDropzoneHandle>(null);

  // Hydrate active section from localStorage (client-only)
  useEffect(() => {
    setActive(loadActiveSection());
  }, []);

  const refreshAll = useCallback(async () => {
    const [foldersRes, videosRes, jobsRes, bookmarksRes] = await Promise.all([
      supabase.from("folders").select("*").order("created_at"),
      supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("bookmarks").select("id", { count: "exact", head: true }),
    ]);
    setFolders(foldersRes.data ?? []);
    setVideos(videosRes.data ?? []);
    setJobs(jobsRes.data ?? []);
    setBookmarksCount(bookmarksRes.count ?? 0);
  }, []);

  const handleYoutubeImport = useCallback(async () => {
    const trimmedUrl = youtubeUrl.trim();
    if (!trimmedUrl) return;

    setImporting(true);
    setImportError(null);

    try {
      const resp = await fetch("/api/youtube/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Failed to import YouTube video");
      }

      setYoutubeUrl("");

      fetch(`/api/jobs/${data.jobId}/run`, { method: "POST" }).catch((e) => {
        console.error("run failed", e);
      });

      await refreshAll();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }, [youtubeUrl, refreshAll]);

  useEffect(() => {
    refreshAll().then(() => setLoading(false));
  }, [refreshAll]);

  // Realtime jobs subscription
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

  // Close item menu on outside click
  useEffect(() => {
    if (!menuOpenFor) return;
    function handleClick(e: globalThis.MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenFor(null);
        setMenuView("main");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenFor]);

  // Close the bulk "move to folder" menu on outside click
  useEffect(() => {
    if (!bulkMoveOpen) return;
    function handleClick(e: globalThis.MouseEvent) {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setBulkMoveOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bulkMoveOpen]);

  const setSection = useCallback((s: ActiveSection) => {
    setActive(s);
    saveActiveSection(s);
    // Selections are scoped to the current view — drop them when it changes.
    setSelectedIds(new Set());
    setBulkMoveOpen(false);
  }, []);

  // Folder CRUD
  const openNewFolder = useCallback(() => setNewFolderOpen(true), []);

  const createFolder = useCallback(
    async (input: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from("folders")
        .insert({ name: input.name, color: input.color })
        .select()
        .single();
      if (error) {
        // Common cause: migration 006 not applied → no `color` column.
        if (/color/i.test(error.message)) {
          alert(
            "Couldn't save the folder color. Apply supabase/migrations/003_folder_color.sql, then try again.",
          );
        } else {
          alert(`Failed to create folder: ${error.message}`);
        }
        return;
      }
      if (data) {
        setFolders((prev) => [...prev, data as Folder]);
        setSection({ kind: "folder", id: data.id });
        setNewFolderOpen(false);
      }
    },
    [setSection],
  );

  const renameFolder = useCallback(async (id: string, name: string) => {
    await supabase.from("folders").update({ name }).eq("id", id);
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback(
    async (folder: Folder) => {
      if (
        !confirm(
          `Delete folder "${folder.name}"?\nClips inside will move to the root.`,
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
      if (active.kind === "folder" && active.id === folder.id) {
        setSection({ kind: "all" });
      }
    },
    [active, setSection],
  );

  const setFolderColor = useCallback(
    async (id: string, color: string) => {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, color } : f)),
      );
      const { error } = await supabase
        .from("folders")
        .update({ color })
        .eq("id", id);
      if (error) {
        // Likely the `color` column hasn't been added yet via migration 006.
        console.warn("folder color update failed:", error.message);
        alert(
          "Couldn't save the color. Apply supabase/migrations/003_folder_color.sql.",
        );
        refreshAll();
      }
    },
    [refreshAll],
  );

  // Video CRUD
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

  // Bulk move several clips to a folder (or to the root when folderId is null).
  const moveVideos = useCallback(
    async (ids: string[], folderId: string | null) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setVideos((prev) =>
        prev.map((v) => (idSet.has(v.id) ? { ...v, folder_id: folderId } : v)),
      );
      await supabase
        .from("videos")
        .update({ folder_id: folderId })
        .in("id", ids);
    },
    [],
  );

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setBulkMoveOpen(false);
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkMove = useCallback(
    async (folderId: string | null) => {
      await moveVideos(Array.from(selectedIds), folderId);
      exitSelectMode();
    },
    [selectedIds, moveVideos, exitSelectMode],
  );

  const setVideoStatus = useCallback(
    async (videoId: string, next: PracticeStatus) => {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, practice_status: next } : v,
        ),
      );
      const { error } = await supabase
        .from("videos")
        .update({ practice_status: next })
        .eq("id", videoId);
      if (error) {
        // Likely migration 005 not applied → no practice_status column.
        console.warn("video status update failed:", error.message);
        alert(
          "Couldn't save status. Apply supabase/migrations/005_video_practice_status.sql.",
        );
        refreshAll();
      }
    },
    [refreshAll],
  );

  // Open the destructive confirm modal. Actual DELETE is deferred so the
  // user has a 6s window to undo from the toast.
  const deleteVideo = useCallback((video: Video) => {
    setPendingDelete(video);
    setMenuOpenFor(null);
    setMenuView("main");
  }, []);

  const commitDelete = useCallback((video: Video) => {
    if (deleteTimerRef.current !== null) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    fetch(`/api/videos/${video.id}`, { method: "DELETE" }).catch(() => {
      /* swallow — server-side fallback (no DB record found) is benign */
    });
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    setRecentlyDeleted(null);
    recentlyDeletedRef.current = null;
  }, []);

  // Hide the clip locally and start the 6s undo window; the real DELETE only
  // fires when the window elapses (or the tab closes — see the flush effect).
  const scheduleDelete = useCallback(
    (video: Video) => {
      // If a prior pending delete was still in its grace window, commit it now
      // before queueing the new one — never run two undo toasts at once.
      if (recentlyDeletedRef.current) {
        commitDelete(recentlyDeletedRef.current);
      }
      setRecentlyDeleted(video);
      recentlyDeletedRef.current = video;
      deleteTimerRef.current = window.setTimeout(() => {
        commitDelete(video);
      }, 6000);
    },
    [commitDelete],
  );

  // Desktop path: the confirm modal resolves, then we schedule the delete.
  const confirmDeleteVideo = useCallback(() => {
    const video = pendingDelete;
    if (!video) return;
    setPendingDelete(null);
    scheduleDelete(video);
  }, [pendingDelete, scheduleDelete]);

  const undoDelete = useCallback(() => {
    if (deleteTimerRef.current !== null) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    setRecentlyDeleted(null);
    recentlyDeletedRef.current = null;
  }, []);

  const dismissUndo = useCallback(() => {
    const v = recentlyDeletedRef.current;
    if (!v) return;
    commitDelete(v);
  }, [commitDelete]);

  // Safety nets so a pending delete still commits if the user closes the tab
  // or navigates away during the 6s grace window.
  useEffect(() => {
    function flush() {
      const v = recentlyDeletedRef.current;
      if (!v) return;
      // `keepalive` lets the request outlive the document.
      fetch(`/api/videos/${v.id}`, { method: "DELETE", keepalive: true }).catch(
        () => {},
      );
    }
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
      if (deleteTimerRef.current !== null) {
        window.clearTimeout(deleteTimerRef.current);
        deleteTimerRef.current = null;
      }
    };
  }, []);

  const startEditVideo = useCallback(
    (e: MouseEvent, video: Video) => {
      e.preventDefault();
      e.stopPropagation();
      setEditingVideoId(video.id);
      setEditVideoTitle(video.title);
      setTimeout(() => videoInputRef.current?.select(), 0);
    },
    [],
  );

  // Persist a new clip title (optimistic). Shared by the desktop inline editor
  // and the mobile clip sheet.
  const renameVideo = useCallback(async (videoId: string, rawTitle: string) => {
    const trimmed = rawTitle.trim();
    if (!trimmed) return;
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, title: trimmed } : v)),
    );
    await supabase.from("videos").update({ title: trimmed }).eq("id", videoId);
  }, []);

  const saveVideoTitle = useCallback(async () => {
    if (!editingVideoId) return;
    const trimmed = editVideoTitle.trim();
    setEditingVideoId(null);
    if (trimmed) await renameVideo(editingVideoId, trimmed);
  }, [editingVideoId, editVideoTitle, renameVideo]);

  const handleVideoKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveVideoTitle();
      } else if (e.key === "Escape") {
        setEditingVideoId(null);
      }
    },
    [saveVideoTitle],
  );

  const openMenu = useCallback((e: MouseEvent, videoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpenFor((cur) => (cur === videoId ? null : videoId));
    setMenuView("main");
  }, []);

  // Derived: which videos belong to the active section?
  const todayBucket = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }, []);
  const recentVideos = useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS * 24 * 3600 * 1000;
    return videos.filter((v) => new Date(v.created_at).getTime() >= cutoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, todayBucket]);

  const visibleVideos = useMemo(() => {
    if (active.kind === "all") return videos;
    if (active.kind === "recent") return recentVideos;
    return videos.filter((v) => v.folder_id === active.id);
  }, [active, videos, recentVideos]);

  const activeFolder =
    active.kind === "folder" ? folders.find((f) => f.id === active.id) : null;

  const sectionHeader = useMemo(() => {
    if (active.kind === "recent") {
      return {
        title: "Recently added",
        sub: `Clips added in the last ${RECENT_DAYS} days.`,
        label: "This window",
      };
    }
    if (active.kind === "folder") {
      return {
        title: activeFolder?.name ?? "Folder",
        sub: "Clips you sorted into this folder.",
        label: "Clips",
      };
    }
    return {
      title: "All clips",
      sub: "Everything in your library, newest first.",
      label: "All clips",
    };
  }, [active, activeFolder]);

  const activeJobs = jobs.filter((j) => j.status !== "ready");

  const totalDurationLabel = useMemo(() => {
    let total = 0;
    for (const v of visibleVideos) total += v.duration ?? 0;
    if (total <= 0) return "";
    const m = Math.round(total / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }, [visibleVideos]);

  const statusOf = (v: Video): PracticeStatus => v.practice_status || "none";
  const statusCounts = useMemo(() => {
    let focusing = 0;
    let done = 0;
    for (const v of visibleVideos) {
      const s = statusOf(v);
      if (s === "focusing") focusing++;
      else if (s === "done") done++;
    }
    return { all: visibleVideos.length, focusing, done };
  }, [visibleVideos]);

  const shownVideos = useMemo(() => {
    const hiddenId = recentlyDeleted?.id;
    const base = hiddenId
      ? visibleVideos.filter((v) => v.id !== hiddenId)
      : visibleVideos;
    if (statusFilter === "all") return base;
    return base.filter((v) => statusOf(v) === statusFilter);
  }, [visibleVideos, statusFilter, recentlyDeleted]);

  // Selection helpers (scoped to the currently shown clips).
  const allShownSelected =
    shownVideos.length > 0 && shownVideos.every((v) => selectedIds.has(v.id));
  const someShownSelected = shownVideos.some((v) => selectedIds.has(v.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shownVideos.every((v) => next.has(v.id))) {
        shownVideos.forEach((v) => next.delete(v.id));
      } else {
        shownVideos.forEach((v) => next.add(v.id));
      }
      return next;
    });
  };

  return (
    <>
    <div className="home-app">
      <Sidebar
        active={active}
        onSelect={setSection}
        folders={folders}
        videos={videos.map((v) => ({ id: v.id, folder_id: v.folder_id }))}
        allCount={videos.length}
        recentCount={recentVideos.length}
        onCreateFolder={openNewFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onSetFolderColor={setFolderColor}
      />

      <NewFolderModal
        open={newFolderOpen}
        onCancel={() => setNewFolderOpen(false)}
        onCreate={createFolder}
        existingNames={folders.map((f) => f.name)}
      />

      <main className="main">
        <div className="main-inner">
          <header className="page-head">
            <div>
              {active.kind === "folder" && activeFolder && (
                <span
                  className="nav-folder-dot"
                  style={{
                    display: "inline-block",
                    marginBottom: 10,
                    color: folderColor(activeFolder),
                  }}
                />
              )}
              <h1 className="page-title">{sectionHeader.title}</h1>
              <p className="page-sub">{sectionHeader.sub}</p>
            </div>
            <div className="page-actions">
              {videos.length > 0 && (
                <button
                  type="button"
                  className={"btn ghost" + (selectMode ? " is-active" : "")}
                  onClick={() => {
                    setMenuOpenFor(null);
                    if (selectMode) exitSelectMode();
                    else setSelectMode(true);
                  }}
                >
                  <CheckIcon />{" "}
                  <span className="btn-label">{selectMode ? "Cancel" : "Select"}</span>
                </button>
              )}
              <button type="button" className="btn ghost" disabled title="Sort (coming soon)">
                <SortIcon /> <span className="btn-label">Sort</span> <ChevronDownIcon />
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => dropzoneRef.current?.pick()}
              >
                <PlusIcon /> <span className="btn-label">Add clip</span>
              </button>
            </div>
          </header>

          <UploadDropzone ref={dropzoneRef} onJobQueued={refreshAll} />

          <div className="youtube-import-card">
            <div className="youtube-import-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507A3.002 3.002 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.387.507 9.387.507s7.517 0 9.387-.507a3.002 3.002 0 0 0 2.11-2.11C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div className="youtube-import-body">
              <div className="youtube-import-title">Import from YouTube</div>
              <div className="youtube-import-input-wrapper">
                <input
                  type="text"
                  placeholder="Paste YouTube video link (e.g. https://www.youtube.com/watch?v=...)"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !importing && youtubeUrl.trim()) {
                      handleYoutubeImport();
                    }
                  }}
                  disabled={importing}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleYoutubeImport}
                  disabled={importing || !youtubeUrl.trim()}
                >
                  {importing ? "Importing…" : "Import"}
                </button>
              </div>
              {importError && <div className="youtube-import-error">{importError}</div>}
            </div>
          </div>

          {activeJobs.length > 0 && (
            <section className="jobs-queue" aria-label="Processing">
              {activeJobs.map((j) => (
                <JobCard key={j.id} job={j} onChanged={refreshAll} />
              ))}
            </section>
          )}

          <section>
            <div className="section-head">
              <span className="section-title">{sectionHeader.label}</span>
              {visibleVideos.length > 0 && (
                <span className="clips-meta">
                  {visibleVideos.length}{" "}
                  {visibleVideos.length === 1 ? "clip" : "clips"}
                  {totalDurationLabel ? ` · ${totalDurationLabel}` : ""}
                </span>
              )}
              <div className="section-meta">
                {visibleVideos.length > 0 && (
                  <div
                    className="filter-seg"
                    role="tablist"
                    aria-label="Practice status filter"
                  >
                    {(
                      [
                        { key: "all", label: "All" },
                        { key: "focusing", label: "Focusing", dot: "focusing" },
                        { key: "done", label: "Completed", dot: "done" },
                      ] as const
                    ).map((seg) => (
                      <button
                        type="button"
                        key={seg.key}
                        className={statusFilter === seg.key ? "active" : ""}
                        role="tab"
                        aria-selected={statusFilter === seg.key}
                        onClick={() => setStatusFilter(seg.key)}
                      >
                        {"dot" in seg && (
                          <span className={"seg-dot " + seg.dot} aria-hidden="true" />
                        )}
                        <span>{seg.label}</span>
                        <span className="seg-count">{statusCounts[seg.key]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectMode && (shownVideos.length > 0 || selectedIds.size > 0) && (
              <div className="bulk-bar">
                <label className="bulk-check">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    disabled={shownVideos.length === 0}
                    ref={(el) => {
                      if (el) el.indeterminate = someShownSelected && !allShownSelected;
                    }}
                    onChange={toggleSelectAll}
                  />
                  <span>Select all</span>
                </label>
                <span className="bulk-count">{selectedIds.size} selected</span>
                <div className="bulk-actions" ref={bulkMenuRef}>
                  <button
                    type="button"
                    className="btn"
                    disabled={selectedIds.size === 0}
                    onClick={() => setBulkMoveOpen((o) => !o)}
                  >
                    Move to folder <ChevronDownIcon />
                  </button>
                  {bulkMoveOpen && (
                    <div className="bulk-menu">
                      <button type="button" onClick={() => bulkMove(null)}>
                        Remove from folder
                      </button>
                      {folders.length > 0 && <div className="menu-sep" />}
                      {folders.map((f) => (
                        <button key={f.id} type="button" onClick={() => bulkMove(f.id)}>
                          <span
                            className="nav-folder-dot"
                            style={{ color: folderColor(f) }}
                          />
                          {f.name}
                        </button>
                      ))}
                      {folders.length === 0 && (
                        <p className="menu-empty">No folders yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <p className="empty">Loading…</p>
            ) : visibleVideos.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No clips here yet</div>
                <div>Drop a file above to start shadowing.</div>
              </div>
            ) : shownVideos.length === 0 ? (
              <div className="filter-empty">
                <div className="fe-title">
                  {statusFilter === "focusing"
                    ? "Nothing in focus right now"
                    : "No completed clips yet"}
                </div>
                <div className="fe-sub">
                  Open a clip&apos;s status badge to change it.
                </div>
              </div>
            ) : (
              <ul className="list">
                {shownVideos.map((video) => {
                  const isMenuOpen = menuOpenFor === video.id;
                  const itemFolder =
                    video.folder_id &&
                    !(active.kind === "folder" && active.id === video.folder_id)
                      ? folders.find((f) => f.id === video.folder_id)
                      : null;
                  const card = (
                    <>
                      <div className="item-thumb" data-kind={video.media_type}>
                        <PlayIcon />
                      </div>
                      <div className="item-body">
                        {editingVideoId === video.id ? (
                          <span className="item-title">
                            <input
                              ref={videoInputRef}
                              value={editVideoTitle}
                              onChange={(e) => setEditVideoTitle(e.target.value)}
                              onBlur={saveVideoTitle}
                              onKeyDown={handleVideoKey}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              autoFocus
                            />
                          </span>
                        ) : (
                          <span
                            className="item-title"
                            onClick={(e) => startEditVideo(e, video)}
                            title={video.title}
                          >
                            <span className="item-title-text" data-lines="2">
                              {video.title}
                              <span className="item-tag">{clipKind(video)}</span>
                            </span>
                          </span>
                        )}
                        {itemFolder && (
                          <div
                            className="item-folder-sub"
                            style={{ color: folderColor(itemFolder) }}
                          >
                            <span className="item-folder-dot" aria-hidden="true" />
                            <span className="item-folder-sub-name">
                              {itemFolder.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="item-meta">
                        <StatusControl
                          status={statusOf(video)}
                          onSet={(next) => setVideoStatus(video.id, next)}
                        />
                        <div className="item-duration">
                          {formatDuration(video.duration)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={"item-menu" + (isMenuOpen ? " is-open" : "")}
                        aria-label="More"
                        onClick={(e) => openMenu(e, video.id)}
                      >
                        <DotsIcon />
                      </button>
                    </>
                  );
                  const isSelected = selectedIds.has(video.id);
                  return (
                    <li key={video.id} style={{ position: "relative" }}>
                      <Link
                        href={`/player/${video.id}`}
                        className={
                          "item" +
                          (selectMode ? " is-selectmode" : "") +
                          (selectMode && isSelected ? " is-selected" : "")
                        }
                        onClick={(e) => {
                          if (selectMode) {
                            e.preventDefault();
                            toggleSelected(video.id);
                            return;
                          }
                          if (
                            editingVideoId === video.id ||
                            menuOpenFor === video.id
                          ) {
                            e.preventDefault();
                          }
                        }}
                      >
                        {selectMode && (
                          <span
                            className={"item-check" + (isSelected ? " checked" : "")}
                            aria-hidden="true"
                          >
                            {isSelected && <CheckIcon />}
                          </span>
                        )}
                        {card}
                      </Link>
                      {isMenuOpen && (
                        <div ref={menuRef} className="item-menu-dropdown">
                          {menuView === "main" ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMenuView("move");
                                }}
                              >
                                Move to folder →
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteVideo(video);
                                }}
                              >
                                Delete clip
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMenuView("main");
                                }}
                              >
                                ← Back
                              </button>
                              <div className="menu-sep" />
                              {video.folder_id && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    moveVideo(video.id, null);
                                  }}
                                >
                                  Move to root
                                </button>
                              )}
                              {folders
                                .filter((f) => f.id !== video.folder_id)
                                .map((f) => (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      moveVideo(video.id, f.id);
                                    }}
                                  >
                                    <span
                                      className="nav-folder-dot"
                                      style={{ color: folderColor(f) }}
                                    />
                                    {f.name}
                                  </button>
                                ))}
                              {folders.length === 0 && (
                                <p className="menu-empty">No folders yet</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
      <ConfirmDeleteClipModal
        open={!!pendingDelete}
        video={pendingDelete}
        folder={
          pendingDelete && pendingDelete.folder_id
            ? folders.find((f) => f.id === pendingDelete.folder_id) ?? null
            : null
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDeleteVideo}
      />
    </div>
    <MobileLibrary
      active={active}
      setSection={setSection}
      folders={folders}
      videos={videos}
      jobs={jobs}
      visibleVideos={visibleVideos}
      recentCount={recentVideos.length}
      bookmarksCount={bookmarksCount}
      sectionHeader={sectionHeader}
      totalDurationLabel={totalDurationLabel}
      loading={loading}
      youtubeUrl={youtubeUrl}
      importing={importing}
      importError={importError}
      recentlyDeletedId={recentlyDeleted?.id ?? null}
      onYoutubeUrlChange={setYoutubeUrl}
      onYoutubeImport={handleYoutubeImport}
      onCreateFolder={openNewFolder}
      onJobChanged={refreshAll}
      onSetVideoStatus={setVideoStatus}
      onRenameVideo={renameVideo}
      onDeleteVideo={scheduleDelete}
    />
    <UndoToast
      key={recentlyDeleted?.id ?? "none"}
      open={!!recentlyDeleted}
      label="Clip deleted"
      onUndo={undoDelete}
      onDismiss={dismissUndo}
    />
    </>
  );
}

