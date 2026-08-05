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
  // finalRef mirrors finalText so stop() can read it synchronously.
  const finalRef = useRef("");

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));

  useSpeechRecognitionEvent("result", (event) => {
    const seg = event.results?.[0]?.transcript ?? "";
    if (event.isFinal) {
      finalRef.current = [finalRef.current, seg].filter(Boolean).join(" ").trim();
      setFinalText(finalRef.current);
      setInterim("");
    } else {
      setInterim(seg);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setError(event.message || event.error || "Speech recognition failed.");
    setRecognizing(false);
  });

  const reset = useCallback(() => {
    finalRef.current = "";
    setFinalText("");
    setInterim("");
    setError(null);
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
    return finalRef.current;
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

  return { recognizing, transcript, finalTranscript: finalText, error, start, stop, reset };
}
