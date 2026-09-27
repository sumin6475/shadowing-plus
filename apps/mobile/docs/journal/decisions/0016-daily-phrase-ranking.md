# ADR 0016 — Daily Phrase ranking is an inspectable 1/3/7/30 queue

- **날짜**: 2026-08-23
- **스텝**: Talk hint sheet + today’s review queue
- **상태**: accepted

## 맥락 (Context)
Phrase Bank already has SM-2-lite columns (`due_at`, `interval_days`, `ease_factor`, `lapses`) and stages (`new` / `recognizing` / `practicing` / `ready`), but nothing scheduled reviews. Every new phrase stayed `new`, `due_at` mirrored `created_at`, and “Due now” was empty. Self-talk needed a stable daily list, not a one-off prompt, and review should not ask the learner to re-grade stage every time.

## 검토한 선택지 (Options)
1. **Black-box model / embedding ranker** — reuse talk-phrase-suggest RAG for daily review. Flexible, but opaque and already reserved for in-session retrieval.
2. **Full SM-2 on every review, including stage** — the existing again/good/easy verdict also advanced Recognize → Use with help → Use on my own. Simple, but the learner re-grades stage on every card.
3. **Inspectable 1/3/7/30 ladder + frozen daily top-N** — rank the whole bank in app code, take N from the Phrases-per-day setting, freeze that list for the local calendar day. Stage is asked only at smart moments. An explicit `saylo-pin:YYYY-MM-DD` tag boosts tomorrow without only bumping the interval.

## 결정 (Decision)
**옵션 3.**

**Ranking (higher is more urgent):** overdue days, stage (recognize > use-with-help > use-on-my-own), never-reviewed age, days since last review/practice, last self-talk `used` event (recency decays), lapses, plus +1000 if pinned for that local date. Ties break by earlier `due_at`, then older `created_at`.

**Schedule:** never-reviewed recognize phrases are due now; practicing/ready get a first due of +3 / +7 days from `created_at`. A completed review walks 1 → 3 → 7 → 30 (`again` = 1 day). New phrases persist as `recognizing` (UI: Recognize).

**Daily refresh:** AsyncStorage `{ date, ids, count }`. Same local day returns the same ids unless the daily count changes. A new day reranks.

**Stage prompt:** not on every review. Ask after a successful Phrase Bank “used” retry, after 3 completed reviews since the last stage change, or when the next interval would jump to 7 days while still Recognize / 30 days while not yet Use on my own. The learner’s own judgment: Recognize / Use with help / Use on my own.

**Tomorrow pin:** write `saylo-pin:YYYY-MM-DD` on `phrase_items.tags`. Do not treat a due-date bump as the pin.

## 기각 이유 (판단의 증거)
1. A daily review queue must be explainable (“why these five”). RAG already owns in-session suggestion.
2. Mapping again/good/easy onto stage made “I remembered it today” look like “I can use this alone,” and the Phrase detail stage picker was already the honest place to set that.

## 결과 (Consequences)
- “Due now” becomes real after the app backfills `learning_status` + a first `due_at` on read. No new SQL Editor migration is required (`tags` and SRS columns already exist from 018).
- Today’s Talk hint sheet and Today’s “Bring these back” share the same frozen list.
- Revisit if learners pin most of the queue every day, or if never-reviewed recognize phrases crowd out older ready phrases for more than two weeks.
