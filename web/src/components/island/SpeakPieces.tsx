"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  NoteIcon,
  CheckIcon,
  MicIcon,
  LibraryIcon,
  DrillIcon,
  ReplayIcon,
  PlayIcon,
  PlusIcon,
  EyeOffIcon,
} from "@/components/phrases/Icons";
import {
  SPEAK_GAP_META,
  SPEAK_GAPS,
  SPEAK_EVIDENCE,
  usedInAttempt,
  type EvidenceChoice,
  type Diagnosis,
} from "@/lib/island-speak";

// Speak Loop screens — ported from the Claude Design mockup (speak-loop.jsx)
// onto the .home-app shell, wired to the learner's REAL beats + gap diagnosis by
// the page. Focused (full-screen) layout only; voice stays LOCKED (text-first)
// until ASR + retention/consent land — the design's beta default.

export const SPEAK_STEPS = [
  { id: "attempt1", label: "Attempt 1", short: "Attempt 1 of 2" },
  { id: "gap", label: "One gap", short: "One gap" },
  { id: "repair", label: "One repair", short: "One repair" },
  { id: "attempt2", label: "Attempt 2", short: "Attempt 2 of 2" },
  { id: "evidence", label: "Evidence", short: "Honest evidence" },
  { id: "recap", label: "Recap", short: "Recap" },
] as const;
export type SpeakStep = (typeof SPEAK_STEPS)[number]["id"];

export function SLDots({ step, onJump }: { step: SpeakStep; onJump?: (s: SpeakStep) => void }) {
  const i = SPEAK_STEPS.findIndex((s) => s.id === step);
  return (
    <div className="sl-dots">
      <span className="lbl">
        Step {i + 1} of {SPEAK_STEPS.length} · {SPEAK_STEPS[i].short}
      </span>
      <span className="row">
        {SPEAK_STEPS.map((s, j) => (
          <span
            key={s.id}
            className={"sl-dot" + (j < i ? " done" : j === i ? " cur" : "")}
            title={s.label}
            onClick={onJump && j <= i ? () => onJump(s.id) : undefined}
            style={onJump && j <= i ? { cursor: "pointer" } : undefined}
          />
        ))}
      </span>
    </div>
  );
}

function SLBeatsPanel({ beats, mode }: { beats: string[]; mode: "visible" | "peek" }) {
  const [open, setOpen] = useState(false);
  if (mode === "peek" && !open) {
    return (
      <div className="sl-peek">
        <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
          <EyeOffIcon width={14} height={14} /> Peek at your beats
        </button>
        <span className="hint">Try it from memory first — noticing you needed to peek is part of the evidence.</span>
      </div>
    );
  }
  return (
    <div className="sl-beats">
      <div className="head">
        <NoteIcon width={13} height={13} /> Your message · {beats.length} {beats.length === 1 ? "beat" : "beats"}
        {mode === "peek" && (
          <button type="button" className="btn ghost" style={{ marginLeft: "auto" }} onClick={() => setOpen(false)}>
            Hide
          </button>
        )}
      </div>
      <ol>
        {beats.map((b, i) => (
          <li key={i}>
            <span className="n">{i + 1}</span>
            <p>{b}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SLVoiceLocked() {
  return (
    <div className="sl-voice">
      <span className="sl-voice-chip">
        <MicIcon width={11} height={11} /> Voice is coming — typing is the beta path
      </span>
    </div>
  );
}

export function SLAttempt({
  no,
  value,
  onChange,
  onNext,
  beats,
  beatsMode,
  showBeats,
  phrase,
  busy,
}: {
  no: 1 | 2;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  beats: string[];
  beatsMode: "visible" | "peek";
  showBeats: boolean;
  phrase?: string | null;
  busy?: boolean;
}) {
  const disabled = !value.trim() || !!busy;
  return (
    <>
      {showBeats && <SLBeatsPanel beats={beats} mode={beatsMode} />}
      <div className="sl-card">
        <div className="sl-eyebrow">{no === 1 ? "Attempt 1 of 2" : "Attempt 2 of 2"}</div>
        <h2 className="sl-h">{no === 1 ? "Say your whole message." : "Now say it again."}</h2>
        <p className="sl-sub">
          {no === 1
            ? "Out loud if you can, then type what actually came out — ums, stalls and all. Honest input is what makes the gap real."
            : "Same message, fresh attempt. Don’t recite the fix — just say the whole thing and let it land where it lands."}
        </p>
        {no === 2 && phrase && (
          <div className="sl-bank" style={{ marginTop: 16, padding: "11px 15px" }}>
            <span className="eyebrow">
              <LibraryIcon width={10} height={10} /> Your phrase
            </span>
            <p className="sl-bank-phrase" style={{ fontSize: 16, marginTop: 6 }}>
              “{phrase}”
            </p>
          </div>
        )}
        <textarea
          className="li-textarea"
          style={{ marginTop: 16, minHeight: 140, boxShadow: "none" }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your attempt exactly as it came out…"
        />
        <SLVoiceLocked />
        <div className="sl-foot">
          <span className="note">Nothing is scored. This stays on your island.</span>
          <span className="spacer" />
          <button
            type="button"
            className="btn primary"
            disabled={disabled}
            style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            onClick={onNext}
          >
            {no === 1 ? (
              busy ? (
                "Reading your attempt…"
              ) : (
                <>
                  <DrillIcon width={14} height={14} /> Get one gap
                </>
              )
            ) : (
              <>
                <CheckIcon width={14} height={14} /> Done — how did it go?
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export function SLGapCard({
  diagnosis,
  diagnosing,
  rejected,
  onUse,
  onReject,
  onContinue,
}: {
  diagnosis: Diagnosis;
  diagnosing: boolean;
  rejected: boolean;
  onUse: () => void;
  onReject: () => void;
  onContinue: () => void;
}) {
  const gap = diagnosis.gap;
  const meta = SPEAK_GAP_META[gap];
  const hasPhrase = gap === "retrieval" && !!diagnosis.phraseText;
  return (
    <div className="sl-card">
      <div className="sl-eyebrow">One gap</div>
      <div className="sl-gap-types">
        {SPEAK_GAPS.map((k) => (
          <span key={k} className={"sl-gap-type" + (k === gap ? " on" : "")}>
            {k.replace("_", " ")}
          </span>
        ))}
      </div>
      <h2 className="sl-h">{meta.name}</h2>
      <p className="sl-sub">{meta.def} One gap per attempt — everything else can wait.</p>
      {diagnosis.quote && (
        <blockquote className="sl-quote">
          You stalled around <q>“{diagnosis.quote}”</q>
          {hasPhrase ? " — you already saved a phrase for exactly this." : "."}
        </blockquote>
      )}
      {hasPhrase ? (
        <div className="sl-bank">
          <span className="eyebrow">
            <LibraryIcon width={10} height={10} /> From your Phrase Bank
          </span>
          <p className="sl-bank-phrase">“{diagnosis.phraseText}”</p>
          {!rejected ? (
            <div className="sl-bank-acts">
              <button type="button" className="btn primary" onClick={onUse}>
                <CheckIcon width={14} height={14} /> Use this phrase
              </button>
              <button type="button" className="btn ghost" onClick={onReject}>
                Not the phrase I meant
              </button>
            </div>
          ) : (
            <>
              <p className="sl-rejected">
                Noted — rejecting a suggestion is real evidence too; the bank learns from it. You’ll repair that spot in your own words instead.
              </p>
              <div className="sl-bank-acts">
                <button type="button" className="btn primary" onClick={onContinue}>
                  Continue to the repair
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="sl-foot">
          <span className="note">{diagnosing ? "" : " "}</span>
          <span className="spacer" />
          <button type="button" className="btn primary" onClick={onContinue}>
            <DrillIcon width={14} height={14} /> Start the one repair
          </button>
        </div>
      )}
    </div>
  );
}

export function SLRepair({
  diagnosis,
  rejected,
  firstBeat,
  beatSeed,
  phraseSaved,
  savingPhrase,
  onSavePhrase,
  onDone,
}: {
  diagnosis: Diagnosis;
  rejected: boolean;
  firstBeat: string;
  beatSeed: string;
  phraseSaved: boolean;
  savingPhrase: boolean;
  onSavePhrase: () => void;
  onDone: () => void;
}) {
  const gap = diagnosis.gap;
  const meta = SPEAK_GAP_META[gap];
  const [txt, setTxt] = useState("");
  const [beat, setBeat] = useState(beatSeed);
  const [timer, setTimer] = useState<number | null>(null);

  useEffect(() => {
    if (timer === null || timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  let ready: boolean;
  let body: ReactNode;
  const showBank = gap === "retrieval" && !rejected && !!diagnosis.phraseText;

  if (gap === "retrieval") {
    ready = txt.trim().length > 0;
    body = (
      <>
        {showBank && (
          <div className="sl-bank" style={{ marginTop: 16 }}>
            <span className="eyebrow">
              <LibraryIcon width={10} height={10} /> From your Phrase Bank
            </span>
            <p className="sl-bank-phrase">“{diagnosis.phraseText}”</p>
          </div>
        )}
        <textarea
          className="sl-drill-input"
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          placeholder={rejected ? "Say that part again in your own words — one sentence." : "One sentence of your own that uses the phrase…"}
        />
      </>
    );
  } else if (gap === "new_language") {
    ready = phraseSaved;
    body = (
      <div className="sl-bank" style={{ marginTop: 16 }}>
        <span className="eyebrow">
          <PlusIcon width={10} height={10} /> One phrase to save <span className="sl-new-badge" style={{ marginLeft: 6 }}>new</span>
        </span>
        <p className="sl-bank-phrase">“{diagnosis.suggestion}”</p>
        <div className="sl-bank-acts">
          {!phraseSaved ? (
            <button type="button" className="btn primary" onClick={onSavePhrase} disabled={savingPhrase}>
              <LibraryIcon width={14} height={14} /> {savingPhrase ? "Saving…" : "Save to Phrase Bank"}
            </button>
          ) : (
            <span className="sl-saved-line">
              <CheckIcon width={14} height={14} /> Saved — labeled <b>new</b> in your Phrase Bank
            </span>
          )}
        </div>
      </div>
    );
  } else if (gap === "meaning") {
    ready = true;
    body = (
      <>
        <p className="sl-sub" style={{ marginTop: 14 }}>
          {diagnosis.beatIndex !== null ? `Beat ${diagnosis.beatIndex + 1}, straight from your message:` : "The beat to revise, straight from your message:"}
        </p>
        <textarea
          className="sl-drill-input"
          style={{ fontFamily: "var(--pb-phrase-font, var(--font-serif))", fontSize: 17 }}
          value={beat}
          onChange={(e) => setBeat(e.target.value)}
        />
      </>
    );
  } else {
    ready = timer !== null;
    body = (
      <>
        <div className="sl-beats" style={{ marginTop: 16 }}>
          <div className="head">
            <NoteIcon width={13} height={13} /> Beat 1 only
          </div>
          <ol>
            <li>
              <span className="n">1</span>
              <p>{firstBeat}</p>
            </li>
          </ol>
        </div>
        <div className="sl-timer">
          {timer === null ? (
            <button type="button" className="btn primary" onClick={() => setTimer(30)}>
              <PlayIcon width={14} height={14} /> Start 30 seconds
            </button>
          ) : (
            <>
              <span className={"t" + (timer <= 5 ? " low" : "")}>0:{String(timer).padStart(2, "0")}</span>
              <span className="note" style={{ fontSize: 12, color: "var(--text-4)" }}>
                {timer > 0 ? "Say beat 1 out loud. Just that." : "Time. However it came out, that was the drill."}
              </span>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="sl-card">
      <div className="sl-eyebrow">One repair</div>
      <h2 className="sl-h">{rejected && gap === "retrieval" ? "Say it your way, once" : meta.drillTitle}</h2>
      <p className="sl-sub">{meta.drillNote} One action — no worksheet.</p>
      {body}
      <div className="sl-foot">
        <span className="spacer" />
        <button
          type="button"
          className="btn primary"
          disabled={!ready}
          style={!ready ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          onClick={onDone}
        >
          <ReplayIcon width={14} height={14} /> Now say it all again
        </button>
      </div>
    </div>
  );
}

function SLHighlight({ text, phrase }: { text: string; phrase: string | null }) {
  if (!phrase) return <>{text}</>;
  const i = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + phrase.length)}</mark>
      {text.slice(i + phrase.length)}
    </>
  );
}

export function SLEvidence({
  attempt2,
  phrase,
  choice,
  onChoice,
  onNext,
}: {
  attempt2: string;
  phrase: string | null;
  choice: EvidenceChoice | null;
  onChoice: (v: EvidenceChoice) => void;
  onNext: () => void;
}) {
  const used = usedInAttempt(attempt2, phrase);
  const ev = SPEAK_EVIDENCE.find((e) => e.id === choice);
  return (
    <div className="sl-card">
      <div className="sl-eyebrow">Honest evidence</div>
      <h2 className="sl-h">What actually happened?</h2>
      <p className="sl-sub">No streaks, no scores. Pick the honest one — it only decides when this comes back for review.</p>
      <div className="sl-transcript">
        <SLHighlight text={attempt2} phrase={used ? phrase : null} />
      </div>
      <div className="sl-ev-row">
        {SPEAK_EVIDENCE.map((e) => (
          <button key={e.id} type="button" className={"sl-ev-btn" + (choice === e.id ? " on" : "")} onClick={() => onChoice(e.id)}>
            {e.label}
          </button>
        ))}
      </div>
      {ev && (
        <div className="sl-sched">
          <ReplayIcon width={12} height={12} /> The leftover repair is scheduled — review in {ev.sched}.
        </div>
      )}
      <div className="sl-used">
        <div className="lbl">Used — earned, not clicked</div>
        <div style={{ marginTop: 9 }}>
          <span className={"sl-used-chip" + (used ? " earned" : "")}>
            {used && <CheckIcon width={11} height={11} />} Used
          </span>
        </div>
        {used ? (
          <p>“{phrase}” appeared in your attempt — highlighted above. That’s a use event, logged for this phrase in your Phrase Bank.</p>
        ) : (
          <p>
            {phrase
              ? "Your saved phrase didn’t appear this time, so Used stays off. It lights up only when the phrase shows up in the attempt itself."
              : "No saved phrase was in play this session, so there’s nothing to earn."}
          </p>
        )}
      </div>
      <div className="sl-foot">
        <span className="spacer" />
        <button
          type="button"
          className="btn primary"
          disabled={!choice}
          style={!choice ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          onClick={onNext}
        >
          See the recap
        </button>
      </div>
    </div>
  );
}

export function SLRecap({
  diagnosis,
  firstBeat,
  phrase,
  phraseSource,
  used,
  choice,
  backSlot,
  footNote,
}: {
  diagnosis: Diagnosis;
  firstBeat: string;
  phrase: string | null;
  phraseSource: "bank" | "new" | null;
  used: boolean;
  choice: EvidenceChoice | null;
  backSlot?: ReactNode;
  footNote?: ReactNode;
}) {
  const ev = SPEAK_EVIDENCE.find((e) => e.id === choice);
  return (
    <div className="sl-card">
      <div className="sl-eyebrow">Session recap</div>
      <h2 className="sl-h">One loop, done.</h2>
      <div className="sl-recap">
        <div className="sl-recap-row">
          <div className="k">What you wanted to say</div>
          <div className="v">
            <span className="phrase">“Explain what I do”</span> — starting with <span className="phrase">“{firstBeat}”</span>
          </div>
        </div>
        <div className="sl-recap-row">
          <div className="k">Which phrase was yours</div>
          <div className="v">
            {phrase ? (
              <>
                <span className="phrase">“{phrase}”</span>
                <span className="dim">{phraseSource === "new" ? " · saved this session, labeled new" : " · from your Phrase Bank"}</span>
                {used && (
                  <span className="sl-used-chip earned" style={{ marginLeft: 10, height: 24, fontSize: 11.5 }}>
                    <CheckIcon width={10} height={10} /> Used
                  </span>
                )}
              </>
            ) : (
              <span className="dim">None in play this session.</span>
            )}
          </div>
        </div>
        <div className="sl-recap-row">
          <div className="k">What failed on attempt 1</div>
          <div className="v">{diagnosis.recapFail || SPEAK_GAP_META[diagnosis.gap].def}</div>
        </div>
        <div className="sl-recap-row">
          <div className="k">What changed on attempt 2</div>
          <div className="v">
            {diagnosis.recapChange || "You said it again, with the gap in mind."}
            {ev && <span className="dim"> · you marked it “{ev.label}” — review in {ev.sched}.</span>}
          </div>
        </div>
      </div>
      {(footNote || backSlot) && (
        <div className="sl-foot">
          {footNote && <span className="note">{footNote}</span>}
          <span className="spacer" />
          {backSlot}
        </div>
      )}
    </div>
  );
}
