# ADR 0018 — Your speaking world is a studio dashboard

- **날짜**: 2026-08-23
- **스텝**: Home / Phrases / studio cleanup
- **상태**: accepted

## 맥락 (Context)
Profile’s “Your speaking world” banner jumped to the Topics/islands map. That map is a place to pick what to say, not a record of speaking. The learner asked for a studio: big numbers, card stacks, optional charts — on Saylo’s light cobalt editorial, not a dark Pomodoro clone.

## 검토한 선택지 (Options)
1. **Keep the banner → Topics map** — zero new surface, but the name promised a world and delivered an empty-ish map of seeded shells.
2. **Replace the Topics tab with the dashboard** — one home for the world, but the map is still how you enter a story.
3. **New pushed studio screen from Profile; map stays secondary** — dashboard is the Profile landing; Topic map remains the Topics tab and a secondary card on the studio.

## 결정 (Decision)
**옵션 3.** Studio metrics:

- **Total speaking time** — sum of `talk_sessions.duration_seconds` (hero).
- **Active topics / stories** — domains and stories that have messages or at least one talk, not empty seeded shells.
- **Phrase insights** — counts by Recognize / Use with help / Use on my own, Need refresh (`phraseIsDue`), bank size, small bars. Optional donut of time by topic; last-seven-day rings from session dates.

## 기각 이유 (판단의 증거)
1. The map does not show time or phrase progress, so the banner was a false landing.
2. Replacing the Topics tab would hide the map behind the dashboard and break the bottom-bar “pick a story” path.

## 결과 (Consequences)
- Profile photo lives in `storage.avatars` + `user_metadata.avatar_url` (migration `026_avatars_bucket.sql`).
- Revisit if active-story rules should also count beats-only stories, or if speaking time should exclude sessions under a few seconds.
