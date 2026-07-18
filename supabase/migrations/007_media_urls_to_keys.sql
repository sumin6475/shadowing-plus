-- Data backfill for the R2-privacy change (Phase 0).
--
-- Before this change, videos.audio_url / video_url stored a permanent, public,
-- world-readable R2 URL (https://<R2_PUBLIC_URL>/<key>). Playback now resolves a
-- bare R2 KEY into a short-lived signed URL at read time (see
-- web/src/app/api/media/[videoId]/route.ts), so existing rows must be converted
-- from "full public URL" to "bare key" or old clips will 404.
--
-- This strips the public-host prefix, leaving the object key. YouTube / external
-- rows (youtube://… or https://www.youtube.com/…) are left untouched — they are
-- not R2 keys and are still passed through verbatim at read time.
--
-- ⚠️ BEFORE RUNNING: replace the placeholder below with your actual R2 public
-- host from web/.env.local's R2_PUBLIC_URL, including the trailing slash and NO
-- trailing slash duplication. Example: 'https://pub-abc123.r2.dev/'.
-- Idempotent: rows already converted to bare keys don't start with the prefix,
-- so re-running is a no-op.

DO $$
DECLARE
  -- >>> EDIT THIS to your R2_PUBLIC_URL value, with a trailing slash <<<
  base TEXT := 'https://pub-xxxxx.r2.dev/';
BEGIN
  UPDATE videos
     SET audio_url = substring(audio_url FROM length(base) + 1)
   WHERE audio_url LIKE base || '%';

  UPDATE videos
     SET video_url = substring(video_url FROM length(base) + 1)
   WHERE video_url LIKE base || '%';
END $$;
