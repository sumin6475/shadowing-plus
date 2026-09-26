-- Remove the sessions the mirror timer inflated.
--
-- Until 2026-09-20 the timer counted every second the recognizer ran, so a
-- mirror left open in silence saved long sessions with nothing in them
-- (postmortem: apps/mobile/docs/journal/postmortems/
-- 2026-09-20-mirror-timer-counted-screen-time.md). The code is fixed; these
-- are the rows it already wrote.
--
-- Run the steps IN ORDER in the Supabase SQL Editor, reading each result
-- before moving on. Step 3 deletes; step 2 keeps a copy so it is reversible.
--
-- What counts as "empty and too long":
--   * no transcript (null or blank), AND
--   * no recording either (audio_key is null — a session with audio is not
--     empty, even with no transcript), AND
--   * seconds >= 600 (10 minutes). Change 600 everywhere if step 1 suggests
--     a different line.

-- ── Step 1. Look first ─────────────────────────────────────────────────────
-- 1a. How the empty sessions are spread by length — pick the cut here.
SELECT CASE
         WHEN seconds < 60 THEN '< 1 min'
         WHEN seconds < 300 THEN '1-5 min'
         WHEN seconds < 600 THEN '5-10 min'
         ELSE '10 min +'
       END AS length,
       count(*) AS sessions,
       sum(seconds) AS seconds_total
FROM public.talk_sessions
WHERE coalesce(btrim(transcript), '') = ''
  AND audio_key IS NULL
GROUP BY 1
ORDER BY 1;

-- 1b. Exactly the rows step 3 would delete.
SELECT id, created_at, seconds, note_id, story_id
FROM public.talk_sessions
WHERE coalesce(btrim(transcript), '') = ''
  AND audio_key IS NULL
  AND seconds >= 600
ORDER BY created_at DESC;

-- ── Step 2. Keep a copy (private schema: not exposed through the API) ──────
CREATE SCHEMA IF NOT EXISTS maintenance;
CREATE TABLE IF NOT EXISTS maintenance.talk_sessions_removed_20260920 AS
SELECT * FROM public.talk_sessions
WHERE coalesce(btrim(transcript), '') = ''
  AND audio_key IS NULL
  AND seconds >= 600;
SELECT count(*) AS backed_up FROM maintenance.talk_sessions_removed_20260920;

-- ── Step 3. Delete ─────────────────────────────────────────────────────────
WITH removed AS (
  DELETE FROM public.talk_sessions
  WHERE coalesce(btrim(transcript), '') = ''
    AND audio_key IS NULL
    AND seconds >= 600
  RETURNING id
)
SELECT count(*) AS deleted FROM removed;

-- ── Step 4. Check the new totals (should match Profile after a refresh) ────
SELECT count(*) AS sessions,
       sum(seconds) AS seconds_total,
       round(sum(seconds) / 3600.0, 1) AS hours_total
FROM public.talk_sessions;

-- ── Undo, if the numbers look wrong ────────────────────────────────────────
-- INSERT INTO public.talk_sessions
-- SELECT * FROM maintenance.talk_sessions_removed_20260920;
--
-- Once you are happy, the copy can go:
-- DROP TABLE maintenance.talk_sessions_removed_20260920;
