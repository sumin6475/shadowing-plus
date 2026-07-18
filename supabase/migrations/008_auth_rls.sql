-- ============================================================================
-- 008 — Multi-user auth + Row Level Security (Phase 1)
-- ============================================================================
-- Inverts 002_disable_rls.sql: RLS goes from OFF (single-user, anon key reads
-- everything) to ON with per-user policies. This is the "biggest construction
-- job" — read the whole file before running it.
--
-- ⚠️  DO NOT RUN THIS UNTIL ALL OF THE FOLLOWING ARE TRUE:
--   1. The session layer is DEPLOYED (proxy.ts, @supabase/ssr client split,
--      /login, /auth/callback) and you can actually log in. If RLS turns on
--      before sessions work, every query returns EMPTY (RLS filters silently,
--      it does not error) and the app goes blank for everyone.
--   2. You have signed up once (magic link) so your auth.users row exists, and
--      you have your user id. Get it from:
--         select id, email from auth.users order by created_at limit 5;
--   3. You have pasted that id into the OWNER_UID placeholder below.
--
-- This migration is NOT auto-reversible. Take a snapshot / accept a maintenance
-- window. The steps are ordered so existing rows are never orphaned:
--   add nullable column → backfill → NOT NULL → enable RLS → policies.
-- Enabling RLS before the backfill would strand every existing row (no policy
-- matches a NULL owner).
-- ============================================================================

DO $$
DECLARE
  -- >>> PASTE YOUR auth.users id HERE (the owner of all existing data) <<<
  owner_uid UUID := '6722364b-1570-4f5b-8dcd-b68c6ec15836';
BEGIN
  -- ---- 1. Add nullable user_id columns (FK to auth.users) -------------------
  ALTER TABLE folders      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE videos       ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE jobs         ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE bookmarks    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  -- segments has NO user_id column: it inherits ownership from its video via a
  -- traversal policy (see step 6). Service-key inserts it, so DEFAULT auth.uid()
  -- wouldn't fire there anyway.

  -- ---- 2. Backfill every existing row to the single existing owner ----------
  UPDATE folders      SET user_id = owner_uid WHERE user_id IS NULL;
  UPDATE videos       SET user_id = owner_uid WHERE user_id IS NULL;
  UPDATE jobs         SET user_id = owner_uid WHERE user_id IS NULL;
  UPDATE bookmarks    SET user_id = owner_uid WHERE user_id IS NULL;
  UPDATE usage_events SET user_id = owner_uid WHERE user_id IS NULL;
END $$;

-- ---- 3. NOT NULL + DEFAULT auth.uid() --------------------------------------
-- DEFAULT auth.uid() lets client-side inserts (folders, bookmarks) omit user_id
-- entirely — it's filled from the session, so the existing client code is
-- unchanged. It does NOT fire under the service key (no session), so videos /
-- jobs / usage_events are stamped explicitly in app code and get no default.
ALTER TABLE folders      ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE bookmarks    ALTER COLUMN user_id SET NOT NULL, ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE videos       ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE jobs         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE usage_events ALTER COLUMN user_id SET NOT NULL;

-- ---- 4. Indexes on the new owner columns -----------------------------------
CREATE INDEX IF NOT EXISTS idx_folders_user_id      ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_user_id       ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id         ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id    ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);

-- ---- 5. Enable + FORCE RLS on all six tables -------------------------------
-- FORCE so even the table owner is subject to policies (defense in depth).
ALTER TABLE folders      ENABLE ROW LEVEL SECURITY; ALTER TABLE folders      FORCE ROW LEVEL SECURITY;
ALTER TABLE videos       ENABLE ROW LEVEL SECURITY; ALTER TABLE videos       FORCE ROW LEVEL SECURITY;
ALTER TABLE jobs         ENABLE ROW LEVEL SECURITY; ALTER TABLE jobs         FORCE ROW LEVEL SECURITY;
ALTER TABLE bookmarks    ENABLE ROW LEVEL SECURITY; ALTER TABLE bookmarks    FORCE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY; ALTER TABLE usage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE segments     ENABLE ROW LEVEL SECURITY; ALTER TABLE segments     FORCE ROW LEVEL SECURITY;

-- ---- 6. Policies -----------------------------------------------------------
-- NOTE: the service-key client (SUPABASE_SERVICE_KEY) bypasses RLS entirely, so
-- the pipeline / API routes still work; their per-user scoping is enforced in
-- app code (explicit .eq("user_id", ...)). These policies govern the anon-key
-- browser client (the ~30 client .from() queries) and Realtime.

-- Direct-owner tables: the row's user_id must equal the session user.
CREATE POLICY folders_owner      ON folders      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY videos_owner       ON videos       FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY jobs_owner         ON jobs         FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY bookmarks_owner    ON bookmarks    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY usage_events_owner ON usage_events FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- segments: no own user_id — ownership traverses to the parent video.
CREATE POLICY segments_via_video ON segments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM videos v WHERE v.id = segments.video_id AND v.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM videos v WHERE v.id = segments.video_id AND v.user_id = auth.uid()
  ));

-- ---- 7. Realtime -----------------------------------------------------------
-- jobs is already in the supabase_realtime publication (migration 001/002).
-- With RLS on, Realtime honors these policies; the client also sets an explicit
-- filter=user_id=eq.<uid> (see web/src/app/page.tsx) as the belt-and-suspenders
-- guard. No publication change needed here.
