// iOS uses one process-wide AVAudioSession for both speech recognition and
// playback. Keep the recognizer's playAndRecord category, but switch its mode
// from measurement (good for STT, deliberately quiet for playback) to default
// and explicitly prefer the built-in speaker before replaying a self-talk WAV.
// The next recognition start restores measurement mode itself.
import { Platform } from "react-native";
import { setAudioModeAsync } from "expo-audio";
import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";

export async function prepareTalkRecordingPlayback(): Promise<void> {
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
      // Keep the same category and route through expo-audio if the recognizer's
      // native session helper is unavailable in an older development build.
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldRouteThroughEarpiece: false,
      });
    }
    return;
  }

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
  });
}
