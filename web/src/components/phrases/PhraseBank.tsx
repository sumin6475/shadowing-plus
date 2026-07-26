"use client";

import Link from "next/link";
import type {
  PhraseDisplayStatus,
  PhraseLearningStatus,
  PhraseQuickCheck,
} from "@/lib/phrase-srs";
import {
  PlayIcon,
  NoteIcon,
  DrillIcon,
  ReplayIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  PlusIcon,
  SearchIcon,
  BookmarkIcon,
} from "./Icons";

// Phrase Bank page pieces — ported from the design's phrase-bank.jsx, wired to
// real phrase_items data. The learning-status system (New → Recognizing →
// Practicing → Ready, plus a derived "Needs refresh") is the design's spine;
// every status shown here is set by a learner quick-check, never by a display.

export interface PhraseRow {
  id: string;
  text: string;
  kind: string;
  meaning_ko: string | null;
  usage_note: string | null;
  start_time: number | null;
  video_id: string | null;
  status: "pending" | "ready" | "failed";
  // Fields from migration 018 — optional so the page renders before it's applied.
  learning_status?: PhraseLearningStatus;
  ease_factor?: number | null;
  interval_days?: number | null;
  lapses?: number | null;
  due_at?: string | null;
  last_practiced_at?: string | null;
  island?: string | null;
  tags?: string[] | null;
  source_context?: {
    source?: string;
    sentence?: string;
    translation?: string | null;
  } | null;
  created_at: string;
  video: { title: string; video_url: string | null } | null;
}

type StatusMeta = { cls: string; label: string; dot: string; blurb: string };

export const PB_STATUS: Record<PhraseDisplayStatus, StatusMeta> = {
  new: { cls: "st-new", label: "New", dot: "oklch(0.72 0.008 70)", blurb: "Just saved. You haven’t made it yours yet." },
  recognizing: { cls: "st-recognizing", label: "Recognizing", dot: "oklch(0.58 0.165 258)", blurb: "You understand it when you see it, but it’s still unfamiliar on the spot." },
  practicing: { cls: "st-practicing", label: "Practicing", dot: "oklch(0.68 0.13 80)", blurb: "You can use it in short practice. This is the stage where it settles in." },
  ready: { cls: "st-ready", label: "Ready to use", dot: "oklch(0.55 0.10 155)", blurb: "In familiar situations you can reach for it naturally." },
  refresh: { cls: "st-refresh", label: "Needs refresh", dot: "oklch(0.62 0.155 38)", blurb: "Learned earlier, not used recently. A short review brings it back." },
};

// The four columns the readiness meter and filters iterate over. `refresh` is a
// derived overlay, shown as its own filter but never a distinct stored state.
export const PB_ORDER: PhraseDisplayStatus[] = ["new", "recognizing", "practicing", "ready", "refresh"];

export const PB_CHECKS: { id: PhraseQuickCheck; label: string; glyph: string; note: string }[] = [
  { id: "recognized", label: "I only recognized it", glyph: "f1", note: "Knew the meaning, couldn’t use it right away" },
  { id: "withhelp", label: "I used it with help", glyph: "f2", note: "Used it with a hint or example in front of me" },
  { id: "onmyown", label: "I used it on my own", glyph: "f3", note: "Used it naturally, with no hint" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getDate().toString().padStart(2, "0")}`;
}

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const day = Math.round((Date.now() - t) / 86_400_000);
  if (day <= 0) return "today";
  if (day === 1) return "yesterday";
  if (day < 30) return `${day} days ago`;
  const mo = Math.round(day / 30);
  return mo < 12 ? `${mo}mo ago` : `${Math.round(day / 365)}y ago`;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export function StatusPill({ status }: { status: PhraseDisplayStatus }) {
  const s = PB_STATUS[status];
  return (
    <span className={"pb-status " + s.cls} title={s.blurb}>
      <span className="dot" />
      {s.label}
    </span>
  );
}

export function ReadinessMeter({
  counts,
  total,
}: {
  counts: Record<PhraseDisplayStatus, number>;
  total: number;
}) {
  return (
    <div className="pb-meter">
      <div className="pb-meter-track">
        {PB_ORDER.map((k) =>
          counts[k] ? (
            <div key={k} className="pb-meter-seg" style={{ flex: counts[k], background: PB_STATUS[k].dot }} />
          ) : null,
        )}
      </div>
      <div className="pb-meter-legend">
        {PB_ORDER.map((k) => (
          <span key={k}>
            <i style={{ background: PB_STATUS[k].dot }} />
            {PB_STATUS[k].label}
            <b>{counts[k] || 0}</b>
          </span>
        ))}
        <span style={{ marginLeft: "auto" }}>
          <b>{total}</b>&nbsp;phrases
        </span>
      </div>
    </div>
  );
}

export interface ReviewItem {
  id: string;
  phrase: string;
  status: PhraseDisplayStatus;
  why: string;
}

export function ReviewPanel({
  items,
  onDismiss,
}: {
  items: ReviewItem[];
  onDismiss: () => void;
}) {
  return (
    <section className="pb-review">
      <div className="pb-review-head">
        <div>
          <div className="pb-review-eyebrow">Today’s review</div>
          <h2 className="pb-review-title">
            You have {items.length} phrase{items.length === 1 ? "" : "s"} that could use a quick refresh.
          </h2>
          <p className="pb-review-sub">Six minutes is enough. Not checking meanings — actually using them once.</p>
        </div>
      </div>
      <div className="pb-review-list">
        {items.map((p) => (
          <div className="pb-review-row" key={p.id}>
            <div>
              <div className="en">{p.phrase}</div>
              <div className="why">{p.why}</div>
            </div>
            <StatusPill status={p.status} />
          </div>
        ))}
      </div>
      <div className="pb-review-foot">
        <Link href="/practice" className="btn primary">
          <DrillIcon /> Quick review
        </Link>
        <button type="button" className="btn ghost spacer" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </section>
  );
}

const ECHO: Record<PhraseQuickCheck, string> = {
  recognized: "We’ll come back with a short context drill",
  withhelp: "You’ll meet it again in a re-answer drill",
  onmyown: "We’ll check it with a shadowing challenge",
};

export function PhraseCard({
  p,
  displayStatus,
  open,
  checked,
  onToggle,
  onCheck,
  onEditNote,
  onDelete,
}: {
  p: PhraseRow;
  displayStatus: PhraseDisplayStatus;
  open: boolean;
  checked: { id: PhraseQuickCheck; days: number } | null;
  onToggle: () => void;
  onCheck: (c: PhraseQuickCheck) => void;
  onEditNote: () => void;
  onDelete: () => void;
}) {
  const manual = p.source_context?.source === "manual" || (!p.video_id && !p.video);
  const context = p.source_context?.sentence ?? null;
  const sourceLabel = manual ? "Added manually" : p.video?.title ?? "Saved from your media";
  const sourceHref =
    !manual && p.video_id
      ? `/player/${p.video_id}${p.start_time != null ? `?t=${Math.floor(p.start_time)}` : ""}`
      : null;
  const at = !manual && p.start_time != null ? formatTime(p.start_time) : null;
  const practiced = formatRelative(p.last_practiced_at);
  const tags = p.tags ?? [];

  return (
    <article className={"pb-card" + (open ? " open" : "")}>
      <div className="pb-card-main" onClick={onToggle}>
        <div style={{ minWidth: 0 }}>
          <h3 className="pb-phrase">{p.text}</h3>
          {p.status === "ready" ? (
            p.meaning_ko && <p className="pb-gloss">{p.meaning_ko}</p>
          ) : (
            <p className="pb-gloss pb-muted">
              {p.status === "failed" ? "Explanation unavailable." : "Explaining this phrase…"}
            </p>
          )}
          {context && (
            <div className="pb-context">
              <em>“{context}”</em>
            </div>
          )}
          <div className="pb-source">
            <PlayIcon />
            {sourceHref ? <Link href={sourceHref} onClick={(e) => e.stopPropagation()}>{sourceLabel}</Link> : <span>{sourceLabel}</span>}
            {at && <span>· {at}</span>}
          </div>
          {p.usage_note && (
            <div className="pb-note">
              <NoteIcon />
              {p.usage_note}
            </div>
          )}
          {(p.island || tags.length > 0) && (
            <div className="pb-tags">
              {p.island && <span className="pb-tag island">{p.island}</span>}
              {tags.map((t) => (
                <span key={t} className="pb-tag">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="pb-side">
          <StatusPill status={displayStatus} />
          <div className="pb-dates">
            <div>Saved {formatShortDate(p.created_at)}</div>
            <div>{practiced ? "Practiced " + practiced : "Not practiced yet"}</div>
          </div>
        </div>
      </div>

      {open && (
        <>
          <div className="pb-card-foot">
            <span className="label">Quick check</span>
            {PB_CHECKS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={"pb-check" + (checked?.id === c.id ? " picked" : "")}
                title={c.note}
                onClick={() => onCheck(c.id)}
              >
                <span className={"glyph " + c.glyph} />
                {c.label}
              </button>
            ))}
            <div className="pb-foot-spacer">
              <button type="button" className="pb-icon-btn" title="Edit note" onClick={onEditNote}>
                <PencilIcon />
              </button>
              <Link href="/practice" className="pb-icon-btn" title="Practice in context">
                <ReplayIcon />
              </Link>
              <button type="button" className="pb-icon-btn" title="Remove from bank" onClick={onDelete}>
                <TrashIcon />
              </button>
            </div>
          </div>
          {checked && (
            <div className="pb-echo">
              <CheckIcon />
              <span>
                {ECHO[checked.id]} — <b>next review in {checked.days} day{checked.days === 1 ? "" : "s"}</b>
              </span>
            </div>
          )}
        </>
      )}
    </article>
  );
}

// In-page nudge (the design's SuggestionCard). Unlike the design mock, this is
// driven by a REAL phrase that's due — the top of the review queue — with an
// honest reason, and its one action routes to practice. The context-aware
// "may fit here / show alternatives / why this fits" version belongs in the
// player/Island (Speaking Memory Search) where there is a "here" to fit.
export function SuggestionCard({
  phrase,
  why,
  onDismiss,
}: {
  phrase: string;
  why: string;
  onDismiss: () => void;
}) {
  return (
    <aside className="pb-suggest">
      <div className="pb-suggest-eyebrow">
        <BookmarkIcon width={13} height={13} /> From your Phrase Bank
      </div>
      <p className="pb-suggest-lead">A phrase worth bringing back into use.</p>
      <div className="pb-suggest-phrase">{phrase}</div>
      <p className="pb-suggest-why">{why}</p>
      <div className="pb-suggest-actions">
        <Link href="/practice" className="btn primary">Practice this</Link>
      </div>
      <button type="button" className="pb-suggest-dismiss" onClick={onDismiss}>
        Don’t suggest this again
      </button>
    </aside>
  );
}

export function PhraseBankEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="pb-empty">
      <div className="pb-empty-glyph">“ ”</div>
      <h2 className="pb-empty-title">Your Phrase Bank is ready for your English.</h2>
      <p className="pb-empty-sub">
        Save a phrase from a clip you’re watching, or write one you want to start using. We’ll help you bring it back when it matters.
      </p>
      <div className="pb-empty-actions">
        <button type="button" className="btn primary" onClick={onAdd}>
          <PlusIcon /> Add a phrase
        </button>
        <Link href="/app" className="btn">Explore your clips</Link>
      </div>
    </div>
  );
}

export function NoResults({ q, onClear, onAdd }: { q: string; onClear: () => void; onAdd: () => void }) {
  return (
    <div className="pb-empty">
      <div className="pb-empty-glyph" style={{ fontSize: 30 }}>
        <SearchIcon width={28} height={28} />
      </div>
      <h2 className="pb-empty-title">No phrase matches “{q}”</h2>
      <p className="pb-empty-sub">Search by a word, a meaning, a situation, or something you remember from the original context.</p>
      <div className="pb-empty-actions">
        <button type="button" className="btn" onClick={onClear}>Clear search</button>
        <button type="button" className="btn primary" onClick={onAdd}>
          <PlusIcon /> Add “{q}” as a phrase
        </button>
      </div>
    </div>
  );
}
