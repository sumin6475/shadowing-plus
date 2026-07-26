"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Folder } from "@/lib/types";
import Sidebar, { type ActiveSection } from "@/components/home/Sidebar";
import NewFolderModal from "@/components/home/NewFolderModal";
import {
  applyQuickCheck,
  deriveDisplayStatus,
  type PhraseDisplayStatus,
  type PhraseQuickCheck,
} from "@/lib/phrase-srs";
import {
  PB_ORDER,
  PB_STATUS,
  PhraseCard,
  PhraseBankEmpty,
  ReadinessMeter,
  ReviewPanel,
  SuggestionCard,
  NoResults,
  type PhraseRow,
  type ReviewItem,
} from "@/components/phrases/PhraseBank";
import { PlusIcon, SearchIcon } from "@/components/phrases/Icons";

import "../home.css";
import "./phrases.css";

const ACTIVE_SECTION_KEY = "sp:home:section";

const REVIEW_WHY: Partial<Record<PhraseDisplayStatus, string>> = {
  refresh: "learned earlier, not practiced recently",
  recognizing: "understood, but not yet used independently",
  practicing: "ready for a real-answer challenge",
};

function zeroCounts(): Record<PhraseDisplayStatus, number> {
  return { new: 0, recognizing: 0, practicing: 0, ready: 0, refresh: 0 };
}

export default function PhrasesPage() {
  const router = useRouter();
  const [phrases, setPhrases] = useState<PhraseRow[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allVideos, setAllVideos] = useState<{ id: string; folder_id: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PhraseDisplayStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, { id: PhraseQuickCheck; days: number }>>({});
  const [reviewDismissed, setReviewDismissed] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [text, setText] = useState("");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [dismissedSuggest, setDismissedSuggest] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sp:pb:dismissedSuggest");
      if (raw) setDismissedSuggest(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async () => {
    const [phrasesRes, foldersRes, videosRes] = await Promise.all([
      // select("*") so the page still loads before migration 018 is applied —
      // the learning_status/SRS columns just come back undefined and default.
      supabase
        .from("phrase_items")
        .select("*, video:videos(title, video_url)")
        .order("created_at", { ascending: false }),
      supabase.from("folders").select("*").order("created_at"),
      supabase.from("videos").select("id, folder_id, created_at").order("created_at", { ascending: false }),
    ]);
    setPhrases((phrasesRes.data ?? []) as unknown as PhraseRow[]);
    setFolders((foldersRes.data ?? []) as Folder[]);
    setAllVideos((videosRes.data ?? []) as { id: string; folder_id: string | null; created_at: string }[]);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await refresh();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  // Fold each phrase to its display status, sorted by last practiced (then by
  // save date for never-practiced), matching the design's "Sorted by last
  // practiced".
  const withStatus = useMemo(() => {
    const now = new Date();
    return phrases
      .map((p) => ({
        p,
        display: deriveDisplayStatus(
          { learning_status: p.learning_status ?? "new", due_at: p.due_at ?? null },
          now,
        ),
      }))
      .sort((a, b) => {
        const ta = new Date(a.p.last_practiced_at ?? a.p.created_at).getTime();
        const tb = new Date(b.p.last_practiced_at ?? b.p.created_at).getTime();
        return tb - ta;
      });
  }, [phrases]);

  const counts = useMemo(() => {
    const c = zeroCounts();
    for (const { display } of withStatus) c[display] += 1;
    return c;
  }, [withStatus]);

  const query = q.trim().toLowerCase();
  const visible = useMemo(
    () =>
      withStatus.filter(({ p, display }) => {
        if (filter !== "all" && display !== filter) return false;
        if (!query) return true;
        return [p.text, p.meaning_ko, p.usage_note, p.source_context?.sentence, p.video?.title, p.island, ...(p.tags ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      }),
    [withStatus, filter, query],
  );

  const reviewItems: ReviewItem[] = useMemo(
    () =>
      withStatus
        .filter(({ display }) => display === "refresh" || display === "recognizing" || display === "practicing")
        .slice(0, 4)
        .map(({ p, display }) => ({ id: p.id, phrase: p.text, status: display, why: REVIEW_WHY[display] ?? "" })),
    [withStatus],
  );

  const filters = useMemo(
    () => [
      { id: "all" as const, label: "All", n: phrases.length, dot: undefined as string | undefined },
      ...PB_ORDER.map((k) => ({ id: k, label: PB_STATUS[k].label, n: counts[k], dot: PB_STATUS[k].dot })),
    ],
    [phrases.length, counts],
  );

  // ── quick-check → SRS update ───────────────────────────
  const onCheck = useCallback(async (p: PhraseRow, check: PhraseQuickCheck) => {
    const next = applyQuickCheck(
      { ease_factor: p.ease_factor ?? null, interval_days: p.interval_days ?? null, lapses: p.lapses ?? null },
      check,
    );
    // Optimistic local update.
    setPhrases((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? {
              ...x,
              learning_status: next.learning_status,
              ease_factor: next.ease_factor,
              interval_days: next.interval_days,
              lapses: next.lapses,
              due_at: next.due_at,
              last_reviewed_at: next.last_reviewed_at,
              last_practiced_at: next.last_practiced_at,
            }
          : x,
      ),
    );
    setChecks((prev) => ({ ...prev, [p.id]: { id: check, days: Math.round(next.interval_days) } }));

    const { error } = await supabase
      .from("phrase_items")
      .update({
        learning_status: next.learning_status,
        ease_factor: next.ease_factor,
        interval_days: next.interval_days,
        lapses: next.lapses,
        due_at: next.due_at,
        last_reviewed_at: next.last_reviewed_at,
        last_practiced_at: next.last_practiced_at,
      })
      .eq("id", p.id);
    if (error) {
      alert(
        "Couldn't save review progress. Apply supabase/migrations/018_phrase_learning_status.sql in Supabase, then try again.",
      );
    }
  }, []);

  const deletePhrase = useCallback(async (id: string) => {
    setPhrases((prev) => prev.filter((x) => x.id !== id));
    await supabase.from("phrase_items").delete().eq("id", id);
  }, []);

  const editNote = useCallback(async (p: PhraseRow) => {
    const next = window.prompt("Edit note", p.usage_note ?? "");
    if (next === null) return;
    const note = next.trim() || null;
    setPhrases((prev) => prev.map((x) => (x.id === p.id ? { ...x, usage_note: note } : x)));
    await supabase.from("phrase_items").update({ usage_note: note }).eq("id", p.id);
  }, []);

  const addManual = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const value = text.trim();
      if (!value || saving) return;
      setSaving(true);
      setFormError(null);
      try {
        const res = await fetch("/api/phrases", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ manual: true, text: value, meaning_ko: meaning.trim(), usage_note: note.trim() }),
        });
        const data = (await res.json().catch(() => ({}))) as { item?: PhraseRow; alreadySaved?: boolean; error?: string };
        if (!res.ok || !data.item) {
          setFormError(data.error || "Couldn't save this phrase.");
          return;
        }
        if (!data.alreadySaved) {
          setPhrases((prev) => [{ ...(data.item as PhraseRow), video: null }, ...prev]);
        }
        setText("");
        setMeaning("");
        setNote("");
        setAddOpen(false);
      } catch {
        setFormError("Network error. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [text, meaning, note, saving],
  );

  // ── sidebar + folders (mirrors bookmarks/page.tsx) ─────
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
      const { data, error } = await supabase.from("folders").insert({ name: input.name, color: input.color }).select().single();
      if (error) {
        alert(`Failed to create folder: ${error.message}`);
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

  const showReview = !reviewDismissed && reviewItems.length > 0;

  // The nudge card surfaces the top due phrase that hasn't been dismissed.
  const suggestion = useMemo(
    () => reviewItems.find((r) => !dismissedSuggest.has(r.id)) ?? null,
    [reviewItems, dismissedSuggest],
  );
  const dismissSuggestion = useCallback((id: string) => {
    setDismissedSuggest((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem("sp:pb:dismissedSuggest", JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
      <div className="home-app pb-home">
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

        <NewFolderModal
          open={newFolderOpen}
          onCancel={() => setNewFolderOpen(false)}
          onCreate={createFolder}
          existingNames={folders.map((f) => f.name)}
        />

        <main className="main">
          <div className="main-inner pb-page">
            <div className="pb-head">
              <div>
                <h1 className="page-title">Phrase Bank</h1>
                <div className="pb-head-meta">
                  <span>English you understood, kept here — ready when you need to say it</span>
                </div>
              </div>
              <div className="page-actions">
                <button type="button" className="btn primary" onClick={() => setAddOpen((v) => !v)}>
                  <PlusIcon /> Add a phrase
                </button>
              </div>
            </div>

            {addOpen && (
              <form className="pb-add-form" onSubmit={addManual}>
                <label>
                  Phrase
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. take the plunge" maxLength={240} autoFocus />
                </label>
                <label>
                  Meaning <span>(optional)</span>
                  <input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="What this phrase means to you" maxLength={500} />
                </label>
                <label>
                  Note <span>(optional)</span>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="When you’d use it, or its nuance" maxLength={500} />
                </label>
                {formError && <p className="pb-add-error">{formError}</p>}
                <button type="submit" className="btn primary" disabled={!text.trim() || saving} style={{ justifySelf: "start" }}>
                  {saving ? "Saving…" : "Save to Phrase Bank"}
                </button>
              </form>
            )}

            {!loading && phrases.length > 0 && <ReadinessMeter counts={counts} total={phrases.length} />}

            {!loading && showReview && <ReviewPanel items={reviewItems} onDismiss={() => setReviewDismissed(true)} />}

            <div className="pb-searchbar">
              <SearchIcon />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={"Try “take the plunge”, “job interview”, or “Saved from video”…"}
              />
              <kbd>⌘K</kbd>
            </div>

            {!loading && phrases.length > 0 && (
              <div className="pb-filters">
                {filters.map((f) => (
                  <button key={f.id} type="button" className={"pb-chip" + (filter === f.id ? " active" : "")} onClick={() => setFilter(f.id)}>
                    {f.dot && <span className="dot" style={{ background: f.dot }} />}
                    {f.label}
                    <span className="n">{f.n}</span>
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p className="pb-loading">Loading Phrase Bank…</p>
            ) : phrases.length === 0 ? (
              <PhraseBankEmpty onAdd={() => setAddOpen(true)} />
            ) : visible.length === 0 ? (
              <NoResults q={q} onClear={() => { setQ(""); setFilter("all"); }} onAdd={() => { setText(q); setAddOpen(true); }} />
            ) : (
              <>
                <div className="pb-count">
                  <span>
                    {visible.length} phrase{visible.length === 1 ? "" : "s"}
                    {filter !== "all" ? " · " + PB_STATUS[filter].label : ""}
                  </span>
                  <span>Sorted by last practiced</span>
                </div>
                <div className="pb-list">
                  {visible.map(({ p, display }) => (
                    <PhraseCard
                      key={p.id}
                      p={p}
                      displayStatus={display}
                      open={openId === p.id}
                      checked={checks[p.id] ?? null}
                      onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                      onCheck={(c) => onCheck(p, c)}
                      onEditNote={() => editNote(p)}
                      onDelete={() => deletePhrase(p.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>

        {!loading && suggestion && (
          <SuggestionCard
            phrase={suggestion.phrase}
            why={suggestion.why}
            onDismiss={() => dismissSuggestion(suggestion.id)}
          />
        )}
      </div>
  );
}
