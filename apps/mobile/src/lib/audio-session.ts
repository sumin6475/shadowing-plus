// audio-session.ts — one process-wide iOS AVAudioSession policy.
//
// Every app-owned player (phrase cloud voice, device TTS, segment, Library,
// Quick Rehearsal, and session replay) shares the same native audio session as
// the on-device speech recognizer. A delayed pause/finish from a player can
// otherwise deactivate the session under a just-started recognizer and surface
// as "Audio session was interrupted".
//
// Policy:
//   • Talk/STT entry stops app-owned playback, requests exclusive focus
//     (`doNotMix`), and hands the session to the recognizer with an explicit
//     nonmixing `playAndRecord` + `defaultToSpeaker` + `allowBluetooth`
//     category in `measurement` mode.
//   • Every playback path awaits `prepareSpeakerPlayback()` immediately before
//     playing so the output never falls back to the receiver.
//   • `keepAudioSessionActive: true` on players that outlive tab focus lets the
//     coordinator own the handoff instead of the OS racing a deactivation.
import { Platform } from "react-native";
import { setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";
import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
  type SetCategoryOptions,
} from "expo-speech-recognition";

export type PlaybackStopper = () => void | Promise<void>;

const stoppers = new Set<PlaybackStopper>();

// Privacy-safe dev diagnostics: transition labels only, never transcript,
// audio content, or route identity that could leak learner data.
function devLog(transition: string) {
  if (__DEV__) console.log(`[audio-session] ${transition}`);
}

/** Register a callback that pauses app-owned playback. Returns an unregister fn. */
export function registerPlaybackStopper(stopper: PlaybackStopper): () => void {
  stoppers.add(stopper);
  return () => {
    stoppers.delete(stopper);
  };
}

/** Stop every registered app-owned player before the recognizer takes over. */
export function stopRegisteredPlayback(): void {
  for (const stop of Array.from(stoppers)) {
    try {
      void stop();
    } catch {
      // Native player already released — nothing to stop.
    }
  }
}

// Explicit nonmixing category for speech recognition. `playAndRecord` is
// nonmixable by default (no `mixWithOthers`), so Apple Music/Spotify pause;
// `measurement` keeps input processing minimal for STT. This matches the
// module default but is passed explicitly so a future default change cannot
// silently reintroduce the interruption race.
export const RECOGNITION_IOS_CATEGORY: SetCategoryOptions = {
  category: AVAudioSessionCategory.playAndRecord,
  categoryOptions: [
    AVAudioSessionCategoryOptions.defaultToSpeaker,
    AVAudioSessionCategoryOptions.allowBluetooth,
  ],
  mode: AVAudioSessionMode.measurement,
};

// Complete playback policy. `allowsRecording: true` keeps the session in
// `playAndRecord` so the next STT start does not perform a category switch;
// `shouldRouteThroughEarpiece: false` defaults output to the speaker while a
// connected headset/Bluetooth route still wins (OS priority is preserved).
const PLAYBACK_MODE = {
  playsInSilentMode: true,
  interruptionMode: "doNotMix" as const,
  allowsRecording: true,
  shouldRouteThroughEarpiece: false,
  shouldPlayInBackground: false,
};

/**
 * Await this immediately before any phrase/segment/Library/Quick/Session
 * playback. On iOS it also restores `default` mode, because the recognizer
 * leaves the session in `measurement` mode which deliberately lowers output.
 */
export async function prepareSpeakerPlayback(): Promise<void> {
  devLog("prepare:speaker");
  if (Platform.OS === "ios") {
    try {
      ExpoSpeechRecognitionModule.setCategoryIOS({
        category: AVAudioSessionCategory.playAndRecord,
        categoryOptions: [
          AVAudioSessionCategoryOptions.defaultToSpeaker,
          AVAudioSessionCategoryOptions.allowBluetooth,
        ],
        mode: AVAudioSessionMode.default,
      });
    } catch {
      // Older development build without the native helper — expo-audio below
      // still routes to the speaker via shouldRouteThroughEarpiece:false.
    }
    await setAudioModeAsync(PLAYBACK_MODE);
    return;
  }
  await setAudioModeAsync({ playsInSilentMode: true, shouldRouteThroughEarpiece: false });
}

/**
 * Await this before starting speech recognition. Stops app-owned playback,
 * settles expo-audio into a playAndRecord-capable mode, and marks the shared
 * session active so a paused player cannot schedule a deactivation under STT.
 */
export async function prepareRecognitionSession(): Promise<void> {
  devLog("prepare:recognition");
  stopRegisteredPlayback();
  if (Platform.OS === "ios") {
    await setAudioModeAsync(PLAYBACK_MODE);
    try {
      await setIsAudioActiveAsync(true);
    } catch {
      // The recognizer's start() re-activates the shared session.
    }
    return;
  }
  await setAudioModeAsync({ playsInSilentMode: true });
}
