"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Folder, Video } from "@/lib/types";
import Sidebar, { type ActiveSection } from "@/components/home/Sidebar";
import NewFolderModal from "@/components/home/NewFolderModal";
import BookmarkGroup from "@/components/bookmarks/BookmarkGroup";
import BookmarksEmpty from "@/components/bookmarks/BookmarksEmpty";
import type { BookmarkItemData } from "@/components/bookmarks/BookmarkItem";
import MobileBookmarks, {
  type MobileBookmarkGroup,
} from "@/components/mobile/MobileBookmarks";
import { folderColor } from "@/lib/folder-color";
import {
  ChevronDownIcon,
  DrillIcon,
  SortIcon,
} from "@/components/bookmarks/Icons";

import "../home.css";
import "./bookmarks.css";

// Same key the home page uses for its persisted active section.
// Writing here lets sidebar clicks on /bookmarks pre-select the right
// section when we navigate back to /.
const ACTIVE_SECTION_KEY = "sp:home:section";

interface BookmarkRow {
  id: string;
  memo: string | null;
  created_at: string;
  segment: {
    id: string;
    text: string;
    translation: string | null;
    start_time: number;
    end_time: number;
    video: Video & {
      folder: { id: string; name: string; color: string | null } | null;
    };
  } | null;
}

interface Group {
  videoId: string;
  videoTitle: string;
  mediaType: Video["media_type"];
  folderName: string | null;
  folderColor: string | null;
  duration: number | null;
  items: BookmarkItemData[];
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMs = Date.now() - t;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(day / 365);
  return `${yr}y ago`;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [filterVideoId, setFilterVideoId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingBookmarkId, setPlayingBookmarkId] = useState<string | null>(
    null,
  );
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [bmRes, foldersRes, videosRes] = await Promise.all([
      supabase
        .from("bookmarks")
        .select(
          "id, memo, created_at, segment:segments(id, text, translation, start_time, end_time, video:videos(*, folder:folders(id, name, color)))",
        )
        .order("created_at", { ascending: false }),
      supabase.from("folders").select("*").order("created_at"),
      supabase
        .from("videos")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    setBookmarks((bmRes.data ?? []) as unknown as BookmarkRow[]);
    setFolders((foldersRes.data ?? []) as Folder[]);
    setAllVideos((videosRes.data ?? []) as Video[]);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  // Group bookmarks by video, preserving the order in which the first
  // bookmark per video appeared (newest first → oldest).
  const groups: Group[] = useMemo(() => {
    const byVideo = new Map<string, Group>();
    for (const bm of bookmarks) {
      if (!bm.segment?.video) continue;
      const v = bm.segment.video;
      let g = byVideo.get(v.id);
      if (!g) {
        g = {
          videoId: v.id,
          videoTitle: v.title,
          mediaType: v.media_type,
          folderName: v.folder?.name ?? null,
          folderColor: v.folder
            ? folderColor({ id: v.folder.id, color: v.folder.color })
            : null,
          duration: v.duration,
          items: [],
        };
        byVideo.set(v.id, g);
      }
      g.items.push({
        bookmarkId: bm.id,
        segmentId: bm.segment.id,
        videoId: v.id,
        text: bm.segment.text,
        translation: bm.segment.translation,
        note: bm.memo,
        startTime: bm.segment.start_time,
        endTime: bm.segment.end_time,
        date: formatRelative(bm.created_at),
      });
    }
    return Array.from(byVideo.values());
  }, [bookmarks]);

  const totalCount = groups.reduce((n, g) => n + g.items.length, 0);
  const filters = useMemo(
    () => [
      { id: "all", label: "All", count: totalCount },
      ...groups.map((g) => ({
        id: g.videoId,
        label: g.videoTitle,
        count: g.items.length,
      })),
    ],
    [groups, totalCount],
  );

  const visible =
    filterVideoId === "all"
      ? groups
      : groups.filter((g) => g.videoId === filterVideoId);

  const stopPlayback = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setPlayingBookmarkId(null);
  }, []);

  const playBookmark = useCallback(
    (bm: BookmarkItemData, audioUrl: string) => {
      const a = audioRef.current;
      if (!a) return;
      if (playingBookmarkId === bm.bookmarkId) {
        stopPlayback();
        return;
      }
      if (a.src !== audioUrl) a.src = audioUrl;
      a.currentTime = bm.startTime;
      a.play().catch(() => {});
      setPlayingBookmarkId(bm.bookmarkId);

      const onTimeUpdate = () => {
        if (a.currentTime >= bm.endTime) {
          a.pause();
          a.removeEventListener("timeupdate", onTimeUpdate);
          setPlayingBookmarkId((prev) =>
            prev === bm.bookmarkId ? null : prev,
          );
        }
      };
      a.addEventListener("timeupdate", onTimeUpdate);
    },
    [playingBookmarkId, stopPlayback],
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      if (playingBookmarkId === bookmarkId) stopPlayback();
      await supabase.from("bookmarks").delete().eq("id", bookmarkId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    },
    [playingBookmarkId, stopPlayback],
  );

  const editNote = useCallback(
    async (bookmarkId: string, current: string | null) => {
      const next = window.prompt("Edit note", current ?? "");
      if (next === null) return;
      const trimmed = next.trim();
      const memo = trimmed === "" ? null : trimmed;
      await supabase.from("bookmarks").update({ memo }).eq("id", bookmarkId);
      setBookmarks((prev) =>
        prev.map((b) => (b.id === bookmarkId ? { ...b, memo } : b)),
      );
    },
    [],
  );

  const playForMobile = useCallback(
    (bm: BookmarkItemData, videoId: string) => {
      const audioUrl = allVideos.find((v) => v.id === videoId)?.audio_url;
      if (!audioUrl) return;
      playBookmark(bm, audioUrl);
    },
    [allVideos, playBookmark],
  );

  const mobileGroups: MobileBookmarkGroup[] = groups;
  const visibleMobile = visible;

  // Sidebar navigation: clicking another section from /bookmarks should land
  // on / with that section selected. Persist via localStorage and navigate.
  const handleSidebarSelect = useCallback(
    (section: ActiveSection) => {
      try {
        localStorage.setItem(ACTIVE_SECTION_KEY, JSON.stringify(section));
      } catch {
        /* ignore */
      }
      router.push("/");
    },
    [router],
  );

  // Folder CRUD performed inline from sidebar interactions.
  const openNewFolder = useCallback(() => setNewFolderOpen(true), []);

  const createFolder = useCallback(
    async (input: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from("folders")
        .insert({ name: input.name, color: input.color })
        .select()
        .single();
      if (error) {
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
        setNewFolderOpen(false);
        handleSidebarSelect({ kind: "folder", id: data.id });
      }
    },
    [handleSidebarSelect],
  );

  const renameFolder = useCallback(async (id: string, name: string) => {
    await supabase.from("folders").update({ name }).eq("id", id);
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f)),
    );
  }, []);

  const deleteFolder = useCallback(async (folder: Folder) => {
    if (
      !confirm(
        `Delete folder "${folder.name}"?\nClips inside will move to the root.`,
      )
    )
      return;
    await supabase.from("folders").delete().eq("id", folder.id);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    setAllVideos((prev) =>
      prev.map((v) =>
        v.folder_id === folder.id ? { ...v, folder_id: null } : v,
      ),
    );
  }, []);

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
        alert(
          "Couldn't save the color. Apply supabase/migrations/003_folder_color.sql.",
        );
        refresh();
      }
    },
    [refresh],
  );

  // Cutoff is captured at mount; useState initializer is the canonical place
  // for a one-shot impure read like Date.now().
  const [recentCutoff] = useState(() => Date.now() - 14 * 24 * 3600 * 1000);
  const recentCount = useMemo(
    () =>
      allVideos.filter((v) => new Date(v.created_at).getTime() >= recentCutoff)
        .length,
    [allVideos, recentCutoff],
  );

  return (
    <>
    <div className="home-app">
      <Sidebar
        active={{ kind: "all" }}
        onSelect={handleSidebarSelect}
        folders={folders}
        videos={allVideos.map((v) => ({ id: v.id, folder_id: v.folder_id }))}
        allCount={allVideos.length}
        recentCount={recentCount}
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
          <header className="bm-head">
            <div>
              <h1 className="page-title">Bookmarks</h1>
              <div className="bm-head-meta">
                <span><b>{totalCount}</b> saved sentences</span>
                <span style={{ color: "var(--text-4)" }}>·</span>
                <span>from <b>{groups.length}</b> {groups.length === 1 ? "clip" : "clips"}</span>
              </div>
            </div>
            <div className="page-actions">
              <button
                type="button"
                className="btn ghost"
                disabled
                title="Sort (only Newest first for now)"
              >
                <SortIcon /> Newest first <ChevronDownIcon />
              </button>
              <Link
                href="/practice"
                className="btn primary"
                title="Start a Practice all drill"
              >
                <DrillIcon /> Practice all
              </Link>
            </div>
          </header>

          {loading ? (
            <div className="bm-loading">Loading bookmarks…</div>
          ) : groups.length === 0 ? (
            <BookmarksEmpty />
          ) : (
            <>
              <div className="bm-filters">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={
                      "bm-chip" + (filterVideoId === f.id ? " active" : "")
                    }
                    onClick={() => setFilterVideoId(f.id)}
                  >
                    <span className="bm-chip-label">{f.label}</span>
                    <span className="bm-chip-count">{f.count}</span>
                  </button>
                ))}
              </div>

              {visible.map((g) => {
                const audioUrl = allVideos.find(
                  (v) => v.id === g.videoId,
                )?.audio_url;
                return (
                  <BookmarkGroup
                    key={g.videoId}
                    videoId={g.videoId}
                    videoTitle={g.videoTitle}
                    mediaType={g.mediaType}
                    folderName={g.folderName}
                    duration={g.duration}
                    items={g.items}
                    play={{ playingBookmarkId }}
                    onPlayBookmark={(bm) => {
                      if (!audioUrl) return;
                      playBookmark(bm, audioUrl);
                    }}
                    onRemoveBookmark={removeBookmark}
                  />
                );
              })}
            </>
          )}
        </div>
      </main>

      <audio ref={audioRef} preload="none" className="bm-audio" />
    </div>
    <MobileBookmarks
      groups={mobileGroups}
      visible={visibleMobile}
      filters={filters}
      filterVideoId={filterVideoId}
      setFilter={setFilterVideoId}
      totalCount={totalCount}
      loading={loading}
      playingBookmarkId={playingBookmarkId}
      onPlay={playForMobile}
      onRemove={removeBookmark}
      onEditNote={editNote}
    />
    </>
  );
}
