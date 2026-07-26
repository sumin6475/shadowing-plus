"use client";

import { useState } from "react";
import {
  DrillIcon,
  CheckIcon,
  PencilIcon,
  ChevronDownIcon,
  TrashIcon,
  PlusIcon,
  ReplayIcon,
  NoteIcon,
  MicIcon,
  LibraryIcon,
} from "@/components/phrases/Icons";

// Language Island page pieces — ported from the Claude Design mockup
// (language-island.jsx), wired to real state by the page. The message beats
// read like a document (Newsreader, contentEditable) and every beat is honestly
// tagged "AI-structured" until the learner edits it into "Your words".

export type Beat = { id?: string; text: string; evidence: string | null; source: "learner" | "ai_structured" };

export function LIVenn({ onDismiss }: { onDismiss?: () => void }) {
  const legend = (
    <div className="li-venn-legend">
      <p><span className="k" style={{ background: "oklch(0.72 0.008 70)" }} /><b>Passive English</b> — I recognize it when I hear or read it.</p>
      <p><span className="k" style={{ background: "var(--accent)" }} /><b>Active English</b> — I can retrieve it when I have something to say.</p>
      <p><span className="k" style={{ background: "oklch(0.55 0.10 155)" }} /><b>The overlap</b> — English that&rsquo;s ready for my real conversations. That&rsquo;s what this island grows.</p>
    </div>
  );
  return (
    <section className="li-venn">
      <div className="li-venn-eyebrow">Why this island exists</div>
      {onDismiss && (
        <button type="button" className="btn ghost li-venn-dismiss" onClick={onDismiss}>
          <CheckIcon width={13} height={13} /> Got it
        </button>
      )}
      <div className="li-venn-body">
        <svg className="li-venn-svg" viewBox="0 0 200 132" aria-hidden="true">
          <circle cx="72" cy="66" r="52" fill="oklch(0.72 0.008 70 / .16)" stroke="oklch(0.72 0.008 70)" strokeWidth="1.25" />
          <circle cx="128" cy="66" r="52" fill="oklch(from var(--accent) l c h / .10)" stroke="var(--accent)" strokeWidth="1.25" />
          <path d="M100 22.2A52 52 0 0 1 100 109.8A52 52 0 0 1 100 22.2z" fill="oklch(0.55 0.10 155 / .14)" stroke="oklch(0.55 0.10 155)" strokeWidth="1.25" />
          <text x="48" y="70" textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="var(--font-mono)">PASSIVE</text>
          <text x="152" y="70" textAnchor="middle" fontSize="10" fill="var(--accent-text)" fontFamily="var(--font-mono)">ACTIVE</text>
          <text x="100" y="63" textAnchor="middle" fontSize="9.5" fill="oklch(0.46 0.095 155)" fontFamily="var(--font-mono)">READY</text>
        </svg>
        {legend}
      </div>
    </section>
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
        <span className="hint">Your own language mixed in is fine</span>
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
            <><DrillIcon width={14} height={14} /> Shape into beats</>
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
      <span className="li-soon">Coming next</span>
      <button type="button" className="btn primary" disabled style={{ opacity: 0.55, pointerEvents: "none" }}>
        <MicIcon width={14} height={14} /> Practice this message
      </button>
    </section>
  );
}

export function LISketch() {
  return (
    <section className="li-sketch">
      <div className="li-sketch-eyebrow"><span>Coming next — the speak loop</span><span className="li-soon">Phase 3</span></div>
      <div className="li-sketch-steps">
        <div className="li-step"><span className="n">1</span><div>
          <h4>Speak attempt 1</h4>
          <p>Say your message from the beats. Text first; voice later.</p>
        </div></div>
        <div className="li-step"><span className="n">2</span><div>
          <h4>One gap, diagnosed</h4>
          <p>Not a report card — a single card naming one thing: meaning, new language, retrieval, or pressure.</p>
          <div className="li-gap-card"><b>Retrieval gap</b> — you paused before &ldquo;make decisions under pressure.&rdquo; You already saved a phrase for this.
            <div><span className="frombank"><LibraryIcon width={10} height={10} /> From your Phrase Bank · &ldquo;I&rsquo;m especially interested in…&rdquo;</span></div>
          </div>
        </div></div>
        <div className="li-step"><span className="n">3</span><div>
          <h4>One short repair</h4>
          <p>Use the phrase once in your own sentence. That&rsquo;s the whole drill.</p>
        </div></div>
        <div className="li-step"><span className="n">4</span><div>
          <h4>Speak attempt 2, then honest evidence</h4>
          <p>No streaks, no scores — just what actually happened.</p>
          <div className="demo">
            <span className="li-evidence-btn">Not yet</span>
            <span className="li-evidence-btn">I recognized it</span>
            <span className="li-evidence-btn">It came back</span>
            <span className="li-evidence-btn" style={{ color: "var(--accent-text)", borderColor: "var(--accent)", background: "var(--accent-soft)" }}><CheckIcon width={10} height={10} /> Used</span>
          </div>
        </div></div>
      </div>
    </section>
  );
}
