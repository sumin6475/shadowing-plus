// use-speech-session.ts — on-device iOS speech recognition for a Speak session.
// Wraps expo-speech-recognition (SFSpeechRecognizer). Continuous mode streams
// result events; we commit finalized segments and keep the current interim so
// the UI can show live words and, on stop, hand back the whole transcript.
//
// ADR 0003: on-device (requiresOnDeviceRecognition) — no server, no secrets.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export interface SpeechSession {
  /** True between a successful start() and the end/error event. */
  recognizing: boolean;
  /** Committed finals + the live interim, for display. */
  transcript: string;
  /** Only the committed finals — the value to persist on stop. */
  finalTranscript: string;
  /** Last error message, if recognition failed. */
  error: string | null;
  /** Local file uri of the recorded audio, set after stop (recordingOptions
   *  persist writes a WAV to the cache dir). Null until `audioend` fires. */
  audioUri: string | null;
  /** Request permission and begin. Resolves false if permission was denied. */
  start: (opts?: { lang?: string; onDevice?: boolean }) => Promise<boolean>;
  /** Stop recognition. Returns the committed final transcript. */
  stop: () => string;
  /** Clear transcript + error before a fresh run. */
  reset: () => void;
}

export function useSpeechSession(): SpeechSession {
  const [recognizing, setRecognizing] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  // finalRef mirrors finalText so stop() can read it synchronously; interimRef
  // mirrors the live interim so stop() can flush the last uncommitted words too.
  const finalRef = useRef("");
  const interimRef = useRef("");

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  // Fires after stop when recordingOptions.persist is on — the saved WAV's uri.
  useSpeechRecognitionEvent("audioend", (event) => setAudioUri(event.uri ?? null));

  useSpeechRecognitionEvent("result", (event) => {
    const seg = event.results?.[0]?.transcript ?? "";
    if (event.isFinal) {
      finalRef.current = [finalRef.current, seg].filter(Boolean).join(" ").trim();
      setFinalText(finalRef.current);
      interimRef.current = "";
      setInterim("");
    } else {
      interimRef.current = seg;
      setInterim(seg);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setError(event.message || event.error || "Speech recognition failed.");
    setRecognizing(false);
  });

  const reset = useCallback(() => {
    finalRef.current = "";
    interimRef.current = "";
    setFinalText("");
    setInterim("");
    setError(null);
    setAudioUri(null);
  }, []);

  const start = useCallback<SpeechSession["start"]>(async (opts) => {
    reset();
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone / speech permission was not granted.");
        return false;
      }
      ExpoSpeechRecognitionModule.start({
        lang: opts?.lang ?? "en-US",
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: opts?.onDevice ?? true,
        addsPunctuation: true,
        // Persist the audio so the learner can replay their self-talk. IMPORTANT:
        // pin the output to 16 kHz mono int16 WAV — the on-device recognizer runs
        // at 16 kHz, and letting persist drive the audio engine at the default
        // 44.1/48 kHz silently breaks recognition (empty transcript). Small file
        // too (~1.9 MB/min); stored on-device.
        recordingOptions: { persist: true, outputSampleRate: 16000, outputEncoding: "pcmFormatInt16" },
      });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start speech recognition.");
      setRecognizing(false);
      return false;
    }
  }, [reset]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // stop after an error/end is a no-op; ignore.
    }
    // Include the last interim: on-device continuous recognition often commits
    // only one early isFinal segment and keeps the rest as a growing interim, so
    // returning finalRef alone would drop everything after the first few words.
    // In continuous mode interim resets after each isFinal, so there's no overlap.
    return [finalRef.current, interimRef.current].filter(Boolean).join(" ").trim();
  }, []);

  // Stop recognition when the consuming screen unmounts — and ONLY then. This
  // lives in the hook (empty deps) rather than the screen: a screen-side effect
  // keyed on the returned object would re-run every render (the object is new
  // each time) and stop() mid-session, which iOS reports as "Audio session was
  // interrupted".
  useEffect(() => {
    return () => {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // already stopped; ignore.
      }
    };
  }, []);

  const transcript = [finalText, interim].filter(Boolean).join(" ").trim();

  return { recognizing, transcript, finalTranscript: finalText, error, audioUri, start, stop, reset };
}
