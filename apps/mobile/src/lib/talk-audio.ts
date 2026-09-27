// talk-audio.ts — local storage for self-talk recordings (Phase 1, on-device
// only; see docs/audio-recording-plan.md). The speech recognizer persists the
// audio to a cache file (recordingOptions.persist); we move it into the durable
// document dir as `speak/{sessionId}.wav` and point talk_sessions.audio_key at
// that RELATIVE name (the absolute container path changes across reinstalls, so
// we resolve against Paths.document at read time). Nothing is uploaded.
import { Directory, File, Paths } from "expo-file-system";

import { supabase } from "./supabase";

const SPEAK_DIR = "speak";

/**
 * Move the recorded cache WAV into the document dir and record it on the
 * session. Returns the stored relative key. Best-effort: throws on failure so
 * the caller can decide (a failed save just means no playback for that session).
 */
export async function saveTalkSessionAudio(sessionId: string, cacheUri: string): Promise<string> {
  const dir = new Directory(Paths.document, SPEAK_DIR);
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${sessionId}.wav`);
  if (dest.exists) dest.delete();
  const src = new File(cacheUri);
  await src.move(dest);

  const key = `${SPEAK_DIR}/${sessionId}.wav`;
  const { error } = await supabase
    .from("talk_sessions")
    .update({ audio_key: key, audio_content_type: "audio/wav" })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  return key;
}

/** Resolve a session's audio_key to a playable local file uri, or null if the
 *  recording isn't on this device (never recorded here, deleted, or evicted). */
export function talkAudioUri(audioKey: string | null | undefined): string | null {
  if (!audioKey) return null;
  try {
    const f = new File(Paths.document, audioKey);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
}

/** Delete a session's local recording and clear its audio_key. */
export async function deleteTalkSessionAudio(sessionId: string, audioKey: string | null | undefined): Promise<void> {
  if (audioKey) {
    try {
      const f = new File(Paths.document, audioKey);
      if (f.exists) f.delete();
    } catch {
      // file already gone; still clear the column below
    }
  }
  const { error } = await supabase
    .from("talk_sessions")
    .update({ audio_key: null, audio_content_type: null })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}
