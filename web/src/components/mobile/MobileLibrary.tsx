"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Folder, PracticeStatus, Video, Job } from "@/lib/types";
import { folderColor } from "@/lib/folder-color";
import { clipKind } from "@/lib/clip-kind";
import { useUpload } from "@/lib/useUpload";
import MobileJobCard from "./MobileJobCard";
import MobileStatusBadge from "./MobileStatusBadge";
import MobileStatusSheet from "./MobileStatusSheet";
import MobileClipSheet from "./MobileClipSheet";
import type { ActiveSection } from "@/components/home/Sidebar";
import MobileDrawer from "./MobileDrawer";
import MobileTabBar from "./MobileTabBar";
import { DotsIcon } from "@/components/home/Icons";
import {
  HamburgerIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
} from "./Icons";

interface Props {
  active: ActiveSection;
  setSection: (s: ActiveSection) => void;
  folders: Folder[];
  videos: Video[];
  jobs: Job[];
  visibleVideos: Video[];
  recentCount: number;
  bookmarksCount: number;
  sectionHeader: { title: string; sub: string; label: string };
  totalDurationLabel: string;
  loading: boolean;
  youtubeUrl: string;
  importing: boolean;
  importError: string | null;
  recentlyDeletedId: string | null;
  onYoutubeUrlChange: (value: string) => void;
  onYoutubeImport: () => void;
  onCreateFolder: () => void;
  onJobChanged: () => void;
  onSetVideoStatus: (videoId: string, next: PracticeStatus) => void;
  onRenameVideo: (videoId: string, title: string) => void;
  onDeleteVideo: (video: Video) => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MobileLibrary({
  active,
  setSection,
  folders,
  videos,
  jobs,
  visibleVideos,
  recentCount,
  bookmarksCount,
  sectionHeader,
  totalDurationLabel,
  loading,
  youtubeUrl,
  importing,
  importError,
  recentlyDeletedId,
  onYoutubeUrlChange,
  onYoutubeImport,
  onCreateFolder,
  onJobChanged,
  onSetVideoStatus,
  onRenameVideo,
  onDeleteVideo,
}: Props) {
  const [drawer, setDrawer] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "focusing" | "done">(
    "all",
  );
  const [sheetTarget, setSheetTarget] = useState<{
    id: string;
    title: string;
    status: PracticeStatus;
  } | null>(null);
  const [clipMenuTarget, setClipMenuTarget] = useState<Video | null>(null);

  // The mobile shell owns its own file input: a file <input> nested inside the
  // desktop `.home-app` (which is `display:none` on mobile) never fires its
  // `change` event on mobile browsers, so the picked file was being dropped.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleFiles, uploading, error: uploadError } = useUpload(onJobChanged);
  const pickFile = () => fileInputRef.current?.click();

  // Hide a clip the moment it's queued for deletion, even though the real
  // DELETE is deferred (the undo toast keeps the 6s grace window).
  const liveVideos = useMemo(
    () =>
      recentlyDeletedId
        ? videos.filter((v) => v.id !== recentlyDeletedId)
        : videos,
    [videos, recentlyDeletedId],
  );
  const liveVisibleVideos = useMemo(
    () =>
      recentlyDeletedId
        ? visibleVideos.filter((v) => v.id !== recentlyDeletedId)
        : visibleVideos,
    [visibleVideos, recentlyDeletedId],
  );

  const statusOf = (v: Video): PracticeStatus => v.practice_status || "none";
  const statusCounts = useMemo(() => {
    let focusing = 0;
    let done = 0;
    for (const v of liveVisibleVideos) {
      const s = statusOf(v);
      if (s === "focusing") focusing++;
      else if (s === "done") done++;
    }
    return { all: liveVisibleVideos.length, focusing, done };
  }, [liveVisibleVideos]);

  const shownVideos = useMemo(() => {
    if (statusFilter === "all") return liveVisibleVideos;
    return liveVisibleVideos.filter((v) => statusOf(v) === statusFilter);
  }, [liveVisibleVideos, statusFilter]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of liveVideos) {
      if (v.folder_id) counts[v.folder_id] = (counts[v.folder_id] ?? 0) + 1;
    }
    return counts;
  }, [liveVideos]);

  const activeJobs = jobs.filter((j) => j.status !== "ready");

  const isActiveChip = (s: ActiveSection): boolean => {
    if (s.kind !== active.kind) return false;
    if (s.kind === "folder" && active.kind === "folder") return s.id === active.id;
    return true;
  };

  return (
    <div className="m-app">
      {/* Hidden file input — lives inside the visible `.m-app` shell so the
          `change` event actually fires after picking on mobile. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        multiple
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* TOP BAR */}
      <div className="m-bar">
        <button
          type="button"
          className="m-icon-btn"
          onClick={() => setDrawer(true)}
          aria-label="Menu"
        >
          <HamburgerIcon />
        </button>
        <div className="m-bar-spacer">
          <div className="m-bar-title">
            Shadowing<span className="plus">+</span>
          </div>
        </div>
        <button type="button" className="m-icon-btn" aria-label="Search">
          <SearchIcon />
        </button>
        <button
          type="button"
          className="m-icon-btn"
          aria-label="Add clip"
          onClick={pickFile}
        >
          <PlusIcon />
        </button>
      </div>

      {/* CONTENT */}
      <div className="m-content">
        {/* Filter chips */}
        <div className="m-chips" role="tablist">
          <button
            type="button"
            className={"m-chip" + (isActiveChip({ kind: "all" }) ? " active" : "")}
            onClick={() => setSection({ kind: "all" })}
          >
            All clips
            <span className="m-chip-count">{liveVideos.length}</span>
          </button>
          <button
            type="button"
            className={"m-chip" + (isActiveChip({ kind: "recent" }) ? " active" : "")}
            onClick={() => setSection({ kind: "recent" })}
          >
            Recent
            <span className="m-chip-count">{recentCount}</span>
          </button>
          {folders.length > 0 && (
            <div style={{ width: 1, alignSelf: "stretch", background: "var(--hairline)", margin: "4px 4px" }} />
          )}
          {folders.map((f) => {
            const isActive = isActiveChip({ kind: "folder", id: f.id });
            return (
              <button
                key={f.id}
                type="button"
                className={"m-chip" + (isActive ? " active" : "")}
                onClick={() => setSection({ kind: "folder", id: f.id })}
                style={isActive ? undefined : { color: folderColor(f) }}
              >
                <span className="m-chip-dot" style={{ background: folderColor(f) }} />
                <span style={{ color: isActive ? "inherit" : "var(--text-2)" }}>{f.name}</span>
                <span className="m-chip-count">{folderCounts[f.id] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {/* Page header */}
        <div>
          <h1 className="m-page-title">{sectionHeader.title}</h1>
          <p className="m-page-sub">{sectionHeader.sub}</p>
        </div>

        {/* Dropzone — opens the mobile file input */}
        <button
          type="button"
          className="m-dropzone"
          onClick={pickFile}
          disabled={uploading}
        >
          <span className="m-dropzone-icon"><UploadIcon /></span>
          <span className="m-dropzone-body">
            <span className="m-dropzone-title">
              {uploading ? "Uploading…" : "Drop a video or audio file"}
            </span>
            <span className="m-dropzone-sub">
              {uploadError ?? "MP4 · MP3 · WAV · M4A · MOV"}
            </span>
          </span>
        </button>

        {/* YouTube import */}
        <div className="m-youtube">
          <div className="m-youtube-head">
            <span className="m-youtube-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.516 0-9.387.507A3.002 3.002 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.507 9.387.507 9.387.507s7.517 0 9.387-.507a3.002 3.002 0 0 0 2.11-2.11C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </span>
            <span className="m-youtube-title">Import from YouTube</span>
          </div>
          <div className="m-youtube-row">
            <input
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="m-youtube-input"
              placeholder="Paste YouTube link"
              value={youtubeUrl}
              onChange={(e) => onYoutubeUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !importing && youtubeUrl.trim()) {
                  onYoutubeImport();
                }
              }}
              disabled={importing}
            />
            <button
              type="button"
              className="m-youtube-btn"
              onClick={onYoutubeImport}
              disabled={importing || !youtubeUrl.trim()}
            >
              {importing ? "…" : "Import"}
            </button>
          </div>
          {importError && <div className="m-youtube-error">{importError}</div>}
        </div>

        {/* Jobs queue */}
        {activeJobs.length > 0 && (
          <section className="m-jobs-queue" aria-label="Processing">
            {activeJobs.map((j) => (
              <MobileJobCard key={j.id} job={j} onChanged={onJobChanged} />
            ))}
          </section>
        )}

        {/* Clips list */}
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="m-section-head">
            <div className="m-section-title">{sectionHeader.label}</div>
            <div className="m-section-meta">
              {liveVisibleVideos.length} {liveVisibleVideos.length === 1 ? "clip" : "clips"}
              {totalDurationLabel ? ` · ${totalDurationLabel}` : ""}
            </div>
          </div>

          {liveVisibleVideos.length > 0 && (
            <div className="m-status-seg" role="tablist" aria-label="Practice status filter">
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
                    <span className={"m-seg-dot " + seg.dot} aria-hidden="true" />
                  )}
                  <span>{seg.label}</span>
                  <span className="m-seg-count">{statusCounts[seg.key]}</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="m-empty">Loading…</div>
          ) : liveVisibleVideos.length === 0 ? (
            <div className="m-empty">No clips yet. Drop a file above.</div>
          ) : shownVideos.length === 0 ? (
            <div className="m-filter-empty">
              <div className="m-filter-empty-title">
                {statusFilter === "focusing"
                  ? "Nothing in focus here"
                  : "No completed clips here"}
              </div>
              <div className="m-filter-empty-sub">
                Tap a clip&apos;s status badge to change it.
              </div>
            </div>
          ) : (
            <div className="m-list">
              {shownVideos.map((video) => {
                const itemFolder =
                  video.folder_id &&
                  !(active.kind === "folder" && active.id === video.folder_id)
                    ? folders.find((f) => f.id === video.folder_id)
                    : null;
                return (
                  <Link key={video.id} href={`/player/${video.id}`} className="m-clip">
                    <span className="m-clip-thumb">
                      <PlayIcon />
                    </span>
                    <span className="m-clip-body">
                      <span className="m-clip-title">
                        {video.title}
                        {clipKind(video) !== "video" && (
                          <span className="m-clip-tag" style={{ marginLeft: 6 }}>
                            {clipKind(video)}
                          </span>
                        )}
                      </span>
                      <span className="m-clip-meta">
                        {itemFolder && (
                          <span className="m-clip-folder" style={{ color: folderColor(itemFolder) }}>
                            <span className="m-clip-folder-dot" />
                            <span style={{ color: "var(--text-3)" }}>{itemFolder.name}</span>
                          </span>
                        )}
                        {itemFolder && <span>·</span>}
                        <span>{formatDuration(video.duration)}</span>
                      </span>
                    </span>
                    <MobileStatusBadge
                      status={statusOf(video)}
                      onOpen={() =>
                        setSheetTarget({
                          id: video.id,
                          title: video.title,
                          status: statusOf(video),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="m-clip-menu"
                      aria-label="Clip options"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setClipMenuTarget(video);
                      }}
                    >
                      <DotsIcon />
                    </button>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <MobileStatusSheet
        target={sheetTarget}
        onClose={() => setSheetTarget(null)}
        onPick={(next) => {
          if (sheetTarget) onSetVideoStatus(sheetTarget.id, next);
          setSheetTarget(null);
        }}
      />

      <MobileClipSheet
        target={clipMenuTarget}
        onClose={() => setClipMenuTarget(null)}
        onRename={onRenameVideo}
        onDelete={onDeleteVideo}
      />

      {/* Drawer */}
      <MobileDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        active={active}
        onSelect={setSection}
        folders={folders}
        allCount={liveVideos.length}
        recentCount={recentCount}
        bookmarksCount={bookmarksCount}
        folderCounts={folderCounts}
        onCreateFolder={() => {
          setDrawer(false);
          onCreateFolder();
        }}
      />

      <MobileTabBar active="library" />
    </div>
  );
}
