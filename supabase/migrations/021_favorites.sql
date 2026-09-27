-- 021_favorites.sql — user-flaggable favorites for clips and saved phrases.
--
-- Purely additive: a boolean column with a default, so existing rows and the
-- web app are unaffected (web simply ignores the column). No new RLS is needed —
-- the existing owner policies (videos_owner, bookmarks_owner in 008_auth_rls,
-- both FOR ALL USING user_id = auth.uid()) already cover UPDATE of these rows.
--
-- Run this once in the Supabase SQL Editor.

ALTER TABLE videos    ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Partial indexes: only favorited rows are indexed, so "my favorites" stays
-- cheap without bloating the index with the false-default majority.
CREATE INDEX IF NOT EXISTS idx_videos_favorite    ON videos(user_id)    WHERE is_favorite;
CREATE INDEX IF NOT EXISTS idx_bookmarks_favorite ON bookmarks(user_id) WHERE is_favorite;
