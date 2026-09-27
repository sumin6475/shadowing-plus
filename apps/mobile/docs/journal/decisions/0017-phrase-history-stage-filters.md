# ADR 0017 — Phrase History filters match stage language

- **날짜**: 2026-08-23
- **스텝**: Home / Phrases / studio cleanup
- **상태**: accepted

## 맥락 (Context)
History chips were All, Favorites, Due now, New, Recognizing, Practicing, Ready to use, Needs refresh. Those labels overlapped three different facts: `learning_status` (recognizing / practicing / ready), a never-reviewed “New” subset of recognizing, and a due overlay (`due_at` / display status “Needs refresh”). Phrase detail already asks Recognize / Use with help / Use on my own.

## 검토한 선택지 (Options)
1. **Keep five stage-ish chips** — New + Recognizing + Practicing + Ready + Needs refresh. Familiar, but New is only `recognizing && !lastReviewedAt`, and Ready vs Needs refresh split one stage.
2. **Stages only (three chips)** — drop due entirely. Clean, but due is a real overlay that Recognize/Help/Own cannot express (`phraseIsDue` is `due_at <= now` at any stage).
3. **Three stage chips + one due overlay** — Recognize (includes never-reviewed / `new`), Use with help, Use on my own, Need refresh (`phraseIsDue`). Drop Favorites as a chip (swipe-to-star remains).

## 결정 (Decision)
**옵션 3**, then a small reopen: History chips are All, **Starred** (star icon, `phrase.favorite`, same as swipe-star), Recognize, Use with help, Use on my own, Need refresh. New stays deleted. Starred is a bookmark overlay, not a learning stage.

## 기각 이유 (판단의 증거)
1. Five overlapping chips made “where is this phrase?” depend on whether you thought in stage language or due language.
2. Dropping Need refresh would hide due practicing/ready items inside Use with help / Use on my own with no way to see “refresh today.”

## 결과 (Consequences)
- Badge copy follows the same stage language. Swipe-to-favorite is unchanged.
- **2026-08-23 revisit:** a star-only **Starred** chip was added after All (`phrase.favorite`). Need refresh remains the due overlay.

- Revisit if Need refresh (all due) feels too wide compared with display-status-only “Needs refresh” (practicing/ready due).
