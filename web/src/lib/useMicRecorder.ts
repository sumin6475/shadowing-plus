"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickRecorderMime } from "./mic-mime";

export type MicTake = {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
};

function recorderErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Microphone access was denied.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone found.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Couldn't open the microphone.";
  }
  return "Couldn't start recording.";
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

export function useMicRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef("audio/webm");
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const stopWaiterRef = useRef<((take: MicTake | null) => void) | null>(null);
  const startingRef = useRef(false);

  const clearTick = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const release = useCallback(() => {
    clearTick();
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    stopTracks(streamRef.current);
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsedMs(0);
    setBusy(false);
  }, []);

  useEffect(() => () => release(), [release]);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't record audio.");
      return;
    }
    if (recorderRef.current || startingRef.current) return;
    startingRef.current = true;
    setError(null);
    setBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const picked =
        typeof MediaRecorder.isTypeSupported === "function"
          ? pickRecorderMime((t) => MediaRecorder.isTypeSupported(t))
          : null;
      const recorder = picked
        ? new MediaRecorder(stream, { mimeType: picked })
        : new MediaRecorder(stream);
      mimeRef.current = recorder.mimeType || picked || "audio/webm";
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onerror = () => {
        setError("Recording failed.");
        const waiter = stopWaiterRef.current;
        stopWaiterRef.current = null;
        waiter?.(null);
        release();
      };
      recorder.onstop = () => {
        const mime = mimeRef.current;
        const blob = new Blob(chunksRef.current, { type: mime });
        const durationSeconds = Math.max(
          0,
          (Date.now() - startedAtRef.current) / 1000,
        );
        stopTracks(streamRef.current);
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        clearTick();
        setIsRecording(false);
        setBusy(false);
        const waiter = stopWaiterRef.current;
        stopWaiterRef.current = null;
        waiter?.(blob.size > 0 ? { blob, mimeType: mime, durationSeconds } : null);
      };
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
      try {
        recorder.start(250);
      } catch {
        recorder.start();
      }
      setIsRecording(true);
    } catch (err) {
      stopTracks(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
      setError(recorderErrorMessage(err));
    } finally {
      startingRef.current = false;
      setBusy(false);
    }
  }, [release]);

  const stop = useCallback((): Promise<MicTake | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(null);
    }
    setBusy(true);
    return new Promise((resolve) => {
      stopWaiterRef.current = resolve;
      try {
        if (recorder.state === "recording") recorder.requestData?.();
        recorder.stop();
      } catch {
        stopWaiterRef.current = null;
        release();
        resolve(null);
      }
    });
  }, [release]);

  return { isRecording, elapsedMs, busy, error, setError, start, stop };
}
