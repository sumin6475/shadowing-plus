-- Folders gain an explicit color (OKLCH string stored as text).
-- Null is allowed; the UI falls back to a deterministic palette per folder id.
ALTER TABLE folders ADD COLUMN color TEXT;
