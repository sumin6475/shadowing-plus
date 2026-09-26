# 0024 — Which language each surface speaks

- **Date:** 2026-09-10
- **Status:** Accepted

## Context

Saylo is N:1 — learners with many first languages (ko, zh-Hant, ja, es, ru, en)
learning one target, English. Supporting a first language does not mean every
surface switches to it. Each surface had been decided piecemeal (ADR 0021 for
the tour, ADR 0022 for which languages), and one open question remained: should
AI speaking feedback (`talk-diagnose`) coach in the learner's first language?

Measured before deciding: `talk-diagnose` returns six fields per moment, and
three of them **must** stay English — `said` (the verbatim span of what the
learner said), `improvedSentence` (the corrected English), and `diagnosisTag`
(`[Direct Translation]` and friends — stored in `diagnosis_tag` and rendered
verbatim, so a localized tag would fragment history and break any later
grouping). Localizing only the other three would put two languages into every
feedback card, with no way to QA six languages of coaching quality.

## Decision

One rule per surface:

| Surface | Language | Why |
|---|---|---|
| App chrome (tabs, headings, buttons) | English | ADR 0021 — the tour points at English labels |
| First-run tour | English until an L1 is **chosen** in Settings | ADR 0021 |
| **AI speaking feedback** | **English** | This ADR — see context |
| **Phrase gloss + context translation** | **Learner's L1** | `phrase-capture` sends `first_language` |
| **Notes and free memos** | **Any language the learner writes** | Their words, stored as typed |
| Stuck-note → English phrase | Reads any language, answers in English | `talk-stuck` |

The one surface that *explains* English to the learner — the gloss — is the one
that speaks their language. Everything that *is* English practice stays English.

## Consequences

- Nothing in `talk-diagnose` changes; its prompt is already English-only.
- "Notes in any language" is a promise the code has to keep, not a default.
  Found while writing this: `quickTitleFromBody` split sentences only on Latin
  punctuation followed by a space, so a Chinese or Japanese note (whose full
  stops `。！？` are never followed by one) became a one-paragraph title.
- The serif used for titles covers Latin only, so a learner's own title typed
  in Korean, Chinese or Russian renders in the system sans. Glosses are
  unaffected — they already render in the sans body face. The font fix is a
  separate decision.

## Revisit trigger

- Learners below roughly B1 start churning on English-only feedback. The safe
  first step is to localize only `label`/`action`/`explanation` and keep the
  three verbatim fields English.
