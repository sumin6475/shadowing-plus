# Language Island — Phase 3 "Speak Loop" UI Mockup Brief

**Purpose:** a brief for designing the **web** speak-loop screens (in Claude
Design) that attach to the Phase 1 island. Same workflow as before: mock it,
then port to the `.home-app` shell.

**Continues:** [Phase 1 island UI brief](2026-07-26-explain-what-i-do-island-ui-brief.md)
· built at `/app/island` (capture → beats → save). Phase 3 is what the
disabled **"Practice this message"** CTA and the dashed **Phase 3 sketch** on
that page turn into. Full context:
[web-beta launch plan](../../.agents/plans/2026-07-24-speaking-memory-web-beta-launch.md) §3 ·
[speaking-memory-mvp PRD](../../.agents/PRDs/speaking-memory-mvp.md).

**Already scaffolded (migration 019):** `island_attempts`, `island_repairs`,
`island_phrase_events` tables exist and are owner-only (FORCE RLS) — Phase 3
only has to wire them.

---

## 1. What Phase 3 is

Phase 1 gave the learner an editable **message** (their beats). Phase 3 is where
they **actually say it** and where **retrieval becomes visible**: speak → find
*one* gap → one repair (often "use a phrase you already saved") → speak again →
mark honest evidence. This is the moment the whole product exists for — a saved
phrase coming back on its own.

**North-star (unchanged):** own voice first; **one failure, one next action**
(never a dashboard of corrections); measure *usable access*, not memorization.

---

## 2. The loop to mock

```
From a saved island message ("Practice this message")
   │
1. Attempt 1        say the whole message  (TEXT first; voice is gated — see §6)
2. One gap          AI names ONE of: meaning · new language · retrieval · pressure
3. One repair       a single short drill for that gap
                    (retrieval gap → pull a phrase from your Phrase Bank)
4. Attempt 2        say it again
5. Honest evidence  Not yet · I recognized it · It came back   (+ a separate Used)
                    → schedule the leftover for review (island SRS)
6. Session recap    what you wanted to say · which phrase was yours ·
                    what failed on 1 · what changed on 2
```

The design mockup's `LISketch` already sketches steps 1–5 — this brief expands
each into a real screen/state.

---

## 3. Screens & states to mock

### A. Attempt 1
- Shows the learner's beats (from Phase 1) as the thing to say.
- **Text-first input:** a box to type/paste their spoken attempt. A clear
  "voice coming" affordance, but text is the shippable path (see §6).
- One primary action: **Get one gap** (submits the attempt).

### B. One gap, diagnosed — *the signature screen*
- A **single card**, not a report. It names exactly one gap:
  - **meaning** — an idea/beat wasn't clear.
  - **new language** — you needed a word/phrase you don't have yet.
  - **retrieval** — you *have* the phrase but it didn't come out.
  - **pressure** — you froze / rushed under time.
- For a **retrieval** gap, surface the phrase from **their Phrase Bank**
  ("From your Phrase Bank · '…'") — this is the payoff moment. (The sketch's
  `li-gap-card` already shows this.)

### C. One repair drill (varies by gap)
- **meaning** → revise one beat (jump back to that beat, edit).
- **new language** → save ONE new phrase, clearly labeled "new" (→ Phrase Bank).
- **retrieval** → shadow / say one sentence using the surfaced owned phrase.
- **pressure** → a shorter, time-boxed retry of just that part.
- Keep it to *one* action. No multi-step worksheet.

### D. Attempt 2
- Same input as A, framed as "now say it again."

### E. Honest evidence + schedule
- Learner-facing buttons (map to internal SRS `again/good/easy`):
  **Not yet** · **I recognized it** · **It came back**.
- **Used** is a SEPARATE event, not one of the three — awarded only when a saved
  phrase actually appeared in the attempt (ideally shown in the transcript).
  Never award Use from a button alone.
- The leftover repair is scheduled for review (island SRS, ~1m / 2d / 7d).

### F. Session recap
- One honest summary: *what I wanted to say · which phrase came from my own bank
  · what failed on attempt 1 · what changed on attempt 2.* No score, no streak.

### G. Voice states (when §6 unlocks it)
- Record (mic permission) · recording · transcribing · transcript shown ·
  **delete this recording** (must exist) · mic-denied fallback to text ·
  unsupported-format fallback.

---

## 4. Copy (use verbatim so mock ↔ build match)

| Element | Text |
|---|---|
| Practice CTA (from Phase 1) | **Practice this message** · "One attempt, one gap, one repair — then say it again. About four minutes." |
| Gap eyebrow | "One gap" (never "errors"/"mistakes") |
| Gap types | meaning · new language · retrieval · pressure |
| Retrieval line | "From your Phrase Bank · '…'" |
| Evidence buttons | **Not yet** · **I recognized it** · **It came back** · **Used** (separate) |
| Recap frame | "what you wanted to say / which phrase was yours / what failed / what changed" |
| Voice delete | "Delete this recording" |

---

## 5. Data (migration 019, already live)

- `island_attempts` — `attempt_no`, `transcript`, `duration_seconds`, optional
  `audio_key` (private R2) + `audio_content_type`.
- `island_repairs` — `beat_id`, `phrase_item_id`, `diagnosis`
  (`meaning|new_language|retrieval|pressure`), `drill`, SRS fields, `completed`.
- `island_phrase_events` — append-only `saved|shadowed|retrieved|used|rejected`
  (this is how `Used` is recorded honestly, and feeds analytics).

Never put raw transcripts/audio into analytics payloads — IDs/aggregates only.

---

## 6. Hard gates (do NOT skip in the mock's assumptions)

- **Voice is gated.** Before collecting any attempt audio: the browser
  `MediaRecorder` MIME (WebM/Opus) must be reconciled with the ASR provider (the
  Groq adapter hard-codes `audio.mp3`), AND retention + a working **delete** path
  + Privacy/Terms disclosure must exist. If any isn't ready, **text attempts are
  the beta default** — design text as the first-class path, voice as the unlock.
- **One gap per attempt.** The diagnosis returns exactly one; the mock must not
  invite a list of fixes.
- **Use is earned, not clicked.** Design `Used` as a distinct, evidence-backed
  state, visually separate from the three review buttons.

---

## 7. Design system

Matches the Phase 1 island: `.home-app` cobalt tokens, **Newsreader** for the
message/beats, focused sidebar-shell workspace. The gap card, evidence buttons,
and "from your Phrase Bank" chip already have a visual language in the Phase 1
mockup's `LISketch` — promote those to full components.

---

## 8. Open design questions

1. **Voice now or text-only for first beta?** (Gated by §6 — likely text-first.)
2. **How is the single gap chosen** when an attempt has several weaknesses?
   (Highest-leverage? A priority order: meaning > retrieval > new language >
   pressure?)
3. **One island, one message** — is Phase 3 a full-screen flow, a modal over the
   island, or a sequence of cards inline under the beats?
4. **Retrieval surfacing:** how does the "from your Phrase Bank" phrase get
   chosen (the Speaking Memory Search / lexical match)? How does the learner
   accept/reject it (that reject signal is product evidence)?
5. **Recap:** its own screen, or a card that stays on the island afterward?

---

## 9. Connection to Phrase Bank (this closes the loop)

Phase 3 is where the two halves finally meet:
- a **retrieval** gap pulls a phrase you saved in the **Phrase Bank**;
- using it fires a `used` **island_phrase_event**, which is the honest source of
  the Phrase Bank's `Use` evidence level (today capped at `ready` because no Use
  event existed — see ADR 0001). Phase 3 is what unlocks `Use`.
