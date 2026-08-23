"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Folder } from "@/lib/types";
import Sidebar, { type ActiveSection } from "@/components/home/Sidebar";
import NewFolderModal from "@/components/home/NewFolderModal";
import FocusList from "@/components/focus/FocusList";
import { useWeakPoints } from "@/lib/useWeakPoints";
import { nextFolderPosition } from "@/lib/folders";
import { persistFolderPositions } from "@/lib/persist-folders";
import { groupWeakPoints } from "@/lib/weak-points";

import "../home.css";
import "./focus.css";

const ACTIVE_SECTION_KEY = "sp:home:section";

export default function FocusPage() {
  const router = useRouter();
  const { items, loading, error, add, update, remove } = useWeakPoints();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allVideos, setAllVideos] = useState<{ id: string; folder_id: string | null; created_at: string }[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [hideDone, setHideDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [foldersRes, videosRes] = await Promise.all([
        supabase.from("folders").select("*").order("position").order("created_at"),
        supabase.from("videos").select("id, folder_id, created_at").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setFolders((foldersRes.data ?? []) as Folder[]);
      setAllVideos((videosRes.data ?? []) as { id: string; folder_id: string | null; created_at: string }[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSidebarSelect = useCallback(
    (section: ActiveSection) => {
      try {
        localStorage.setItem(ACTIVE_SECTION_KEY, JSON.stringify(section));
      } catch {
        /* ignore */
      }
      router.push("/app");
    },
    [router],
  );

  const createFolder = useCallback(
    async (input: { name: string; color: string }) => {
      const { data, error: err } = await supabase
        .from("folders")
        .insert({ name: input.name, color: input.color, position: nextFolderPosition(folders) })
        .select()
        .single();
      if (err) {
        alert(`Failed to create folder: ${err.message}`);
        return;
      }
      if (data) {
        setFolders((prev) => [...prev, data as Folder]);
        setNewFolderOpen(false);
        handleSidebarSelect({ kind: "folder", id: data.id });
      }
    },
    [folders, handleSidebarSelect],
  );

  const renameFolder = useCallback(async (id: string, name: string) => {
    await supabase.from("folders").update({ name }).eq("id", id);
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback(async (folder: Folder) => {
    if (!confirm(`Delete folder "${folder.name}"?\nClips inside will move to the root.`)) return;
    await supabase.from("folders").delete().eq("id", folder.id);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
  }, []);

  const setFolderColor = useCallback(async (id: string, color: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, color } : f)));
    await supabase.from("folders").update({ color }).eq("id", id);
  }, []);

  const reorderFolders = useCallback(async (next: Folder[]) => {
    setFolders(next);
    const err = await persistFolderPositions(next);
    if (err) alert(`Couldn't reorder folders: ${err}`);
  }, []);

  const [recentCutoff] = useState(() => Date.now() - 14 * 24 * 3600 * 1000);
  const recentCount = useMemo(
    () => allVideos.filter((v) => new Date(v.created_at).getTime() >= recentCutoff).length,
    [allVideos, recentCutoff],
  );

  const visible = hideDone ? items.filter((item) => !item.completed) : items;
  const groups = groupWeakPoints(items);
  const openCount = items.filter((item) => !item.completed).length;
  const starredCount = items.filter((item) => item.starred && !item.completed).length;

  return (
    <div className="home-app wp-home">
      <Sidebar
        active={{ kind: "all" }}
        onSelect={handleSidebarSelect}
        folders={folders}
        videos={allVideos.map((v) => ({ id: v.id, folder_id: v.folder_id }))}
        allCount={allVideos.length}
        recentCount={recentCount}
        onCreateFolder={() => setNewFolderOpen(true)}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onSetFolderColor={setFolderColor}
        onReorderFolders={reorderFolders}
      />

      <NewFolderModal
        open={newFolderOpen}
        onCancel={() => setNewFolderOpen(false)}
        onCreate={createFolder}
        existingNames={folders.map((f) => f.name)}
      />

      <main className="main">
        <div className="main-inner wp-page">
          <header className="wp-head">
            <div>
              <h1 className="page-title">Weak points</h1>
              <p className="wp-lede">
                Things you want to watch while you shadow — sounds, endings, a word that keeps slipping.
                Star the ones that matter right now; they pin to the player.
              </p>
            </div>
          </header>

          <div className="wp-meta">
            <span><b>{openCount}</b> open</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span><b>{starredCount}</b> starred for the player</span>
            <span style={{ color: "var(--text-4)" }}>·</span>
            <span>{groups.length} {groups.length === 1 ? "group" : "groups"}</span>
            <button
              type="button"
              className={"btn ghost" + (hideDone ? " is-active" : "")}
              onClick={() => setHideDone((v) => !v)}
              style={{ marginLeft: "auto" }}
            >
              {hideDone ? "Showing open" : "Hide done"}
            </button>
          </div>

          {error ? <p className="wp-banner">{error}</p> : null}

          {loading && items.length === 0 ? (
            <p className="wp-empty">Loading…</p>
          ) : (
            <FocusList
              items={visible}
              onAdd={add}
              onUpdate={update}
              onDelete={remove}
              emptyLabel="Add a line. Star it when you want it sitting next to the clip."
            />
          )}
        </div>
      </main>
    </div>
  );
}
