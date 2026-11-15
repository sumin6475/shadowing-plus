# Retire the old Studio tables

Status: step 1 in progress (branch `chore/remove-legacy-studio-reads`). Written 2026-11-14.

## What is being retired

The first Studio stored Topic → Situation → Speaking Note → key points. The
current Studio (since 031, 2026-10) stores plain `notes`. The old tables have
had no writes since 2026-09-13:

| Table | Meaning | Rows (2026-11-14) | Last write |
|---|---|---|---|
| `domains` | Topic | 10 (2 users) | 2026-09-02 |
| `stories` | Situation | 37 (2 users) | 2026-09-02 |
| `messages` | old Speaking Note | 6 | 2026-09-13 |
| `message_beats` | note key points | 12 | 2026-09-02 |
| `note_phrase_links` | phrase ↔ old note | 5 | 2026-09-13 |
| `phrase_story_links` | phrase ↔ Situation | 2 | — |

Not retired (current features use them): `notes`, `note_folders`, `note_facts`,
`note_sources`, `note_chat_turns`, `note_versions`, `talk_sessions`,
`phrase_events`, `talk_suggestion_feedback`, and `islands*` (web app).

## Steps

1. **Code stops reading them (this branch).** The old Studio screens had no
   entry point from any tab (also true in App Store build 41, `e8753b4`), so
   they are removed with their data modules. `lib/phrases.ts` no longer reads or
   writes `phrase_story_links`; `talk-phrase-suggest` no longer embeds it.
   Done when: merged, the edge function is redeployed, and a build carrying it
   is on TestFlight / the App Store.
2. **Old builds age out.** TestFlight builds expire 90 days after upload; the
   newest build without step 1 is 47, uploaded 2026-11-02 → expires
   2027-01-31. App Store builds never expire, but what they can still reach is
   tolerant: phrase editing reads `phrase_story_links` inside a `.catch`, and
   writes only when a Situation id is already present (live UI never sets one).
3. **Back up.** Before any lock or drop, dump the six tables:
   `supabase db dump --linked --data-only -s public` filtered to these tables,
   or `COPY (SELECT ...) TO STDOUT` per table, kept outside git.
4. **Lock, then watch.** `REVOKE ALL ON <six tables> FROM anon, authenticated;`
   Watch a few days (Supabase API logs for 401/permission errors on those
   paths, app reports). Undo: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO
   authenticated;`.
5. **Drop (migration 038).** Order matters — these still point at the old
   tables:
   - FKs from live tables: `talk_sessions.story_id`, `talk_sessions.message_id`,
     `phrase_events.story_id`, `talk_suggestion_feedback.story_id` → drop the
     constraints (keep or null the columns; app code passes null today).
   - Trigger `phrase_events_apply_story_link` on `phrase_events` (function
     `apply_phrase_event_to_story_link`) writes `phrase_story_links` → drop the
     trigger and function first, or every `phrase_events` insert with a
     `story_id` fails.
   - Triggers on the old tables themselves (`messages_validate_studio_scope`,
     `stories_sync_studio_topic`) go with them; drop their functions
     (`validate_speaking_note_scope`, `sync_situation_topic_to_notes`).
   - Then `DROP TABLE note_phrase_links, phrase_story_links, message_beats,
     messages, stories, domains;` and record the row in `supabase/APPLIED.md`.

## Open decision

The six old Speaking Notes were never copied into `notes` (031's copy is not in
the remote DB). Decide before step 5 whether to bring any of them into the
current Studio or let the backup be their only copy.
