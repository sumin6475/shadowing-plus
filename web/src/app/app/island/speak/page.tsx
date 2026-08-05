"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { canSeeIsland } from "@/lib/islandAccess";
import type { Folder } from "@/lib/types";
import type { Island, IslandBeat } from "@/lib/island";
import Sidebar, { type ActiveSection } from "@/components/home/Sidebar";
import NewFolderModal from "@/components/home/NewFolderModal";
import { BackIcon, ReplayIcon } from "@/components/phrases/Icons";
import {
  SLDots,
  SLAttempt,
  SLGapCard,
  SLRepair,
  SLEvidence,
  SLRecap,
  type SpeakStep,
} from "@/components/island/SpeakPieces";
import {
  repairSchedule,
  usedInAttempt,
  SPEAK_EVIDENCE,
  SPEAK_GAP_META,
  type Diagnosis,
  type EvidenceChoice,
} from "@/lib/island-speak";

import "../../../home.css";
import "../island.css";
import "./speak.css";

const ACTIVE_SECTION_KEY = "sp:home:section";

type BeatRow = { id: string; text: string };

export default function SpeakLoopPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allVideos, setAllVideos] = useState<{ id: string; folder_id: string | null; created_at: string }[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [island, setIsland] = useState<Island | null>(null);
  const [beats, setBeats] = useState<BeatRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── loop state ──────────────────────────────────────────
  const [step, setStep] = useState<SpeakStep>("attempt1");
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceChoice | null>(null);
  const [newPhraseSaved, setNewPhraseSaved] = useState(false);
  const [savingPhrase, setSavingPhrase] = useState(false);
  const [savedPhrase, setSavedPhrase] = useState<{ id: string; text: string } | null>(null);

  // Admin-only gate: bounce non-admins who reach the Speak Loop by URL while
  // the flow is unfinished. Mirrors the hidden nav tab (islandAccess.ts).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!canSeeIsland(data.user?.id)) router.replace("/app");
    });
  }, [router]);

  // ── load the learner's active island + beats (RLS-scoped) ──
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
        const { data: beatRows } = await supabase
          .from("island_beats")
          .select("id, text, position")
          .eq("island_id", isl.id)
          .order("position");
        if (!cancelled && beatRows) {
          setBeats((beatRows as IslandBeat[]).map((b) => ({ id: b.id, text: b.text })).filter((b) => b.text.trim()));
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const beatTexts = useMemo(() => beats.map((b) => b.text), [beats]);
  const firstBeat = beatTexts[0] ?? "";

  // The phrase actually in play this loop (null once a retrieval hint is rejected).
  const activePhrase = useMemo<{ id: string | null; text: string } | null>(() => {
    if (!diagnosis) return null;
    if (diagnosis.gap === "retrieval" && !rejected && diagnosis.phraseText) {
      return { id: diagnosis.phraseItemId, text: diagnosis.phraseText };
    }
    if (diagnosis.gap === "new_language" && newPhraseSaved && savedPhrase) {
      return { id: savedPhrase.id, text: savedPhrase.text };
    }
    return null;
  }, [diagnosis, rejected, newPhraseSaved, savedPhrase]);

  const phraseSource: "bank" | "new" | null =
    diagnosis?.gap === "retrieval" && activePhrase ? "bank" : diagnosis?.gap === "new_language" && activePhrase ? "new" : null;
  const used = usedInAttempt(a2, activePhrase?.text ?? null);

  // ── persistence helpers (best-effort; never trap the learner) ──
  const logAttempt = useCallback(
    async (attemptNo: 1 | 2, transcript: string) => {
      if (!island) return;
      try {
        await supabase.from("island_attempts").insert({ island_id: island.id, attempt_no: attemptNo, transcript });
      } catch {
        /* non-fatal */
      }
    },
    [island],
  );

  const logPhraseEvent = useCallback(
    async (event: "retrieved" | "rejected" | "saved" | "used", phraseItemId: string | null) => {
      if (!island) return;
      try {
        await supabase.from("island_phrase_events").insert({ island_id: island.id, phrase_item_id: phraseItemId, event });
      } catch {
        /* non-fatal */
      }
    },
    [island],
  );

  // ── step handlers ───────────────────────────────────────
  const getGap = useCallback(async () => {
    if (!island || !a1.trim() || diagnosing) return;
    setDiagnosing(true);
    setError(null);
    void logAttempt(1, a1);
    try {
      const res = await fetch("/api/island/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ islandId: island.id, attempt: a1 }),
      });
      const data = (await res.json().catch(() => ({}))) as { diagnosis?: Diagnosis; error?: string };
      if (!res.ok || !data.diagnosis) {
        setError(data.error || "Couldn't read your attempt.");
        return;
      }
      setDiagnosis(data.diagnosis);
      setRejected(false);
      setStep("gap");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setDiagnosing(false);
    }
  }, [island, a1, diagnosing, logAttempt]);

  const useRetrieval = useCallback(() => {
    void logPhraseEvent("retrieved", diagnosis?.phraseItemId ?? null);
    setStep("repair");
  }, [logPhraseEvent, diagnosis]);

  const rejectRetrieval = useCallback(() => {
    void logPhraseEvent("rejected", diagnosis?.phraseItemId ?? null);
    setRejected(true);
  }, [logPhraseEvent, diagnosis]);

  const saveNewPhrase = useCallback(async () => {
    if (!diagnosis?.suggestion || savingPhrase || newPhraseSaved) return;
    setSavingPhrase(true);
    try {
      const res = await fetch("/api/phrases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manual: true, text: diagnosis.suggestion, usage_note: "Saved from a speak-loop attempt." }),
      });
      const data = (await res.json().catch(() => ({}))) as { item?: { id: string; text: string }; error?: string };
      if (res.ok && data.item) {
        setSavedPhrase({ id: data.item.id, text: data.item.text || diagnosis.suggestion });
        setNewPhraseSaved(true);
        void logPhraseEvent("saved", data.item.id);
      } else {
        setError(data.error || "Couldn't save that phrase.");
      }
    } catch {
      setError("Network error saving the phrase.");
    } finally {
      setSavingPhrase(false);
    }
  }, [diagnosis, savingPhrase, newPhraseSaved, logPhraseEvent]);

  const attempt2Done = useCallback(() => {
    if (!a2.trim()) return;
    void logAttempt(2, a2);
    setStep("evidence");
  }, [a2, logAttempt]);

  const finishEvidence = useCallback(async () => {
    if (!island || !evidence || !diagnosis) return;
    const sched = repairSchedule(evidence);
    const beatId = diagnosis.beatIndex !== null ? (beats[diagnosis.beatIndex]?.id ?? null) : null;
    try {
      await supabase.from("island_repairs").insert({
        island_id: island.id,
        beat_id: beatId,
        phrase_item_id: activePhrase?.id ?? null,
        diagnosis: diagnosis.gap,
        drill: SPEAK_GAP_META[diagnosis.gap].drillTitle,
        interval_days: sched.interval_days,
        due_at: sched.due_at,
        completed: true,
      });
    } catch {
      /* non-fatal — don't trap the learner at the evidence step */
    }
    if (used && activePhrase?.id) void logPhraseEvent("used", activePhrase.id);
    setStep("recap");
  }, [island, evidence, diagnosis, beats, activePhrase, used, logPhraseEvent]);

  // ── sidebar shell (mirrors /app/island) ─────────────────
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

  const hasMessage = !loading && !!island && beats.length > 0;
  const beatSeed = diagnosis?.beatIndex != null ? (beats[diagnosis.beatIndex]?.text ?? firstBeat) : firstBeat;
  const evLabel = SPEAK_EVIDENCE.find((e) => e.id === evidence);

  return (
    <div className="home-app island-app speak-app">
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
          <div className="li-wrap" style={{ maxWidth: 680 }}>
            <div className="sl-topbar">
              <Link className="sl-back" href="/app/island">
                <BackIcon /> Explain what I do
              </Link>
              {hasMessage && <SLDots step={step} />}
            </div>

            <div className="li-head" style={{ paddingTop: 28 }}>
              <div className="li-eyebrow">
                Language Island <span className="crumb">/ Explain what I do / practice</span>
              </div>
              <h1 className="li-title" style={{ fontSize: 30 }}>
                Speak it once, out loud.
              </h1>
              <p className="li-lede">One attempt, one gap, one repair — then say it again. About four minutes.</p>
            </div>

            {loading ? (
              <p className="li-loading">Loading your island…</p>
            ) : !hasMessage ? (
              <div className="sl-card sl-empty">
                <h2 className="sl-h">Build your message first</h2>
                <p className="sl-sub">
                  The speak loop practices the beats you saved on your island. Head back, shape your rough answer into a
                  message, and save it — then come here to say it out loud.
                </p>
                <div className="sl-foot">
                  <span className="spacer" />
                  <Link className="btn primary" href="/app/island">
                    Go to my island
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {error && <p className="li-error">{error}</p>}

                {step === "attempt1" && (
                  <SLAttempt no={1} value={a1} onChange={setA1} onNext={getGap} beats={beatTexts} beatsMode="visible" showBeats busy={diagnosing} />
                )}

                {step === "gap" && diagnosis && (
                  <SLGapCard
                    diagnosis={diagnosis}
                    diagnosing={diagnosing}
                    rejected={rejected}
                    onUse={useRetrieval}
                    onReject={rejectRetrieval}
                    onContinue={() => setStep("repair")}
                  />
                )}

                {step === "repair" && diagnosis && (
                  <SLRepair
                    diagnosis={diagnosis}
                    rejected={rejected}
                    firstBeat={firstBeat}
                    beatSeed={beatSeed}
                    phraseSaved={newPhraseSaved}
                    savingPhrase={savingPhrase}
                    onSavePhrase={saveNewPhrase}
                    onDone={() => setStep("attempt2")}
                  />
                )}

                {step === "attempt2" && (
                  <SLAttempt
                    no={2}
                    value={a2}
                    onChange={setA2}
                    onNext={attempt2Done}
                    beats={beatTexts}
                    beatsMode="visible"
                    showBeats
                    phrase={activePhrase?.text ?? null}
                  />
                )}

                {step === "evidence" && (
                  <SLEvidence attempt2={a2} phrase={activePhrase?.text ?? null} choice={evidence} onChoice={setEvidence} onNext={finishEvidence} />
                )}

                {step === "recap" && diagnosis && (
                  <SLRecap
                    diagnosis={diagnosis}
                    firstBeat={firstBeat}
                    phrase={activePhrase?.text ?? null}
                    phraseSource={phraseSource}
                    used={used}
                    choice={evidence}
                    backSlot={
                      <Link className="btn primary" href="/app/island">
                        Back to my island
                      </Link>
                    }
                    footNote={
                      <>
                        <ReplayIcon width={11} height={11} /> One repair scheduled{evLabel ? ` · ${evLabel.sched}` : ""}. Nothing else carries over.
                      </>
                    }
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
