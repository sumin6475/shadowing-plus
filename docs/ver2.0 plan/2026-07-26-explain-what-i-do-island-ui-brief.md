# "Explain what I do" Island — UI Mockup Brief

**Purpose:** a brief for designing the **web** Island screens (in the Claude
Design project) before we finalize the build. Phrase Bank went smoothly because
we ported a real web mockup; this does the same for the Island.

**What already exists to reference:**
- `sp-islands.jsx` / `sp-onboarding.jsx` / `sp-speak.jsx` in Claude Design — a
  **mobile-first native prototype** (custom `<Screen>`/`<Pill>` framework). Good
  for *concept* (island map, "create with a topic", first questions, answer by
  mic) but **not** the web design language.
- The current web app uses the **`.home-app` design system** (cobalt, sidebar
  shell, Newsreader for editorial serif) — same as Phrase Bank / Home.
- A **first-pass implementation already exists** at `/app/island` (built
  2026-07-26). This brief describes it so the mockup can match, refine, or
  replace it.

Full product context: [`speaking-memory-mvp` PRD](../../.agents/PRDs/speaking-memory-mvp.md)
· [web-beta launch plan](../../.agents/plans/2026-07-24-speaking-memory-web-beta-launch.md).

---

## 1. What this feature is

Non-native speakers understand and collect lots of English but **freeze when they
have to explain their own work** under pressure. The "Explain what I do" Island
is a private rehearsal workspace that:

1. takes the learner's **rough, messy explanation** of what they do,
2. **organizes it into their own words** as a few editable "message beats"
   (the AI structures; it must never invent facts), and
3. later, lets them **speak it, find one gap, repair it, and speak again** —
   pulling from the English they already saved.

**One-line product frame:** *Stop collecting English. Start using the English you
already know.* The Island is the "use it" stage; the Phrase Bank is the "have it"
stage.

**North-star principle for every screen:** **AI structures; the learner owns the
facts and the voice.** Never render a generated "native answer" as if it were the
learner's. When a learner edits an AI beat, it visibly becomes *their* words.

---

## 2. The core loop (what the mockup should tell as a story)

```
1. Land on the island (onboarding: Passive → Active English)
2. Brain-dump a rough explanation in your own words
3. AI shapes it into 3–6 editable message "beats" (no invented facts)
4. Edit the beats until they're yours
   ─────────────  [Phase 1 ends here — built]  ─────────────
5. Speak attempt 1 (text now; voice later)
6. AI diagnoses ONE gap: meaning / new language / retrieval / pressure
7. One short repair drill (e.g. pull a phrase from your Phrase Bank)
8. Speak attempt 2
9. Mark honest evidence (recognized / it came back / used) + schedule review
```

Mock up steps 1–4 as the **primary** flow (that's what ships first). Sketch 5–9
as a **secondary / "coming next"** state so the layout can anticipate them (don't
over-invest — they change after we test the entry).

---

## 3. Screens & states to mock up

### A. First entry (onboarding + capture) — *primary*
- **Header:** eyebrow `LANGUAGE ISLAND`, title (serif) **Explain what I do**, one
  lede line.
- **Passive/Active Venn** (dismissible "Got it"): two overlapping circles.
  - Left **Passive English** — "I recognize it when I hear or read it."
  - Right **Active English** — "I can retrieve it when I have something to say."
  - Overlap **Ready** — "English that's ready for my real conversations. That's
    what this island grows."
  - It's a *concept model*, not a score — no percentages, works without vision.
- **Rough-answer capture:** a big, low-pressure textarea. Placeholder invites a
  messy brain-dump ("don't polish it — just get the real thing down"). Primary
  button **Shape into beats**.

### B. Shaping — *primary*
- Loading/working state on the button ("Shaping…"). Keep it calm; it's ~2–4 s.

### C. Beats editor (the heart) — *primary*
- Section title (serif) **Your message** + one honest line: "AI organized your
  words into beats. Edit them until they're yours — **AI structures; you own the
  facts.**"
- A vertical list of **beats**, each:
  - a number badge,
  - the beat text (editable, the important line — consider Newsreader here),
  - an optional **evidence / example** line,
  - a small **source badge**: `AI-structured — edit to make it yours` vs
    `Your words` (flips to "Your words" once edited),
  - move up/down, remove.
- **Add a beat**, and **Save my message** (with a "Saved ✓").
- **Re-shape** replaces the beats (with a clear warning).

### D. Returning / saved state — *primary*
- Coming back to a `ready` island: show the saved beats first, with the rough
  answer available to revisit. What's the entry point to *practice* it? (see
  open questions).

### E. Speak → diagnose → repair → retry — *secondary / future*
- Sketch only. An attempt (text box now, mic later), one diagnosed gap shown as a
  single card (not a dashboard), one repair drill (often "use this phrase from
  your bank"), a second attempt, and honest evidence buttons
  (**Not yet / I recognized it / It came back**, plus a separate **Used** event).

### F. Empty / no-island first-run
- The very first visit (nothing saved): onboarding + capture is the whole screen.

---

## 4. Copy (use these strings so the mock matches the build)

| Element | Text |
|---|---|
| Eyebrow / Title | `LANGUAGE ISLAND` · **Explain what I do** |
| Lede | "Start from a rough explanation in your own words. We'll help you shape it into clear message beats — then you use the English you already have." |
| Venn – passive | "**Passive English** — I recognize it when I hear or read it." |
| Venn – active | "**Active English** — I can retrieve it when I have something to say." |
| Venn – overlap | "**The overlap** — English that's ready for my real conversations. That's what this island grows." |
| Capture label | "Your rough explanation" |
| Capture CTA | **Shape into beats** / **Re-shape into beats** |
| Beats intro | "AI organized your words into beats. Edit them until they're yours — **AI structures; you own the facts.**" |
| Beat source badges | `AI-structured — edit to make it yours` · `Your words` |
| Save | **Save my message** · `Saved ✓` |

---

## 5. Design system notes (for the mock)

- **Tokens:** the `.home-app` cobalt set (`--accent`/`--accent-text`/
  `--surface`/`--text-2/3/4`/`--hairline`…). Not the deprecated terracotta.
- **Type:** UI sans (Pretendard/Inter); **Newsreader** (`--pb-phrase-font`) for
  the editorial/"message" serif, matching Phrase Bank.
- **Layout:** a **focused, centered workspace** (max-width ~720px), *not* the
  library sidebar — the Island is a "sit down and think" surface. (Current build
  does this; open to challenge — see below.)
- **Reachable via** the sidebar nav item **Language Island** (🎙 mic icon). Naming
  principle: the sidebar names the **feature** ("Language Island", matching the
  public landing); **"Explain what I do"** is the first **island (topic)** you
  land on inside it — like the sidebar says "Phrase Bank", not a single phrase.
  Later, `/app/island` may become an island map (career story, project pitch…).
- **Mobile:** single column; the Venn stacks above the text.

---

## 6. Data the UI reflects (already in migration 019)

- `islands`: one active `explain_what_i_do` per user — `raw_answer`, `status`
  (`draft → shaping → ready → archived`).
- `island_beats`: ordered, editable — `text`, optional `evidence`, `source`
  (`learner` | `ai_structured`).
- `island_attempts` / `island_repairs` / `island_phrase_events`: created but
  wired only in Phase 3 (the speak loop).

Everything is owner-only (FORCE RLS). Voice is deferred — **text-first** for now.

---

## 7. Built vs. deferred (as of 2026-07-26)

- **Built (Phase 1):** `/app/island` entry — Venn, rough capture, AI
  `Shape into beats` (`/api/island/shape`), editable beats, save. Migration 019.
- **Deferred (Phase 3):** the speak → diagnose → repair → retry loop, voice
  input, and pulling Phrase Bank phrases into a beat/repair (retrieval).

The mockup should treat Phase 1 as the thing to get *right*, and leave clean room
for the Phase 3 loop to attach later.

---

## 8. Open design questions (for the mock to resolve)

1. **Focused workspace vs. sidebar shell?** Current build is a centered
   focused page. Should the Island instead live inside the library sidebar like
   Phrase Bank, for consistency? (Trade-off: focus vs. familiarity.)
2. **How does "practice/speak" enter** from a saved (`ready`) island? A big CTA?
   A separate tab? This sets up the whole Phase 3 loop.
3. **Beat visual:** cards? a numbered document? How much does Newsreader vs. sans
   carry "this is your message"?
4. **Venn placement:** one-time onboarding, or a small always-available legend?
5. **Multiple islands later** (career story, project pitch…): does the first mock
   need an island "map/list", or is a single island the whole surface for beta?

---

## 9. How this connects to Phrase Bank

The two are a pair:
- **Phrase Bank** = the English you've saved (have it).
- **Island** = the stage where you actually reach for it (use it).

Future bridge: while rehearsing an Island beat you get stuck → **Speaking Memory
Search** surfaces a phrase you already saved to fill the gap → you mark it
`used`. Design the beats/repair area so a "from your Phrase Bank" suggestion can
slot in naturally later.
