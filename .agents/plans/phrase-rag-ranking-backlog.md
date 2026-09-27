# Backlog — Phrase RAG ranking after v1

- Date: 2026-08-23
- Status: backlog (not this slice)
- Depends on: Hybrid Phrase RAG v1 (`talk-phrase-suggest` vector Top-K + confidence 80)

## Chosen v1 contract (do not reopen in this slice)

- `suggested` is exposure only. It must not raise Story affinity.
- `accepted` is a weak positive. `used` is the strong positive. `rejected` is a strong negative in that context only.
- Vector search finds candidates. Personal history only re-ranks those candidates.
- Rejection stays 30 days and Story-scoped / free-talk-scoped. Not “until the Story ends.”
- In this slice the 30-day window, Story tie-break, and `used` time-decay are policy constants in `talk-phrase-suggest` (`REJECTION_COOLDOWN_DAYS`, `STORY_TIE_MARGIN`, `STORY_TIE_BONUS`, decay days). They are not product-config rows yet.

## Deferred

### 1. Structured reject reasons

Doesn’t fit currently stores free text in `phrase_events.evidence.reason`. Do not score that text.

Add a required choice, then optional note:

- Wrong for this situation → stronger same-Story exclusion later
- I can already say this naturally → lower repeat frequency
- Too hard or awkward → difficulty signal
- Not what I meant → meaning-mismatch signal

Needs `talk.tsx` + event shape. Hold until a build that already touches Self-talk UI.

### 2. Impression and empty-recommend logging

Wanted:

- every card shown as `shown` (or keep `suggested` as the impression)
- `shown → accepted → used / rejected` by Story and by phrase
- sessions where the card was hidden (`suggestion: null`)
- repeat-exposure count next to reject rate

Blocked: `phrase_events.phrase_item_id` is `NOT NULL`, so a no-card session has nowhere to go. Needs a nullable column or a small session-level event. Measure Precision Hit from existing `suggested → accepted/used` until then.

### 3. Exploration slot

Reserve ~10–20% of cards for a relevant but less-proven phrase so `used` winners do not freeze the bank.

Skip while the bank is ~20 items (almost every ready phrase is already in play). Revisit after ~50 ready embeddings.

### 4. Tunable policy store

v1 constants live in the Edge Function. Later, compare 14 / 30 / 45-day rejection and Story margin 0.03 / 0.05 / 0.08 without a deploy if a `phrase_rank_policy` row (or equivalent) is worth it. Do not build an admin UI first.

### 5. Ranking dashboard

Story-scoped conversion, reject rate, and “no card” rate. Marketing / fade-in / social cards stay out until the pipe is stable.

## Related, not ranking

- Rename `phrase_items.meaning_ko` → `meaning` when a second learner language is real. Same column already stores any L1 gloss. Do not rename during RAG.

## Next after RAG v1 UI

1. Finish used-match array + “You used N saved phrases.”
2. Structured reject reasons (this backlog #1).
3. Empty-recommend / impression log (this backlog #2).
4. Exploration once the bank is large enough (this backlog #3).
