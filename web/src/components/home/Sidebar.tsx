"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Folder } from "@/lib/types";
import { FOLDER_COLOR_OPTIONS, folderColor } from "@/lib/folder-color";
import {
  BookmarkIcon,
  ChevronDownIcon,
  DotsIcon,
  GearIcon,
  InboxIcon,
  LibraryIcon,
  SearchIcon,
} from "./Icons";

export type ActiveSection =
  | { kind: "all" }
  | { kind: "recent" }
  | { kind: "folder"; id: string };

export interface SidebarProps {
  active: ActiveSection;
  onSelect: (section: ActiveSection) => void;
  folders: Folder[];
  videos: { id: string; folder_id: string | null }[];
  allCount: number;
  recentCount: number;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, name: string) => Promise<void> | void;
  onDeleteFolder: (folder: Folder) => Promise<void> | void;
  onSetFolderColor: (id: string, color: string) => Promise<void> | void;
}

export default function Sidebar({
  active,
  onSelect,
  folders,
  videos,
  allCount,
  recentCount,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSetFolderColor,
}: SidebarProps) {
  const pathname = usePathname();
  const onBookmarksRoute = pathname?.startsWith("/bookmarks");
  const onSettingsRoute = pathname?.startsWith("/settings");

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuFor) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuFor]);

  const startRename = (folder: Folder) => {
    setRenamingId(folder.id);
    setRenameValue(folder.name);
    setMenuFor(null);
    setTimeout(() => renameRef.current?.select(), 0);
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    const id = renamingId;
    setRenamingId(null);
    if (!trimmed) return;
    await onRenameFolder(id, trimmed);
  };

  const folderCounts = new Map<string, number>();
  for (const v of videos) {
    if (v.folder_id) {
      folderCounts.set(v.folder_id, (folderCounts.get(v.folder_id) ?? 0) + 1);
    }
  }

  const isAllActive = active.kind === "all" && !onBookmarksRoute && !onSettingsRoute;
  const isRecentActive =
    active.kind === "recent" && !onBookmarksRoute && !onSettingsRoute;

  return (
    <aside className="sidebar">
      <div className="brand">
        Shadowing<span className="plus">+</span>
      </div>

      <div className="search">
        <span className="icon"><SearchIcon /></span>
        <input
          placeholder="Search clips, folders…"
          aria-label="Search (not yet active)"
          disabled
        />
        <kbd>⌘K</kbd>
      </div>

      <nav className="nav-section" aria-label="Library">
        <div className="nav-head"><span>Library</span></div>
        <button
          type="button"
          className={"nav-item" + (isAllActive ? " active" : "")}
          onClick={() => onSelect({ kind: "all" })}
        >
          <span className="nav-icon"><LibraryIcon /></span>
          <span className="nav-label">All clips</span>
          <span className="nav-count">{allCount}</span>
        </button>
        <button
          type="button"
          className={"nav-item" + (isRecentActive ? " active" : "")}
          onClick={() => onSelect({ kind: "recent" })}
        >
          <span className="nav-icon"><InboxIcon /></span>
          <span className="nav-label">Recently added</span>
          <span className="nav-count">{recentCount}</span>
        </button>
        <Link
          href="/bookmarks"
          className={"nav-item" + (onBookmarksRoute ? " active" : "")}
        >
          <span className="nav-icon"><BookmarkIcon /></span>
          <span className="nav-label">Bookmarks</span>
        </Link>
      </nav>

      <nav className="nav-section" aria-label="Folders">
        <div className="nav-head">
          <span>Folders</span>
          <button
            type="button"
            onClick={onCreateFolder}
            title="New folder"
            aria-label="New folder"
          >
            ＋
          </button>
        </div>
        {folders.map((f) => {
          const isActive =
            !onBookmarksRoute && active.kind === "folder" && active.id === f.id;
          const isRenaming = renamingId === f.id;
          const isMenuOpen = menuFor === f.id;
          return (
            <div key={f.id} style={{ position: "relative" }}>
              <button
                type="button"
                className={"nav-item" + (isActive ? " active" : "")}
                onClick={() => {
                  if (isRenaming) return;
                  onSelect({ kind: "folder", id: f.id });
                }}
              >
                <span className="nav-icon" style={{ color: folderColor(f) }}>
                  <span className="nav-folder-dot" />
                </span>
                {isRenaming ? (
                  <input
                    ref={renameRef}
                    className="nav-folder-rename"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape") {
                        setRenamingId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="nav-label">{f.name}</span>
                )}
                <span className="nav-count">{folderCounts.get(f.id) ?? 0}</span>
                <span
                  className={"item-menu" + (isMenuOpen ? " is-open" : "")}
                  role="button"
                  tabIndex={0}
                  aria-label="Folder actions"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor((cur) => (cur === f.id ? null : f.id));
                  }}
                  style={{ marginLeft: 4 }}
                >
                  <DotsIcon />
                </span>
              </button>

              {isMenuOpen && (
                <div ref={menuRef} className="item-menu-dropdown">
                  <button type="button" onClick={() => startRename(f)}>
                    Rename
                  </button>
                  <div className="menu-sep" />
                  <div className="color-swatches" role="group" aria-label="Folder color">
                    {FOLDER_COLOR_OPTIONS.map((c) => (
                      <span
                        key={c}
                        role="button"
                        tabIndex={0}
                        title={c}
                        aria-label={`Set color ${c}`}
                        className={
                          "color-swatch" +
                          (folderColor(f) === c ? " active" : "")
                        }
                        style={{ background: c }}
                        onClick={() => {
                          onSetFolderColor(f.id, c);
                          setMenuFor(null);
                        }}
                      />
                    ))}
                  </div>
                  <div className="menu-sep" />
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      setMenuFor(null);
                      onDeleteFolder(f);
                    }}
                  >
                    Delete folder
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {folders.length === 0 && (
          <p className="menu-empty" style={{ padding: "4px 8px" }}>
            No folders yet
          </p>
        )}
      </nav>

      <div className="sidebar-foot">
        <Link
          href="/settings"
          className={"nav-item" + (onSettingsRoute ? " active" : "")}
        >
          <span className="nav-icon"><GearIcon /></span>
          <span className="nav-label">Settings</span>
        </Link>
        <div className="sidebar-foot-meta">
          <span>v2 · Shadowing+</span>
          <span className="kbd-hint" aria-hidden>
            <ChevronDownIcon />
          </span>
        </div>
      </div>
    </aside>
  );
}
