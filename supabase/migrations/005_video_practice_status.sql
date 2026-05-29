-- migration 005: per-clip practice status (none | focusing | done)
--
-- Adds a discrete practice state to every video so the library can surface
-- a "Focusing" / "Completed" filter and the clip page can show a status pill.
-- Default 'none' backfills cleanly; CHECK keeps the column to a known vocab.

alter table public.videos
  add column if not exists practice_status text not null default 'none'
    check (practice_status in ('none', 'focusing', 'done'));
