import { extensionForMime } from "./mic-mime";

export const RECORDING_MAX_BYTES = 50 * 1024 * 1024;
export const RECORDING_MAX_DURATION_SEC = 45 * 60;
export const RECORDING_MAX_PER_VIDEO = 40;

const MIME_BASES = new Set(["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"]);

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Strip codecs; reject anything outside the recorder allowlist. */
export function normalizeRecordingMime(raw: string): string | null {
  const base = raw.split(";")[0].trim().toLowerCase();
  return MIME_BASES.has(base) ? base : null;
}

export function recordingR2Key(
  userId: string,
  videoId: string,
  recordingId: string,
  mime: string,
): string {
  const ext = extensionForMime(mime);
  return `recordings/${userId}/${videoId}/${recordingId}.${ext}`;
}
