# Saylo MVP — September 2026

Implemented from the user-provided September 16 MVP simplification plan and screen PDF. This supersedes the Topic / Situation / Speaking Note hierarchy for the mobile app.

## Everyday flow

- **Phrases** is the launch destination: save an expression, filter by Collected / Learning / Ready, search, and open its checklist. Each row shows three completion dots and independent pronunciation playback.
- **Phrase checklist:** listen at normal or 0.75 speed, play once or five times, open YouGlish, and save personal sentences. Check and uncheck each step independently. The third check requires a saved sentence. Removing the last sentence clears that check. Ready phrases are sorted by their most recent completion timestamp.
- **Studio:** one flat note per speaking situation, sorted by last edit. New notes start with an Opening / Body / Closing outline. Changes save after a short pause, serially; a user-scoped local draft supports recovery after a failed save. Leaving explicitly waits for saving.
- **Mirror:** the existing camera, live captions and bottom controls remain. Hints show recent Ready phrases and the selected note. The result has transcript, speaking duration, replay and return/repeat controls. No coaching or phrase-suggestion request runs.
- **Profile:** avatar entry, cumulative speaking time, seven-day chart, phrase counts, recent transcripts, and settings. Settings stays accessible when records fail to load.

## Persistence

`supabase/migrations/031_mvp_notes_and_phrase_progress.sql` is an additive expansion. It copies six existing messages with their IDs to `notes`, adds `phrase_examples`, three completion timestamps, and session `note_id` / `seconds`. Forced owner RLS and cross-owner-link guards are included. Legacy tables remain intact. Applied to the linked database with explicit user approval on September 16; existing migration history was not reconciled or replayed.

Speech recognition and recording files remain on device. Transcripts and durations use the existing authenticated Supabase connection. Failed session saves can retry with the same UUID to avoid duplicates.

## Verification

- `npm run validate`: release configuration, TypeScript, lint baseline, iOS JS export.
- `npm run test:mvp`: timestamp-state and duration regressions.
- `tests/mvp-schema.test.mjs`: isolated PGlite/PostgreSQL migration verification; point `MVP_PGLITE_MODULE` at a scratch installation of `@electric-sql/pglite`.
- Local engineering and validation records live in the Git-ignored root `docs/journal/`.

Legacy hierarchy and coaching modules remain for compatibility, but the new primary navigation does not expose them. TestFlight upload is a separate release action.
