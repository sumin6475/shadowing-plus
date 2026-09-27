-- 029_situation_favorites.sql — user-flaggable favorites for Situations (stories).
--
-- Mirrors 021_favorites (videos, bookmarks) and 022 (phrase_items): same column
-- name, same partial-index shape. Purely additive — a boolean with a default, so
-- existing rows and the web app are unaffected. No new RLS is needed: the
-- existing owner policy (stories_owner, created by the DO loop in
-- 020_speaking_world.sql:93-103, FOR ALL USING user_id = auth.uid() WITH CHECK
-- the same) already covers UPDATE of these rows.
--
-- Run this once in the Supabase SQL Editor.

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Partial index: only favorited rows are indexed, so "my favorite situations"
-- stays cheap without bloating the index with the false-default majority.
CREATE INDEX IF NOT EXISTS idx_stories_favorite ON public.stories(user_id) WHERE is_favorite;
