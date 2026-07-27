# Phrase Bank — Full Design Build Plan

**Status:** proposed — plan-review gate before implementation
**Source design:** `phrase-bank.html` (Claude Design project `817dcc92-…`)
**Scope decision:** build the **full** design, not the visual-only reskin — i.e.
the learning-status system, readiness meter, Today's review, quick-check SRS,
search, tags/island, plus the sidebar layout and a roomier profile menu.
**Net effect:** this is effectively **Phase 3 of the web-beta launch plan**
(phrase evidence / SRS), pulled forward and dressed in the real design.

---

## 1. Gap: what exists vs. what the design needs

| Area | Real app today | Design needs | Action |
| --- | --- | --- | --- |
| Layout | `Sidebar` + `.home-app/.main/.main-inner` (see `bookmarks/page.tsx`); Sidebar **already has a Phrase Bank nav item** | Same shell, Phrase Bank as a page inside it | Reuse — move `/phrases` off its standalone header onto the sidebar shell |
| Phrase font | not loaded | **Newsreader** for the phrase display (`--pb-phrase-font`) | Add via `next/font` in `layout.tsx` |
| Accent | cobalt tokens live in `home.css` | design defaults to cobalt `#3B6EE1` already | Use app cobalt tokens; drop terracotta |
| Data model | `phrase_items`: text, meaning_ko, usage_note, source_context, start/end_time, video_id, segment_id, **status=pending/ready/failed** (processing), created_at | **learning_status** (new→recognizing→practicing→ready→refresh), SRS (ease/interval/due/lapses), tags, island, last_practiced | **Migration 018** (below) |
| Status logic | `srs.ts` SM-2-lite exists for bookmarks | quick-check → status + next-review schedule | New pure `phrase-srs.ts`, reuse SM-2-lite intervals |
| Search | none (empty-state mentions it) | prominent search over phrase/meaning/situation | Client-side filter over real fields |

**Honesty rule carried through:** every status shown must come from a real
learner action (a quick-check), never from a display or an AI suggestion. That
is exactly why we add a backend instead of faking the pills.

---

## 2. Phase A — Data model (`supabase/migrations/018_phrase_learning_status.sql`)

Add to `phrase_items` (RLS already ON/FORCED — new columns inherit the owner policy):

- `learning_status TEXT NOT NULL DEFAULT 'new'`
  `CHECK (learning_status IN ('new','recognizing','practicing','ready','refresh'))`
- SRS (mirror `004_bookmarks_srs.sql`): `ease_factor FLOAT DEFAULT 2.5`,
  `interval_days FLOAT DEFAULT 0`, `lapses INT DEFAULT 0`,
  `due_at TIMESTAMPTZ`, `last_reviewed_at TIMESTAMPTZ`
- `last_practiced_at TIMESTAMPTZ`
- `island TEXT`
- `tags TEXT[] NOT NULL DEFAULT '{}'`

Backfill: existing rows → `learning_status='new'`. **`refresh` is derived, not
stored** (a phrase whose `due_at < now()` and status ∈ {recognizing,practicing,ready}),
so we need no cron to "expire" phrases.

> ⚠️ Manual gate: migrations run by pasting SQL into the Supabase SQL Editor
> (no CLI). This is Sumin's step and must happen before the status UI works in
> prod. Until applied, the page must degrade gracefully (treat every row as
> `new`, hide the quick-check echo) rather than throw.
>
> Numbering note: the Island plan pencilled in `018_speaking_memory_island.sql`,
> but Island is deferred and this is what we're building now → take **018** here,
> renumber Island later.

## 3. Phase B — Status + SRS logic (`web/src/lib/phrase-srs.ts` + tests)

- Pure `applyQuickCheck(state, check, now)` mapping the design's three checks to
  status + schedule, reusing SM-2-lite intervals the design already implies:
  - `recognized` → `recognizing`, next review ~2 days
  - `withhelp` → `practicing`, next review ~4 days
  - `onmyown` → `ready`, next review ~10 days
- `deriveDisplayStatus(row, now)` → folds stored status + overdue `due_at` into
  the 5 display states (adds `refresh`).
- Unit-tested like `srs.ts` (pure, `Segment→Segment`-style). No network.
- Writes go through the **RLS anon client** straight from the page (same pattern
  as bookmarks' insert/update/delete) — no new service-key route needed. The
  existing `/api/phrases` (session-auth) stays for create/manual only.

## 4. Phase C — Page reskin (`web/src/app/phrases/`)

Convert `/phrases` from standalone to the sidebar shell, mirroring
`bookmarks/page.tsx`:

- `page.tsx`: fetch phrases + folders + videos; render `.home-app` › `Sidebar`
  (real props) + `.main` › `.main-inner`; add a `MobilePhrases` sibling for the
  mobile shell (bookmarks has `MobileBookmarks` — match it).
- Port `phrase-bank.css` → `phrases.css`, retinted to cobalt, tokens aliased to
  the app's (`--text-2/3/4`, `--bg-elev`, `--radius-lg`, `--font-serif/mono`,
  `--pb-phrase-font`). Verify each token exists in `home.css`; add any missing.
- New components under `web/src/components/phrases/`:
  `StatusPill`, `ReadinessMeter`, `ReviewPanel` (Today's review),
  `PhraseCard` (expandable + quick-check footer + echo), `PhraseFilters`
  (status chips), `PhraseSearch` (bar + hint), `PhraseBankEmpty`, `NoResults`.
- Data wiring: phrase→`text`, gloss→`meaning_ko`, context→`source_context.sentence`,
  source→video title + `start_time` deep-link, note→`usage_note`, plus
  `learning_status`, `tags`, `island`, dates.
- Actions: **Add a phrase** → the manual-entry form already built (as a modal);
  quick-check → `applyQuickCheck` + supabase update; edit-note / delete inline.
  **Import** button → omit for beta (no honest source yet).
- Search: client-side over phrase/meaning/context/source/tags/island.

## 5. Phase D — Roomier profile menu (`web/src/components/settings/profile-menu.css`)

Sumin's note: current menu feels cramped vertically. Increase without changing
behavior: trigger padding `7/8→10/10`, avatar `26→32`, menu item padding
`8/10→11/12` (taller rows), gaps, menu `padding`/`min-width`, email row. Keep
the upward-open + Settings/Sign-out structure.

## 6. Phase E — Fonts (`web/src/app/layout.tsx`)

Add **Newsreader** via `next/font/google`, expose as `--pb-phrase-font` (and a
serif-display var). Keep Pretendard/existing fonts. Do not disturb the language-
pair font rule in `CLAUDE.md`.

## 7. Phase F — Verify + ship

- Unit tests: `phrase-srs.ts` (mapping, overdue derivation, boundaries).
- `cd web && npm test && npm run lint && npm run build`.
- Runtime verify in browser (login + a clip's phrases): save → status pill →
  quick-check → readiness meter moves → Today's review updates. (The PhraseSaver
  runtime check from earlier folds in here.)
- Sumin applies migration 018 in Supabase; re-verify against prod data.
- Journal entry + an ADR for the status-model decision (design labels vs PRD
  evidence levels).

---

## 8. Open decisions (need Sumin's call before/at build)

1. **Status vocabulary.** Design says *New / Recognizing / Practicing / Ready to
   use / Needs refresh*. PRD's evidence model says *Recognize / Retrieve / Use*
   (+ review labels *Not yet / I recognized it / It came back*). Ship the
   design's five as the learner-facing labels, or reconcile to the PRD's? 
   → *Default: ship design's five (they read well); note the mapping in the ADR.*
2. **Tags / Island.** No input UI exists. Seed empty + display-only now and add
   editing later, or build tag/island editing in this pass?
   → *Default: display-only; editing deferred.*
3. **Mobile.** Full `MobilePhrases` shell now, or desktop-first and a basic
   mobile list?  → *Default: basic mobile list now, parity later.*
4. **Today's review actions** (Quick review / Use in a sentence / Practice in
   context). Wire to real drills now, or render as entry points that route to
   existing practice?  → *Default: route to existing `/practice`; bespoke phrase
   drills deferred.*

## 9. Rough sequencing (build order)

1. Migration 018 SQL written (Sumin applies) + `phrase-srs.ts` + tests.
2. Fonts + profile-menu roomier (small, independent, ship-safe).
3. `/phrases` sidebar shell + tokens/CSS port (no status yet).
4. Phrase cards + search + filters (real data, status display).
5. Quick-check + readiness meter + Today's review (interactive).
6. Mobile list, empty/no-results states.
7. Tests + gate + runtime verify + journal/ADR.

Steps 2–4 are shippable increments; the status system (5) is the part gated on
migration 018 being live.
