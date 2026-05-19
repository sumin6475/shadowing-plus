"use client";

import { useEffect } from "react";
import type { Folder } from "@/lib/types";
import { folderColor } from "@/lib/folder-color";
import type { ActiveSection } from "@/components/home/Sidebar";
import {
  BookmarkIcon,
  CloseIcon,
  InboxIcon,
  LibraryIcon,
  PlusIcon,
  SearchIcon,
} from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  active: ActiveSection;
  onSelect: (s: ActiveSection) => void;
  folders: Folder[];
  allCount: number;
  recentCount: number;
  bookmarksCount: number;
  folderCounts: Record<string, number>;
  onCreateFolder: () => void;
}

export default function MobileDrawer({
  open,
  onClose,
  active,
  onSelect,
  folders,
  allCount,
  recentCount,
  bookmarksCount,
  folderCounts,
  onCreateFolder,
}: Props) {
  // ESC + body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const pick = (s: ActiveSection) => {
    onSelect(s);
    onClose();
  };

  const folderActive = (id: string) =>
    active.kind === "folder" && active.id === id;

  // Rendered as a child of .m-app (not via portal) so the drawer inherits
  // the same CSS variables / font scope and isn't affected by iOS Safari's
  // text-size-adjust on out-of-scope subtrees.
  return (
    <>
      <div
        className={"m-drawer-backdrop" + (open ? " is-open" : "")}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={"m-drawer" + (open ? " is-open" : "")}
        role="dialog"
        aria-label="Navigation"
        aria-hidden={!open}
      >
        <div className="m-drawer-head">
          <div className="m-drawer-brand">
            Shadowing<span className="plus">+</span>
          </div>
          <button
            type="button"
            className="m-icon-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="m-search">
          <span className="m-search-icon"><SearchIcon /></span>
          <input type="search" placeholder="Search clips, folders…" />
        </div>

        <div className="m-drawer-section">
          <div className="m-drawer-head-row">Library</div>
          <button
            type="button"
            className={"m-drawer-item" + (active.kind === "all" ? " active" : "")}
            onClick={() => pick({ kind: "all" })}
          >
            <span className="m-drawer-icon"><LibraryIcon /></span>
            All clips
            <span className="m-drawer-count">{allCount}</span>
          </button>
          <button
            type="button"
            className={"m-drawer-item" + (active.kind === "recent" ? " active" : "")}
            onClick={() => pick({ kind: "recent" })}
          >
            <span className="m-drawer-icon"><InboxIcon /></span>
            Recently added
            <span className="m-drawer-count">{recentCount}</span>
          </button>
          <a className="m-drawer-item" href="/bookmarks" onClick={onClose}>
            <span className="m-drawer-icon"><BookmarkIcon /></span>
            Bookmarks
            <span className="m-drawer-count">{bookmarksCount}</span>
          </a>
        </div>

        <div className="m-drawer-section">
          <div className="m-drawer-head-row">
            Folders
            <button
              type="button"
              className="m-icon-btn"
              style={{ width: 28, height: 28 }}
              onClick={onCreateFolder}
              aria-label="New folder"
            >
              <PlusIcon />
            </button>
          </div>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              className={"m-drawer-item" + (folderActive(f.id) ? " active" : "")}
              onClick={() => pick({ kind: "folder", id: f.id })}
              style={{ color: folderColor(f) }}
            >
              <span className="m-drawer-folder-dot" />
              <span style={{ color: folderActive(f.id) ? "var(--accent-text)" : "var(--text-2)" }}>
                {f.name}
              </span>
              <span className="m-drawer-count">{folderCounts[f.id] ?? 0}</span>
            </button>
          ))}
          {folders.length === 0 && (
            <p style={{ padding: "8px 12px", color: "var(--text-4)", fontSize: 12 }}>
              No folders yet
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
