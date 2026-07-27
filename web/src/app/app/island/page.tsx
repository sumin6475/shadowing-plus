"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Folder } from "@/lib/types";
import type { Island, IslandBeat } from "@/lib/island";
import Sidebar, { type ActiveSection } from "@/components/home/Sidebar";
import NewFolderModal from "@/components/home/NewFolderModal";
import {
  LIVenn,
  LIHelpButton,
  LICapture,
  LIBeats,
  LIRough,
  LIPracticeCTA,
  type Beat,
} from "@/components/island/IslandPieces";

import "../../home.css";
import "./island.css";

const ACTIVE_SECTION_KEY = "sp:home:section";
// Muting the first-run explainer modal. (Legacy value "sp:island:vennDismissed"
// pre-dates the modal; treat any stored value as "muted".)
const VENN_KEY = "sp:island:vennDismissed";

export default function IslandPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allVideos, setAllVideos] = useState<{ id: string; folder_id: string | null; created_at: string }[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [island, setIsland] = useState<Island | null>(null);
  const [rawAnswer, setRawAnswer] = useState("");
  const [beats, setBeats] = useState<Beat[]>([]);
  const [shaping, setShaping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vennMuted, setVennMuted] = useState(true); // assume muted until we've read localStorage
  const [vennModalOpen, setVennModalOpen] = useState(false);

  useEffect(() => {
    try {
      setVennMuted(Boolean(localStorage.getItem(VENN_KEY)));
    } catch {
      setVennMuted(false);
    }
  }, []);

  // Load sidebar data + the learner's active island + its beats (RLS-scoped).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [islandRes, foldersRes, videosRes] = await Promise.all([
        supabase
          .from("islands")
          .select("*")
          .eq("kind", "explain_what_i_do")
          .neq("status", "archived")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("folders").select("*").order("created_at"),
        supabase.from("videos").select("id, folder_id, created_at").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setFolders((foldersRes.data ?? []) as Folder[]);
      setAllVideos((videosRes.data ?? []) as { id: string; folder_id: string | null; created_at: string }[]);
      const isl = islandRes.data as Island | null;
      if (isl) {
        setIsland(isl);
        setRawAnswer(isl.raw_answer ?? "");
        const { data: beatRows } = await supabase
          .from("island_beats")
          .select("id, text, evidence, source, position")
          .eq("island_id", isl.id)
          .order("position");
        if (!cancelled && beatRows) {
          setBeats((beatRows as IslandBeat[]).map((b) => ({ id: b.id, text: b.text, evidence: b.evidence ?? null, source: b.source })));
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const muteVenn = useCallback(() => {
    setVennMuted(true);
    setVennModalOpen(false);
    try {
      localStorage.setItem(VENN_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  // First-run explainer: auto-open the "why this island" modal once, for a
  // learner who hasn't muted it and hasn't started a message yet.
  const [vennAutoShown, setVennAutoShown] = useState(false);
  useEffect(() => {
    if (loading || vennAutoShown || vennMuted) return;
    if (beats.length === 0) setVennModalOpen(true);
    setVennAutoShown(true);
  }, [loading, vennAutoShown, vennMuted, beats.length]);

  const ensureIsland = useCallback(async (): Promise<Island | null> => {
    if (island) {
      await supabase
        .from("islands")
        .update({ raw_answer: rawAnswer, status: "shaping", updated_at: new Date().toISOString() })
        .eq("id", island.id);
      return island;
    }
    const { data, error: insErr } = await supabase
      .from("islands")
      .insert({ kind: "explain_what_i_do", raw_answer: rawAnswer, status: "shaping" })
      .select("*")
      .single();
    if (insErr) {
      setError(
        /does not exist/i.test(insErr.message)
          ? "Apply supabase/migrations/019_speaking_memory_island.sql in Supabase first."
          : insErr.message,
      );
      return null;
    }
    const isl = data as Island;
    setIsland(isl);
    return isl;
  }, [island, rawAnswer]);

  const persistBeats = useCallback(async (islandId: string, next: Beat[]) => {
    await supabase.from("island_beats").delete().eq("island_id", islandId);
    const rows = next
      .filter((b) => b.text.trim())
      .map((b, i) => ({ island_id: islandId, position: i, text: b.text.trim(), evidence: b.evidence?.trim() || null, source: b.source }));
    if (rows.length === 0) return [] as IslandBeat[];
    const { data } = await supabase
      .from("island_beats")
      .insert(rows)
      .select("id, text, evidence, source, position")
      .order("position");
    return (data as IslandBeat[] | null) ?? [];
  }, []);

  const shape = useCallback(async () => {
    if (!rawAnswer.trim() || shaping) return;
    setShaping(true);
    setError(null);
    try {
      const isl = await ensureIsland();
      if (!isl) return;
      const res = await fetch("/api/island/shape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawAnswer }),
      });
      const data = (await res.json().catch(() => ({}))) as { beats?: { text: string; evidence: string | null }[]; error?: string };
      if (!res.ok || !data.beats) {
        setError(data.error || "Couldn't shape your answer.");
        return;
      }
      const shaped: Beat[] = data.beats.map((b) => ({ text: b.text, evidence: b.evidence, source: "ai_structured" as const }));
      const persisted = await persistBeats(isl.id, shaped);
      setBeats(persisted.length ? persisted.map((b) => ({ id: b.id, text: b.text, evidence: b.evidence ?? null, source: b.source })) : shaped);
      setDirty(false);
      setSaved(false);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setShaping(false);
    }
  }, [rawAnswer, shaping, ensureIsland, persistBeats]);

  const saveBeats = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const isl = await ensureIsland();
      if (!isl) return;
      const persisted = await persistBeats(isl.id, beats);
      if (persisted.length) {
        setBeats(persisted.map((b) => ({ id: b.id, text: b.text, evidence: b.evidence ?? null, source: b.source })));
      }
      await supabase.from("islands").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", isl.id);
      setIsland((prev) => (prev ? { ...prev, status: "ready" } : prev));
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  }, [beats, saving, ensureIsland, persistBeats]);

  const editBeat = (i: number, text: string) =>
    setBeats((prev) => {
      const b = prev[i];
      if (!b || b.text === text) return prev;
      setDirty(true);
      return prev.map((x, k) => (k === i ? { ...x, text, source: "learner" } : x));
    });
  const moveBeat = (i: number, dir: -1 | 1) =>
    setBeats((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      setDirty(true);
      return next;
    });
  const removeBeat = (i: number) => { setBeats((prev) => prev.filter((_, k) => k !== i)); setDirty(true); };
  const addBeat = () => { setBeats((prev) => [...prev, { text: "New beat — say it in your own words.", evidence: null, source: "learner" }]); setDirty(true); };

  // ── sidebar + folders (mirrors bookmarks/phrases) ─────
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
      const { data, error: e } = await supabase.from("folders").insert({ name: input.name, color: input.color }).select().single();
      if (e) return alert(`Failed to create folder: ${e.message}`);
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

  const [recentCutoff] = useState(() => Date.now() - 14 * 24 * 3600 * 1000);
  const recentCount = useMemo(
    () => allVideos.filter((v) => new Date(v.created_at).getTime() >= recentCutoff).length,
    [allVideos, recentCutoff],
  );

  const hasBeats = beats.length > 0;
  const status = shaping
    ? { label: "Shaping", cls: "st-practicing" }
    : !island
      ? null
      : island.status === "ready" && !dirty
        ? { label: "Ready", cls: "st-ready" }
        : hasBeats && dirty
          ? { label: "Draft — unsaved beats", cls: "st-practicing" }
          : { label: "Draft", cls: "st-new" };
  const showPractice = hasBeats && !dirty && island?.status === "ready";

  return (
    <div className="home-app island-app">
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
      />
      <NewFolderModal open={newFolderOpen} onCancel={() => setNewFolderOpen(false)} onCreate={createFolder} existingNames={folders.map((f) => f.name)} />

      <main className="main">
        <div className="main-inner">
          <div className="li-wrap">
            <div className="li-head">
              <div className="li-head-row">
                <div>
                  <div className="li-eyebrow">Language Island <span className="crumb">/ your first island</span></div>
                  <h1 className="li-title">Explain what I do</h1>
                  <p className="li-lede">Start from a rough explanation in your own words. We&rsquo;ll help you shape it into clear message beats — then you use the English you already have.</p>
                </div>
                <div className="li-head-aside">
                  {status && <span className={"li-status " + status.cls}><span className="dot" />{status.label}</span>}
                  <LIHelpButton onClick={() => setVennModalOpen(true)} />
                </div>
              </div>
            </div>

            {vennModalOpen && (
              <LIVenn modal onClose={() => setVennModalOpen(false)} onNeverShow={muteVenn} />
            )}

            {loading ? (
              <p className="li-loading">Loading your island…</p>
            ) : (
              <>
                {!hasBeats && (
                  <LICapture value={rawAnswer} onChange={setRawAnswer} onShape={shape} shaping={shaping} />
                )}

                {error && <p className="li-error">{error}</p>}

                {hasBeats && (
                  <>
                    <LIVenn mini />
                    {showPractice && <LIPracticeCTA />}
                    <LIBeats
                      beats={beats}
                      onEdit={editBeat}
                      onMove={moveBeat}
                      onRemove={removeBeat}
                      onAdd={addBeat}
                      onSave={saveBeats}
                      onReshape={shape}
                      saving={saving}
                      saved={saved}
                    />
                    {rawAnswer.trim() && <LIRough text={rawAnswer} />}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
