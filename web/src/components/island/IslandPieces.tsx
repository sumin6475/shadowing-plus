"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CloseIcon,
  HelpIcon,
  PencilIcon,
  ChevronDownIcon,
  TrashIcon,
  PlusIcon,
  ReplayIcon,
  NoteIcon,
  MicIcon,
} from "@/components/phrases/Icons";

// Language Island page pieces — ported from the Claude Design mockup
// (language-island.jsx), wired to real state by the page. The message beats
// read like a document (Newsreader, contentEditable) and every beat is honestly
// tagged "AI-structured" until the learner edits it into "Your words".

export type Beat = { id?: string; text: string; evidence: string | null; source: "learner" | "ai_structured" };

// Corrected model: Active English is the part of Passive English you can
// actually retrieve — a subset drawn INSIDE the passive circle, not an overlap
// of two equal circles. The inner circle is what's "ready" for real
// conversations, and what this island grows. (The old two-overlapping-circles
// version implied active English could live outside what you recognize, which
// is wrong — you can only actively use what you passively hold.)
function LIVennLegend() {
  return (
    <div className="li-venn-legend">
      <p>
        <span className="k" style={{ background: "oklch(0.72 0.008 70)" }} />
        <b>Passive English</b> — everything I recognize when I hear or read it.
      </p>
      <p>
        <span className="k" style={{ background: "var(--accent)" }} />
        <b>Active English</b> — the part inside it I can actually retrieve when I have something to say. That&rsquo;s the English that&rsquo;s <b>ready</b> for real conversations — and what this island grows.
      </p>
    </div>
  );
}

function LIVennDiagram() {
  return (
    <svg className="li-venn-svg" viewBox="0 0 200 132" aria-hidden="true">
      <circle cx="100" cy="66" r="60" fill="oklch(0.72 0.008 70 / .14)" stroke="oklch(0.72 0.008 70)" strokeWidth="1.25" />
      <circle cx="100" cy="78" r="30" fill="oklch(from var(--accent) l c h / .14)" stroke="var(--accent)" strokeWidth="1.25" />
      <text x="100" y="22" textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="var(--font-mono)">PASSIVE</text>
      <text x="100" y="76" textAnchor="middle" fontSize="10" fill="var(--accent-text)" fontFamily="var(--font-mono)">ACTIVE</text>
      <text x="100" y="89" textAnchor="middle" fontSize="9.5" fill="var(--accent-text)" fontFamily="var(--font-mono)" opacity="0.7">= READY</text>
    </svg>
  );
}

export function LIVenn({
  mini,
  modal,
  onClose,
  onNeverShow,
  onDismiss,
}: {
  mini?: boolean;
  modal?: boolean;
  onClose?: () => void;
  onNeverShow?: () => void;
  onDismiss?: () => void;
}) {
  // Compact legend strip shown above a saved message (the "always" legend).
  if (mini) {
    return (
      <div className="li-venn legend-mini">
        <div className="li-venn-body"><LIVennLegend /></div>
      </div>
    );
  }

  // Onboarding / on-demand explainer popover.
  if (modal) {
    return (
      <div className="li-modal-overlay" onClick={onClose}>
        <div className="li-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Why this island exists">
          <div className="li-modal-head">
            <div className="li-venn-eyebrow">Why this island exists</div>
            <button type="button" className="li-modal-x" onClick={onClose} aria-label="Close"><CloseIcon width={13} height={13} /></button>
          </div>
          <div className="li-venn-body modal"><LIVennDiagram /><LIVennLegend /></div>
          <div className="li-modal-foot">
            {onNeverShow && <button type="button" className="btn ghost" onClick={onNeverShow}>Don&rsquo;t show this again</button>}
            <span className="spacer" />
            <button type="button" className="btn primary" onClick={onClose}><CheckIcon width={13} height={13} /> Got it</button>
          </div>
        </div>
      </div>
    );
  }

  // Default inline card (first-run, before there are beats).
  return (
    <section className="li-venn">
      <div className="li-venn-eyebrow">Why this island exists</div>
      {onDismiss && (
        <button type="button" className="btn ghost li-venn-dismiss" onClick={onDismiss}>
          <CheckIcon width={13} height={13} /> Got it
        </button>
      )}
      <div className="li-venn-body"><LIVennDiagram /><LIVennLegend /></div>
    </section>
  );
}

export function LIHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="li-help" onClick={onClick} title="Why this island exists">
      <HelpIcon width={14} height={14} /> Why this island
    </button>
  );
}

export function LICapture({
  value,
  onChange,
  onShape,
  shaping,
}: {
  value: string;
  onChange: (v: string) => void;
  onShape: () => void;
  shaping: boolean;
}) {
  return (
    <section className="li-capture">
      <div className="li-label">
        <span>Your rough explanation</span>
        <span className="hint">Your first language mixed in is fine</span>
      </div>
      <textarea
        className="li-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Don’t polish it — just get the real thing down. What do you do? Why does it matter to you? Messy is exactly right."
      />
      <div className="li-capture-foot">
        <span className="note">Nothing is shared. This stays on your island.</span>
        <span className="spacer" />
        <button type="button" className={"btn primary" + (shaping ? " shaping" : "")} onClick={onShape} disabled={shaping || !value.trim()}>
          {shaping ? (
            <><span className="spin" /> Shaping…</>
          ) : (
            <><ReplayIcon width={14} height={14} /> Shape into beats</>
          )}
        </button>
      </div>
    </section>
  );
}

function LIBeat({
  beat,
  idx,
  total,
  onEdit,
  onMove,
  onRemove,
}: {
  beat: Beat;
  idx: number;
  total: number;
  onEdit: (i: number, text: string) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
}) {
  const yours = beat.source === "learner";
  return (
    <div className="li-beat">
      <span className="li-beat-num">{idx + 1}</span>
      <div>
        <p
          className="li-beat-text"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onEdit(idx, e.currentTarget.textContent ?? "")}
        >
          {beat.text}
        </p>
        {beat.evidence && <p className="li-beat-evidence">{beat.evidence}</p>}
        <div className="li-beat-meta">
          {yours ? (
            <span className="li-badge yours"><CheckIcon width={10} height={10} /> Your words</span>
          ) : (
            <span className="li-badge"><PencilIcon width={10} height={10} /> AI-structured — edit to make it yours</span>
          )}
        </div>
      </div>
      <div className="li-beat-tools">
        <button type="button" className="li-tool" title="Move up" disabled={idx === 0} onClick={() => onMove(idx, -1)}>
          <span style={{ display: "grid", placeItems: "center", transform: "rotate(180deg)" }}><ChevronDownIcon /></span>
        </button>
        <button type="button" className="li-tool" title="Move down" disabled={idx === total - 1} onClick={() => onMove(idx, 1)}>
          <ChevronDownIcon />
        </button>
        <button type="button" className="li-tool" title="Remove" onClick={() => onRemove(idx)}>
          <TrashIcon width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

export function LIBeats({
  beats,
  onEdit,
  onMove,
  onRemove,
  onAdd,
  onSave,
  onReshape,
  saving,
  saved,
}: {
  beats: Beat[];
  onEdit: (i: number, text: string) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  onSave: () => void;
  onReshape: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [warn, setWarn] = useState(false);
  return (
    <section className="li-beats">
      <div className="li-beats-head">
        <div>
          <h2 className="li-beats-title">Your message</h2>
          <p className="li-beats-intro">
            AI organized your words into beats. Edit them until they&rsquo;re yours — <b>AI structures; you own the facts.</b>
          </p>
        </div>
      </div>
      <div className="li-beat-list">
        {beats.map((b, i) => (
          <LIBeat key={b.id ?? i} beat={b} idx={i} total={beats.length} onEdit={onEdit} onMove={onMove} onRemove={onRemove} />
        ))}
      </div>
      <div className="li-beats-foot">
        <button type="button" className="btn ghost" onClick={onAdd}><PlusIcon width={14} height={14} /> Add a beat</button>
        <button type="button" className="btn ghost" onClick={() => setWarn(true)}><ReplayIcon width={14} height={14} /> Re-shape into beats</button>
        <div className="spacer">
          {saved && <span className="li-saved"><CheckIcon width={14} height={14} /> Saved</span>}
          <button type="button" className="btn primary" onClick={onSave} disabled={saving}>
            <CheckIcon width={14} height={14} /> {saving ? "Saving…" : "Save my message"}
          </button>
        </div>
      </div>
      {warn && (
        <div className="li-reshape-warn">
          <span>Re-shaping replaces these beats with a new structure from your rough answer. Edits you made will be lost.</span>
          <span className="acts">
            <button type="button" className="btn ghost" onClick={() => setWarn(false)}>Keep my beats</button>
            <button type="button" className="btn primary" onClick={() => { setWarn(false); onReshape(); }}>Re-shape</button>
          </span>
        </div>
      )}
    </section>
  );
}

export function LIRough({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"li-rough" + (open ? " open" : "")}>
      <div className="li-rough-head" onClick={() => setOpen((o) => !o)}>
        <NoteIcon width={13} height={13} /> Your rough answer <span className="chev"><ChevronDownIcon /></span>
      </div>
      {open && <div className="li-rough-body">{text}</div>}
    </div>
  );
}

export function LIPracticeCTA() {
  return (
    <section className="li-practice-cta">
      <span className="ic"><MicIcon width={18} height={18} /></span>
      <div>
        <h3>Speak it once, out loud.</h3>
        <p>One attempt, one gap, one repair — then say it again. About four minutes.</p>
      </div>
      <Link className="btn primary" href="/app/island/speak">
        <MicIcon width={14} height={14} /> Practice this message
      </Link>
    </section>
  );
}
