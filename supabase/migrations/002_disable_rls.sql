-- Hotfix: RLS got auto-enabled despite the migration 004's DISABLE statements
-- (Supabase project default re-enables RLS on new tables). Force it off so
-- the anon key can read/write directly, matching the rest of the app's design.

ALTER TABLE folders   DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos    DISABLE ROW LEVEL SECURITY;
ALTER TABLE segments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs      DISABLE ROW LEVEL SECURITY;

-- Ensure the realtime publication includes jobs (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE jobs';
  END IF;
END $$;
