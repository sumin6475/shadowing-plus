"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import "./phrase-saver.css";

// In-player phrase lookup. The learner drags to select a short chunk *inside
// one subtitle*; a popover opens at the selection, looks the phrase up with
// the same context-aware explainer as Phrase Bank, then offers Save or Cancel.
// Lookup never writes a row — cancel (or clicking away) leaves the bank alone.
//
// This overlay is rendered as a body-level sibling of `.clip-page`, i.e. OUTSIDE
// the scope where the app's cobalt design tokens (--accent-text, --surface, …)
// are defined. So its styles are deliberately self-contained (explicit colors +
// a [data-theme="dark"] override) rather than token-based — token vars would
// resolve to nothing here and render the popover invisible.

const MAX_SELECTION = 120;
const POP_W = 320;

type SavedItem = {
  id: string;
  text: string;
  kind: string;
  meaning_ko: string | null;
  usage_note: string | null;
  status: "pending" | "ready" | "failed";
};

type PhrasePreview = {
  text: string;
  kind: string;
  meaning_ko: string;
  usage_note: string;
};

type Anchor = { segmentId: string; text: string; cx: number; top: number; bottom: number };
type Phase =
  | { k: "explaining" }
  | { k: "preview"; preview: PhrasePreview }
  | { k: "saving"; preview: PhrasePreview }
  | { k: "ready"; item: SavedItem; alreadySaved: boolean }
  | { k: "error"; message: string };

/** Resolve the single `[data-seg-id]` element a selection lives inside plus its
 *  screen rect, or null if empty / spanning more than one subtitle / too long. */
function selectionInfo(sel: Selection | null): { segmentId: string; text: string; rect: DOMRect } | null {
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().replace(/\s+/g, " ").trim();
  if (!text || text.length > MAX_SELECTION) return null;

  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const base = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement);
  const seg = base?.closest?.("[data-seg-id]") as HTMLElement | null;
  if (!seg) return null;
  if (!seg.contains(range.startContainer) || !seg.contains(range.endContainer)) return null;
  const segmentId = seg.getAttribute("data-seg-id");
  if (!segmentId) return null;
  return { segmentId, text, rect: range.getBoundingClientRect() };
}

export default function PhraseSaver() {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: "explaining" });

  // Open (or move) the popover when a pointer selection settles, then look it up.
  useEffect(() => {
    function onEnd(e: Event) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(".phrase-pop")) return; // ignore clicks on our own UI
      setTimeout(() => {
        const found = selectionInfo(window.getSelection());
        if (!found) {
          setAnchor(null);
          return;
        }
        const { rect } = found;
        setAnchor({
          segmentId: found.segmentId,
          text: found.text,
          cx: Math.min(Math.max(rect.left + rect.width / 2, POP_W / 2 + 10), window.innerWidth - POP_W / 2 - 10),
          top: rect.top,
          bottom: rect.bottom,
        });
        setPhase({ k: "explaining" });
      }, 0);
    }
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAnchor(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!anchor || phase.k !== "explaining") return;
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/phrases/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ segmentId: anchor.segmentId, text: anchor.text }),
          signal: ac.signal,
        });
        const data = (await res.json().catch(() => ({}))) as {
          alreadySaved?: boolean;
          item?: SavedItem;
          preview?: PhrasePreview;
          error?: string;
        };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setPhase({ k: "error", message: data.error || "Couldn't look this up." });
          return;
        }
        if (data.alreadySaved && data.item) {
          setPhase({ k: "ready", item: data.item, alreadySaved: true });
          return;
        }
        if (!data.preview) {
          setPhase({ k: "error", message: "Couldn't look this up." });
          return;
        }
        setPhase({ k: "preview", preview: data.preview });
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPhase({ k: "error", message: "Network error. Try again." });
      }
    })();
    return () => ac.abort();
  }, [anchor, phase.k]);

  const save = useCallback(async (a: Anchor, preview: PhrasePreview) => {
    setPhase({ k: "saving", preview });
    window.getSelection()?.removeAllRanges();
    try {
      const res = await fetch("/api/phrases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          segmentId: a.segmentId,
          text: a.text,
          kind: preview.kind,
          meaning_ko: preview.meaning_ko,
          usage_note: preview.usage_note,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { item?: SavedItem; alreadySaved?: boolean; error?: string };
      if (!res.ok || !data.item) {
        setPhase({ k: "error", message: data.error || "Couldn't save this phrase." });
        return;
      }
      setPhase({ k: "ready", item: data.item, alreadySaved: !!data.alreadySaved });
    } catch {
      setPhase({ k: "error", message: "Network error. Try again." });
    }
  }, []);

  if (!anchor) return null;

  // Prefer opening above the selection: the browser's own selection toolbar and
  // some third-party extensions sit just below it. Flip below only when there's
  // more room there.
  const placeBelow = window.innerHeight - anchor.bottom > anchor.top;
  const style = placeBelow
    ? { left: anchor.cx, top: anchor.bottom + 8, transform: "translateX(-50%)" }
    : { left: anchor.cx, top: anchor.top - 8, transform: "translate(-50%, -100%)" };

  const dismiss = () => {
    window.getSelection()?.removeAllRanges();
    setAnchor(null);
  };

  return (
    <div className="phrase-pop" style={style} role="dialog" aria-label="Look up phrase" aria-live="polite">
      {phase.k === "explaining" && (
        <div className="phrase-pop-body">
          <div className="phrase-pop-head">
            <strong className="phrase-pop-term">{anchor.text}</strong>
            <button type="button" className="phrase-pop-x" onMouseDown={(e) => e.preventDefault()} onClick={dismiss} aria-label="Cancel">×</button>
          </div>
          <p className="phrase-pop-status">Looking this up…</p>
        </div>
      )}

      {(phase.k === "preview" || phase.k === "saving") && (
        <div className="phrase-pop-body">
          <div className="phrase-pop-head">
            <strong className="phrase-pop-term">{phase.preview.text}</strong>
            <span className="phrase-pop-kind">{phase.preview.kind.replace(/_/g, " ")}</span>
            <button type="button" className="phrase-pop-x" onMouseDown={(e) => e.preventDefault()} onClick={dismiss} aria-label="Cancel">×</button>
          </div>
          {phase.preview.meaning_ko && <p className="phrase-pop-meaning">{phase.preview.meaning_ko}</p>}
          {phase.preview.usage_note && <p className="phrase-pop-note">{phase.preview.usage_note}</p>}
          <div className="phrase-pop-actions">
            <button
              type="button"
              className="phrase-pop-cancel"
              onMouseDown={(e) => e.preventDefault()}
              onClick={dismiss}
              disabled={phase.k === "saving"}
            >
              Cancel
            </button>
            <button
              type="button"
              className="phrase-pop-save"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => save(anchor, phase.preview)}
              disabled={phase.k === "saving"}
            >
              {phase.k === "saving" ? "Saving…" : "Save to Phrase Bank"}
            </button>
          </div>
        </div>
      )}

      {phase.k === "error" && (
        <div className="phrase-pop-body">
          <div className="phrase-pop-head">
            <strong className="phrase-pop-term">Couldn’t look this up</strong>
            <button type="button" className="phrase-pop-x" onMouseDown={(e) => e.preventDefault()} onClick={dismiss} aria-label="Close">×</button>
          </div>
          <p className="phrase-pop-status is-error">{phase.message}</p>
        </div>
      )}

      {phase.k === "ready" && (
        <div className="phrase-pop-body">
          <div className="phrase-pop-head">
            <strong className="phrase-pop-term">{phase.item.text}</strong>
            <span className="phrase-pop-kind">{phase.item.kind.replace(/_/g, " ")}</span>
            <button type="button" className="phrase-pop-x" onMouseDown={(e) => e.preventDefault()} onClick={dismiss} aria-label="Close">×</button>
          </div>
          {phase.alreadySaved && <p className="phrase-pop-flag">Already in your Phrase Bank.</p>}
          {phase.item.status === "ready" ? (
            <>
              {phase.item.meaning_ko && <p className="phrase-pop-meaning">{phase.item.meaning_ko}</p>}
              {phase.item.usage_note && <p className="phrase-pop-note">{phase.item.usage_note}</p>}
            </>
          ) : (
            <p className="phrase-pop-status">
              {phase.item.status === "failed" ? "Saved — the explanation couldn’t be generated." : "Saved — explaining this phrase…"}
            </p>
          )}
          <div className="phrase-pop-foot">
            <span className="phrase-pop-saved">{phase.alreadySaved ? "In your bank" : "Saved ✓"}</span>
            <Link href="/phrases" className="phrase-pop-link">Open Phrase Bank →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
