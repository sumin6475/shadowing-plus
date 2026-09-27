/**
 * Pick a MediaRecorder MIME the current browser actually supports.
 * Safari records `audio/mp4`; Chromium records `audio/webm;codecs=opus`.
 * Order matters: Chrome typically rejects mp4, Safari rejects webm.
 */
const CANDIDATES = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
] as const;

export function pickRecorderMime(
  isTypeSupported: (type: string) => boolean,
): string | null {
  for (const candidate of CANDIDATES) {
    try {
      if (isTypeSupported(candidate)) return candidate;
    } catch {
      // Some engines throw on unknown codec strings.
    }
  }
  return null;
}

export function extensionForMime(mime: string): "m4a" | "ogg" | "mp3" | "webm" {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4") return "m4a";
  if (base === "audio/ogg") return "ogg";
  if (base === "audio/mpeg") return "mp3";
  return "webm";
}
