-- ============================================================================
-- 030 — phrase_items.meaning_ko -> meaning (EXPAND half)
-- ============================================================================
-- `meaning_ko` holds the learner-language gloss of a saved English phrase. The
-- app is N:1 (many learner languages : English), so since ADR 0022 that column
-- has held Korean, Traditional Chinese, Japanese, Spanish or Russian depending
-- on the learner. The `_ko` suffix is now a lie; the column becomes `meaning`.
--
-- This is the EXPAND half of expand / migrate / contract. A plain
-- `ALTER TABLE ... RENAME COLUMN` is NOT backward compatible and would break
-- two live clients:
--   1. web auto-deploys on push to main, so the old bundle is still served for
--      a window after the schema changes;
--   2. TestFlight builds ALREADY INSTALLED on testers' phones cannot be updated
--      in lockstep with a migration and keep selecting `meaning_ko` for as long
--      as a tester keeps that build. PostgREST would answer 42703 and the
--      phrase list would render empty.
-- So both columns exist and stay in sync in BOTH directions: an old client
-- reading or writing `meaning_ko` and a new client reading or writing `meaning`
-- both see consistent data.
--
-- CONTRACT (later, separate migration): `031_phrase_meaning_contract.sql` drops
-- the trigger `phrase_items_sync_meaning`, the function
-- `public.sync_phrase_meaning_columns()`, and the column `meaning_ko`. Do NOT
-- run it until no build that selects `meaning_ko` is still in the wild — that
-- means the web prod bundle is on `meaning` AND every TestFlight build that
-- predates the switch has expired or been superseded.
--
-- Purely additive otherwise: no index, constraint, view or generated column
-- referenced `meaning_ko` (grep of supabase/migrations confirms 016 declared it
-- and nothing else touched it), so there is nothing to mirror for `meaning`.
-- No new RLS either — the existing `phrase_items_owner` policy (016, FOR ALL
-- USING user_id = auth.uid()) already covers these rows.
--
-- Run this once in the Supabase SQL Editor. Take a backup snapshot first: it
-- backfills data.
-- ============================================================================

-- One transaction, all or nothing. Two reasons, both about silent damage rather
-- than loud failure:
--   1. Without it there is a window between the backfill and CREATE TRIGGER in
--      which an old client writing `meaning_ko` leaves that row's `meaning`
--      stale forever — nothing afterwards would ever reconcile it.
--   2. A partial run (column added, backfill or trigger missing) would let the
--      Edge Functions, which read `meaning`, embed phrases without their gloss.
--      That corrupts vectors quietly instead of erroring.
BEGIN;

-- Same type and nullability as meaning_ko in 016_phrase_bank.sql: plain
-- nullable TEXT, no length CHECK (only `text` is length-checked there).
ALTER TABLE public.phrase_items
  ADD COLUMN IF NOT EXISTS meaning TEXT;

-- Backfill. Guarded by `meaning IS NULL` so re-running is safe and so a value
-- already written through the new name is never clobbered by the old column.
UPDATE public.phrase_items
SET meaning = meaning_ko
WHERE meaning IS NULL;

-- ----------------------------------------------------------------------------
-- Two-way sync
-- ----------------------------------------------------------------------------
-- Invariant this enforces: after every statement,
--   meaning IS NOT DISTINCT FROM meaning_ko.
--
-- THE RULES, and why — this is the part a reader will question:
--
-- UPDATE, exactly one column changed: mirror the changed one into the other.
--   The test is `IS DISTINCT FROM OLD`, deliberately NOT `IS NOT NULL`. A
--   learner clearing their gloss sends meaning = NULL; that is a real change
--   and must propagate, so meaning_ko becomes NULL too. A COALESCE-style
--   implementation would silently resurrect the old text here — that is the
--   bug this shape exists to avoid.
--
-- UPDATE, BOTH columns changed to different values in one statement: `meaning`
--   wins. A BEFORE trigger cannot tell an omitted column from one explicitly
--   re-set to its current value, so a deterministic winner is required rather
--   than guessable. `meaning` is the migration target and the only name new
--   code writes on purpose; a statement that sets both to *different* values
--   can only come from a confused client, and the new name is the one we want
--   to believe. (Both changed to the SAME value — the common case while the
--   repo is mid-migrate and a writer sends both — needs no arbitration.)
--
-- UPDATE, neither changed: no-op.
--
-- INSERT: whichever column is non-NULL fills the other; if both are non-NULL,
--   `meaning` wins, same reason as above. On INSERT there is no OLD, so an
--   explicit NULL is indistinguishable from an omitted column — which is
--   harmless, because a client that sends NULL for one name while filling the
--   other is exactly a client that does not know that name.
CREATE OR REPLACE FUNCTION public.sync_phrase_meaning_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.meaning IS NOT NULL THEN
      NEW.meaning_ko := NEW.meaning;          -- new client, or both sent
    ELSIF NEW.meaning_ko IS NOT NULL THEN
      NEW.meaning := NEW.meaning_ko;          -- old client
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.meaning IS DISTINCT FROM OLD.meaning THEN
    NEW.meaning_ko := NEW.meaning;            -- new client wrote; also wins ties
  ELSIF NEW.meaning_ko IS DISTINCT FROM OLD.meaning_ko THEN
    NEW.meaning := NEW.meaning_ko;            -- old client wrote
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_phrase_meaning_columns() FROM PUBLIC;

-- `UPDATE OF` narrows firing to statements that list one of the two columns.
-- Safe: a statement that lists neither cannot change either, so the no-op
-- branch would have applied anyway.
DROP TRIGGER IF EXISTS phrase_items_sync_meaning ON public.phrase_items;
CREATE TRIGGER phrase_items_sync_meaning
  BEFORE INSERT OR UPDATE OF meaning, meaning_ko
  ON public.phrase_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_phrase_meaning_columns();

COMMENT ON COLUMN public.phrase_items.meaning IS
  'Learner-language gloss of the phrase. Canonical name; language varies per learner (ADR 0022).';
COMMENT ON COLUMN public.phrase_items.meaning_ko IS
  'DEPRECATED misnomer for meaning. Kept in sync by phrase_items_sync_meaning for old web/TestFlight builds; dropped in 031_phrase_meaning_contract.';

COMMIT;
