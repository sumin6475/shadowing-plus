"use client";

import { useEffect } from "react";
import type { Folder, Video } from "@/lib/types";
import { folderColor } from "@/lib/folder-color";
import {
  BookmarkIcon,
  DrillIcon,
  PlayIcon,
  TrashIcon,
} from "./Icons";

interface Props {
  open: boolean;
  video: Video | null;
  folder: Folder | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ConfirmDeleteClipModal({
  open,
  video,
  folder,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open || !video) return null;

  return (
    <div
      className="nf-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="nf-card cd-card dcl-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dcl-title"
      >
        <header className="nf-head cd-head">
          <div className="cd-icon" aria-hidden="true">
            <TrashIcon />
          </div>
          <div className="cd-head-text">
            <h2 id="dcl-title" className="nf-title">
              Delete this clip?
            </h2>
            <p className="nf-sub">
              This removes the clip and everything you&apos;ve built around it.
            </p>
          </div>
          <button
            type="button"
            className="nf-close"
            onClick={onCancel}
            aria-label="Close"
            title="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>

        <div className="nf-body cd-body">
          <div className="dcl-clip">
            <div className="dcl-thumb" data-kind={video.media_type}>
              <PlayIcon />
            </div>
            <div className="dcl-clip-body">
              <div className="dcl-clip-title">{video.title}</div>
              <div className="dcl-clip-meta">
                {folder && (
                  <span className="dcl-clip-folder">
                    <span
                      className="dcl-dot"
                      style={{ background: folderColor(folder) }}
                      aria-hidden="true"
                    />
                    {folder.name}
                  </span>
                )}
                {folder && (
                  <span className="dcl-sep" aria-hidden="true">
                    ·
                  </span>
                )}
                <span>{video.media_type === "audio" ? "Audio" : "Video"}</span>
                <span className="dcl-sep" aria-hidden="true">
                  ·
                </span>
                <span>{formatDuration(video.duration)}</span>
              </div>
            </div>
          </div>

          <ul className="dcl-loss">
            <li>
              <PlayIcon /> The clip and its full transcript
            </li>
            <li>
              <BookmarkIcon /> Saved bookmarks &amp; notes
            </li>
            <li>
              <DrillIcon /> Practice progress and status
            </li>
          </ul>
        </div>

        <footer className="nf-foot">
          <span className="nf-foot-hint">
            <kbd>Esc</kbd> to cancel · <kbd>↵</kbd> to delete
          </span>
          <div className="nf-foot-actions">
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={onConfirm}
              autoFocus
            >
              <TrashIcon />
              Delete clip
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
