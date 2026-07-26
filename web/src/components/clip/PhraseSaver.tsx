"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import "./phrase-saver.css";

// In-player Phrase Bank capture. The learner drags to select a short chunk
// *inside one subtitle*; a popover opens right at the selection with a clearly
// visible "Save" button, and after saving the same popover shows the
// context-aware Korean explanation in place (no separate bottom sheet).
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

type Anchor = { segmentId: string; text: string; cx: number; top: number; bottom: number };
type Phase =
  | { k: "prompt" }
  | { k: "saving" }
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
  const [phase, setPhase] = useState<Phase>({ k: "prompt" });

  // Open (or move) the popover when a pointer selection settles.
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
        setPhase({ k: "prompt" });
      }, 0);
    }
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);

  // A fixed popover drifts from its text on scroll — drop it while still just a
  // prompt. Once it's showing a saved explanation it stays put like a toast.
  useEffect(() => {
    if (!anchor || phase.k !== "prompt") return;
    const drop = () => setAnchor(null);
    window.addEventListener("scroll", drop, true);
    return () => window.removeEventListener("scroll", drop, true);
  }, [anchor, phase.k]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAnchor(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const save = useCallback(async (a: Anchor) => {
    setPhase({ k: "saving" });
    window.getSelection()?.removeAllRanges();
    try {
      const res = await fetch("/api/phrases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ segmentId: a.segmentId, text: a.text }),
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

  return (
    <div className="phrase-pop" style={style} role="dialog" aria-label="Save phrase" aria-live="polite">
      {phase.k === "prompt" && (
        <div className="phrase-pop-prompt">
          <div className="phrase-pop-sel">“{anchor.text}”</div>
          <button type="button" className="phrase-pop-save" onMouseDown={(e) => e.preventDefault()} onClick={() => save(anchor)}>
            <span className="phrase-pop-plus" aria-hidden>＋</span> Save to Phrase Bank
          </button>
        </div>
      )}

      {phase.k === "saving" && (
        <div className="phrase-pop-body">
          <strong className="phrase-pop-term">{anchor.text}</strong>
          <p className="phrase-pop-status">Explaining this phrase…</p>
        </div>
      )}

      {phase.k === "error" && (
        <div className="phrase-pop-body">
          <div className="phrase-pop-head">
            <strong className="phrase-pop-term">Couldn’t save</strong>
            <button type="button" className="phrase-pop-x" onClick={() => setAnchor(null)} aria-label="Close">×</button>
          </div>
          <p className="phrase-pop-status is-error">{phase.message}</p>
        </div>
      )}

      {phase.k === "ready" && (
        <div className="phrase-pop-body">
          <div className="phrase-pop-head">
            <strong className="phrase-pop-term">{phase.item.text}</strong>
            <span className="phrase-pop-kind">{phase.item.kind.replace(/_/g, " ")}</span>
            <button type="button" className="phrase-pop-x" onClick={() => setAnchor(null)} aria-label="Close">×</button>
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
            <span className="phrase-pop-saved">Saved ✓</span>
            <Link href="/phrases" className="phrase-pop-link">Open Phrase Bank →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
