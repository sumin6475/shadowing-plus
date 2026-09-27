# Saylo — can a Spanish or Russian speaker actually use this? (2026-09-10)

Audit of the N:1 promise: many first languages (**L1** = ko · es · ru · en)
learning **one** target, English. Bar: a Spanish speaker installs Saylo, sets
their language, and can learn English with it without hitting Korean.

**Verdict: not before this pass — now most of the way there, with two things
left that are decisions, not bugs.**

The honest starting point: `src/lib/first-language.ts` has offered `es` and `ru`
in Settings for a while, but picking one **changed nothing in the app**. The one
surface designed to use it, `stuckNoteCopy()`, has **no callers left** — the
sheet it fed was rewritten. Meanwhile the photo-capture feature glossed every
phrase in Korean for everyone.

---

## 1. What choosing a language does, per surface

| Surface | Before | After this pass |
|---|---|---|
| Settings → First language (the label itself) | ✅ | ✅ |
| First-run coach marks | n/a (didn't exist) | ✅ English by default, learner's L1 once chosen ([ADR 0021](../journal/decisions/0021-first-run-tour-language-english-default.md)) |
| **Phrase capture** (photo / text → gloss + translation) | ❌ **always Korean** | ✅ learner's L1 |
| L1 survives reinstall / reaches a second device | ❌ device-only | ✅ saved to the account too |
| L1 available server-side | ❌ impossible | ✅ sent with the request |
| Speak feedback (`talk-diagnose`) | English only | English only — see §3.1 |
| Phrase Bank suggestions (`talk-phrase-suggest`) | English only | English only — retrieval from the learner's own saved phrases, so no L1 needed |
| Stuck note (`talk-stuck`) | learner writes in any language, gets English back — works for every L1 | unchanged ✅ |
| App chrome (Today, Phrases, Studio, buttons, Settings) | English only | English only — deliberate, see §3.2 |

---

## 2. Fixed in this pass

### 2.1 Phrase capture no longer assumes Korean

`supabase/functions/phrase-capture/index.ts` hardcoded Korean in **six** prompt
strings — "Give a short Korean meaning", "natural Korean translation of all
context_text", and so on. A Spanish learner photographing an English sentence
got a Korean gloss back.

The client now sends `first_language`, and the function interpolates the
language name into every prompt. Pre-2026-09 builds send nothing and fall back
to Korean, which is correct for every user who has one (there is an explicit
comment to drop that default once those builds expire).

> **Deploy note:** this is an Edge Function change. It ships with
> `supabase functions deploy phrase-capture`, not with the app build.

### 2.2 The learner's language is now real state

It lived only in AsyncStorage, so it died on reinstall, never reached a second
device, and the server could never see it. `persistFirstLanguage()` now also
writes it to Supabase user metadata, and `loadFirstLanguage()` falls back to the
account when the device has nothing. Device wins over account, so an explicit
choice on this phone is never overridden.

---

## 3. Left open — decisions, not bugs

### 3.1 AI coaching is English-only — ✅ decided 2026-09-10

**Decided: English.** Recorded in
[ADR 0024](../journal/decisions/0024-language-policy-per-surface.md). Three of
the six fields `talk-diagnose` returns must stay English regardless (`said`,
`improvedSentence`, `diagnosisTag`), so localizing the rest would put two
languages in every feedback card. The gloss is the surface that explains English
in the learner's language; the feedback is English practice and stays English.

### 3.2 The app chrome is English-only

Every label a learner reads — Today, Phrases, Studio, Speaking, all of Settings
— is English. That is consistent with a product for people learning English, and
[ADR 0021](../journal/decisions/0021-first-run-tour-language-english-default.md)
made it explicit for the tour. Worth stating on the store listing rather than
discovering in a review.

### 3.3 `meaning_ko` — being renamed to `meaning` (2026-09-10)

**Decided: rename.** Done as expand → migrate → contract, not a plain `RENAME`,
because two live clients read the column: the web app (auto-deploys on push, so
an old bundle is briefly served against the new schema) and TestFlight builds
already installed on testers' phones, which cannot be updated in lockstep with a
migration. A plain rename would empty their phrase lists (PostgREST 42703).
Migration 030 adds `meaning`, backfills it, and keeps both columns in sync; a
later migration drops `meaning_ko` once no old build is in the wild.

### 3.4 The serif has no Cyrillic and no Hangul

Checked the bundled files directly:

| Font | Spanish (ñ é) | Russian (д Я) | Korean (가) |
|---|---|---|---|
| Newsreader (hero/serif) | ✅ | ❌ | ❌ |
| Inter (UI) | ✅ | ✅ | ❌ |

iOS falls back per character, so nothing breaks — but a Russian or Korean
heading silently loses the serif and renders in the system font, mixed with
Latin words that keep it. **Spanish is fully covered and needs nothing.** For
Russian, either add a Cyrillic-carrying serif or accept the fallback knowingly.

**Update 2026-09-10 — measured the options.** The L1 *gloss* is unaffected: it
renders in the sans body face everywhere. What falls back is **titles the
learner types themselves** (notes, situations, stories, topics) and tour titles.

| Script | Serif already on iOS (free) | Bundle a free serif |
|---|---|---|
| Latin, Vietnamese, **Cyrillic** | ✅ New York (`ui-serif`, RN-supported) | Source Serif 4 1.15 MB · Literata 0.91 MB |
| **Japanese** | ✅ Hiragino Mincho | — |
| **Traditional Chinese** | ❌ none | Noto Serif TC **16.07 MB** |
| **Korean** | ❌ none | Noto Serif KR **22.69 MB** |

No single free serif covers all of these *correctly*: Chinese and Japanese share
code points but not glyph shapes, so CJK needs a per-language face regardless.
Sizes are the variable fonts from google/fonts; the current JS bundle is 6.2 MB.

**Decided 2026-09-10 — option B, zero bundle cost.** The `Serif` component and
the note editor's title/goal inputs pick a face by script: Newsreader for Latin
(the brand is unchanged), New York (`ui-serif`) for Cyrillic, Hiragino Mincho
for Japanese (kana, or Han when the learner's L1 is `ja`). Korean and
Traditional Chinese keep today's cascade into the system sans. Han-only text is
ambiguous between Chinese and Japanese, which is why L1 decides — Mincho on
Chinese would show a Taiwanese learner Japanese letterforms. **Revisit** if
Taiwanese learners title their notes in Chinese: bundling Noto Serif TC is the
next step (+16 MB).

### 3.5 Two dead Korean leftovers

- `stuckNoteCopy()` in `first-language.ts` — L1 copy for a sheet that no longer exists. No callers.
- `src/screens/islands.tsx:61` renders `p.ko` from the `design/data.ts` mock. The `island` route has no `push()` caller, so it is unreachable — but it is a hardcoded Korean string sitting in shipped code.

Neither is user-visible today. Both are the kind of thing that gets copy-pasted
back into a live surface later.

---

## 4. Ship-ready checklist for es / ru

- [x] L1 selectable and persisted (device + account)
- [x] Photo/text capture glosses in the learner's language
- [x] Onboarding readable without Korean
- [x] Spanish typography fully covered by the bundled fonts
- [x] Deploy `phrase-capture` (Edge Function, separate from the app build) — v8, 2026-09-10
- [ ] Verify on a device with `first_language = es`: capture a photo, confirm the gloss and context translation come back in Spanish
- [x] Decide §3.1 (L1 coaching → English, ADR 0024) and §3.3 (`meaning_ko` → `meaning`, migration 030)
- [x] Decide §3.4 — option B, script-aware `Serif` (New York for Cyrillic, Hiragino Mincho for Japanese)
- [x] Remove the §3.5 leftovers — `stuckNoteCopy` deleted, `islands.tsx` no longer renders `p.ko`

Once the first three unchecked lines are done, a Spanish speaker can use Saylo
to learn English end to end without meeting Korean.
