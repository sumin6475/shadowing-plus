"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Folder, PracticeStatus, Video, Job } from "@/lib/types";
import { folderColor } from "@/lib/folder-color";
import MobileJobCard from "./MobileJobCard";
import MobileStatusBadge from "./MobileStatusBadge";
import MobileStatusSheet from "./MobileStatusSheet";
import type { ActiveSection } from "@/components/home/Sidebar";
import MobileDrawer from "./MobileDrawer";
import MobileTabBar from "./MobileTabBar";
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
  activeFolder: Folder | null;
  visibleVideos: Video[];
  recentCount: number;
  bookmarksCount: number;
  sectionHeader: { title: string; sub: string; label: string };
  totalDurationLabel: string;
  loading: boolean;
  onPickFile: () => void;
  onCreateFolder: () => void;
  onJobChanged: () => void;
  onSetVideoStatus: (videoId: string, next: PracticeStatus) => void;
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
  activeFolder,
  visibleVideos,
  recentCount,
  bookmarksCount,
  sectionHeader,
  totalDurationLabel,
  loading,
  onPickFile,
  onCreateFolder,
  onJobChanged,
  onSetVideoStatus,
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
    if (statusFilter === "all") return visibleVideos;
    return visibleVideos.filter((v) => statusOf(v) === statusFilter);
  }, [visibleVideos, statusFilter]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of videos) {
      if (v.folder_id) counts[v.folder_id] = (counts[v.folder_id] ?? 0) + 1;
    }
    return counts;
  }, [videos]);

  const activeJobs = jobs.filter((j) => j.status !== "ready");

  const isActiveChip = (s: ActiveSection): boolean => {
    if (s.kind !== active.kind) return false;
    if (s.kind === "folder" && active.kind === "folder") return s.id === active.id;
    return true;
  };

  return (
    <div className="m-app">
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
          onClick={onPickFile}
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
            <span className="m-chip-count">{videos.length}</span>
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

        {/* Dropzone (click delegates to the shared UploadDropzone via ref) */}
        <button type="button" className="m-dropzone" onClick={onPickFile}>
          <span className="m-dropzone-icon"><UploadIcon /></span>
          <span className="m-dropzone-body">
            <span className="m-dropzone-title">Drop a video or audio file</span>
            <span className="m-dropzone-sub">MP4 · MP3 · WAV · M4A · MOV</span>
          </span>
        </button>

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
              {visibleVideos.length} {visibleVideos.length === 1 ? "clip" : "clips"}
              {totalDurationLabel ? ` · ${totalDurationLabel}` : ""}
            </div>
          </div>

          {visibleVideos.length > 0 && (
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
          ) : visibleVideos.length === 0 ? (
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
                        {video.media_type === "audio" && (
                          <span className="m-clip-tag" style={{ marginLeft: 6 }}>audio</span>
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

      {/* Drawer */}
      <MobileDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        active={active}
        onSelect={setSection}
        folders={folders}
        allCount={videos.length}
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
