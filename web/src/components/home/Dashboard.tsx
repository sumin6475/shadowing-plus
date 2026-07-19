"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Folder, Video } from "@/lib/types";
import { folderColor } from "@/lib/folder-color";
import {
  BookmarkIcon,
  ChartIcon,
  CheckIcon,
  DrillIcon,
  LibraryIcon,
  PlayIcon,
  PlusIcon,
} from "./Icons";

// Home / Dashboard — ported from the design's dashboard.jsx.
// "Real parts now, track later": status ring, stat tiles, folders, and the
// in-focus "Continue" clips are all real. Streak, weekly minutes, per-clip
// progress %, and "last practiced" are NOT tracked yet, so this shows honest
// placeholders instead of invented numbers (see the "This week" panel).

function fmtDur(sec: number | null): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function greetFor(h: number): string {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function nameFromEmail(email: string | null): string {
  const raw = email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!raw) return "there";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function relDate(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

function StatTile({
  label,
  value,
  unit,
  icon,
  tint,
  foot,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon: ReactNode;
  tint?: "moss" | "iris" | "amber";
  foot: ReactNode;
}) {
  return (
    <div className="stat-tile">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className={"stat-ic" + (tint ? " " + tint : "")}>{icon}</span>
      </div>
      <div className="stat-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}

function StatusRing({ focusing, done, fresh }: { focusing: number; done: number; fresh: number }) {
  const total = focusing + done + fresh;
  const acc = "var(--accent)";
  const moss = "oklch(0.55 0.10 155)";
  const grey = "var(--hairline)";
  const dDone = total ? (done / total) * 360 : 0;
  const dFoc = total ? (focusing / total) * 360 : 0;
  const ring = {
    background: total
      ? `conic-gradient(${moss} 0deg ${dDone}deg, ${acc} ${dDone}deg ${dDone + dFoc}deg, ${grey} ${dDone + dFoc}deg 360deg)`
      : grey,
  };
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Practice status</h2>
          <p className="panel-sub">Across your whole library</p>
        </div>
      </div>
      <div className="ring-wrap">
        <div className="ring" style={ring}>
          <div className="ring-hole">
            <span className="rh-value">{total}</span>
            <span className="rh-label">clips</span>
          </div>
        </div>
        <div className="ring-legend">
          <div className="ring-legend-row">
            <span className="rl-dot" style={{ background: acc }} />
            <span className="rl-name">Focusing</span>
            <span className="rl-count">{focusing}</span>
          </div>
          <div className="ring-legend-row">
            <span className="rl-dot" style={{ background: moss }} />
            <span className="rl-name">Completed</span>
            <span className="rl-count">{done}</span>
          </div>
          <div className="ring-legend-row">
            <span className="rl-dot" style={{ background: "var(--text-4)" }} />
            <span className="rl-name">Not started</span>
            <span className="rl-count">{fresh}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContinueCard({ clip, folder }: { clip: Video; folder: Folder | null }) {
  const dur = fmtDur(clip.duration);
  const color = folder ? folderColor(folder) : undefined;
  return (
    <Link className="cont-card" href={`/player/${clip.id}`} title={clip.title}>
      <div className="cont-thumb">
        <span className="cont-play"><PlayIcon width={14} height={14} /></span>
        <span className="cont-status">
          <span className="status-pill focusing">
            <DrillIcon width={12} height={12} />
            <span>Focusing</span>
          </span>
        </span>
        {dur && <span className="cont-dur">{dur}</span>}
      </div>
      <div className="cont-body">
        {folder && (
          <span className="cont-folder" style={{ color }}>
            <span className="cf-dot" />
            <span>{folder.name}</span>
          </span>
        )}
        <div className="cont-title">{clip.title}</div>
        <div className="cont-meta">
          <span>Added {relDate(clip.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

function FolderCard({
  folder,
  count,
  done,
  onOpen,
}: {
  folder: Folder;
  count: number;
  done: number;
  onOpen: () => void;
}) {
  const pct = count ? Math.round((done / count) * 100) : 0;
  const color = folderColor(folder);
  return (
    <button type="button" className="folder-card" style={{ color }} onClick={onOpen}>
      <div className="folder-card-top">
        <span className="folder-card-dot" />
        <span className="folder-card-name">{folder.name}</span>
        <span className="folder-card-count">{count}</span>
      </div>
      <div className="folder-bar">
        <span className="fb-fill" style={{ width: pct + "%" }} />
      </div>
      <div className="folder-card-foot">
        <span style={{ color: "var(--text-3)" }}>
          {done} of {count} done
        </span>
        <span className="fcf-pct">{pct}%</span>
      </div>
    </button>
  );
}

export interface DashboardProps {
  email: string | null;
  videos: Video[];
  folders: Folder[];
  bookmarksCount: number;
  onAddClip: () => void;
  onOpenLibrary: () => void;
  onSelectFolder: (id: string) => void;
  onNewFolder: () => void;
}

export default function Dashboard({
  email,
  videos,
  folders,
  bookmarksCount,
  onAddClip,
  onOpenLibrary,
  onSelectFolder,
  onNewFolder,
}: DashboardProps) {
  const status = (v: Video) => v.practice_status ?? "none";
  const focusing = videos.filter((v) => status(v) === "focusing");
  const done = videos.filter((v) => status(v) === "done").length;
  const fresh = videos.length - focusing.length - done;

  const continueClips = focusing.slice(0, 6);
  const resumeTarget = focusing[0] ?? videos[0] ?? null;

  const folderVideoCount = new Map<string, number>();
  const folderDoneCount = new Map<string, number>();
  for (const v of videos) {
    if (!v.folder_id) continue;
    folderVideoCount.set(v.folder_id, (folderVideoCount.get(v.folder_id) ?? 0) + 1);
    if (status(v) === "done") {
      folderDoneCount.set(v.folder_id, (folderDoneCount.get(v.folder_id) ?? 0) + 1);
    }
  }

  const now = new Date();
  const dateLine = now
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
  const greeting = greetFor(now.getHours());
  const name = nameFromEmail(email);

  const heroSub =
    focusing.length > 0
      ? `You have ${focusing.length} clip${focusing.length === 1 ? "" : "s"} in focus — pick up where you left off.`
      : videos.length > 0
        ? "Mark a clip as “Focusing” to line up your next practice session."
        : "Add your first clip to start shadowing.";

  return (
    <main className="main dash">
      <div className="dash-inner">
        <div className="dash-hero">
          <div>
            <p className="dash-eyebrow">{dateLine}</p>
            <h1 className="dash-title">
              {greeting}, <span className="accent">{name}</span>
            </h1>
            <p className="dash-sub">{heroSub}</p>
          </div>
          <div className="dash-hero-actions">
            {resumeTarget && (
              <Link className="btn ghost" href={`/player/${resumeTarget.id}`}>
                <span className="btn-glyph">↻</span> Resume last
              </Link>
            )}
            <button type="button" className="btn primary" onClick={onAddClip}>
              <PlusIcon /> Add clip
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <StatTile
            label="In focus"
            value={focusing.length}
            unit="clips"
            tint="iris"
            icon={<DrillIcon />}
            foot={<span>Active practice targets</span>}
          />
          <StatTile
            label="Completed"
            value={done}
            unit="clips"
            tint="moss"
            icon={<CheckIcon />}
            foot={<span>Marked complete</span>}
          />
          <StatTile
            label="Total clips"
            value={videos.length}
            unit="clips"
            icon={<LibraryIcon />}
            foot={<span>In your library</span>}
          />
          <StatTile
            label="Bookmarks"
            value={bookmarksCount}
            unit="saved"
            tint="amber"
            icon={<BookmarkIcon />}
            foot={<span>Sentences for review</span>}
          />
        </div>

        <div className="dash-grid">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">This week&rsquo;s practice</h2>
                <p className="panel-sub">Minutes shadowed per day · last 7 days</p>
              </div>
            </div>
            {/* Honest placeholder: practice-session tracking isn't built yet. */}
            <div className="panel-empty">
              <ChartIcon width={20} height={20} />
              <div className="pe-title">Practice tracking is coming soon</div>
              <div className="pe-sub">
                Once shadowing sessions are logged, your daily minutes and streak
                will show up here.
              </div>
            </div>
          </div>
          <StatusRing focusing={focusing.length} done={done} fresh={fresh} />
        </div>

        <section>
          <div className="dash-section-head">
            <h2 className="dash-section-title">Continue practicing</h2>
            <button type="button" className="dash-section-link" onClick={onOpenLibrary}>
              All clips <ChevronRight />
            </button>
          </div>
          {continueClips.length > 0 ? (
            <div className="continue-grid">
              {continueClips.map((c) => (
                <ContinueCard
                  key={c.id}
                  clip={c}
                  folder={c.folder_id ? (folders.find((f) => f.id === c.folder_id) ?? null) : null}
                />
              ))}
            </div>
          ) : (
            <div className="panel-empty">
              <DrillIcon width={20} height={20} />
              <div className="pe-title">No clips in focus yet</div>
              <div className="pe-sub">
                Open a clip and set it to “Focusing” to keep it here for quick access.
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="dash-section-head">
            <h2 className="dash-section-title">Your folders</h2>
            <button type="button" className="dash-section-link" onClick={onOpenLibrary}>
              Open library <ChevronRight />
            </button>
          </div>
          <div className="folder-grid">
            {folders.map((f) => (
              <FolderCard
                key={f.id}
                folder={f}
                count={folderVideoCount.get(f.id) ?? 0}
                done={folderDoneCount.get(f.id) ?? 0}
                onOpen={() => onSelectFolder(f.id)}
              />
            ))}
            <button type="button" className="folder-card add" onClick={onNewFolder}>
              <span className="fca-ic"><PlusIcon /></span>
              New folder
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
