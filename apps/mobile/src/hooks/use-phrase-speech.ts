// Cloud AI pronunciation first; device TTS remains an offline/error fallback.
import { useCallback, useEffect, useRef, useState } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Speech from "expo-speech";

import { fetchPhraseSpeech } from "@/lib/phrase-speech";

const ENGLISH_LOCALE = "en-US";
type PendingAudio = { id: string; text: string; url: string; request: number };

export function usePhraseSpeech() {
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const player = useAudioPlayer(audioUrl, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const voiceRef = useRef<string | undefined>(undefined);
  const requestRef = useRef(0);
  const pendingRef = useRef<PendingAudio | null>(null);
  const modeRef = useRef<"cloud" | "device" | null>(null);
  const urlCache = useRef<Map<string, string>>(new Map());
  // Track the current player so the unmount cleanup can pause it without a
  // [player] dependency — that dep fires the cleanup on every source swap, and
  // expo-audio has already released the swapped-out native player by then.
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    let active = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!active) return;
        const english = voices.filter((voice) => voice.language.toLowerCase().startsWith("en"));
        const preferred =
          english.find((voice) => voice.language.toLowerCase() === "en-us" && voice.quality === Speech.VoiceQuality.Enhanced) ??
          english.find((voice) => voice.language.toLowerCase() === "en-us") ??
          english.find((voice) => voice.quality === Speech.VoiceQuality.Enhanced) ??
          english[0];
        voiceRef.current = preferred?.identifier;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Stop audio + speech when the hook unmounts. Empty deps = unmount-only, so we
  // never pause a player that expo-audio already tore down on a source change
  // (which throws "Unable to find the native shared object"). Guard anyway.
  useEffect(() => {
    return () => {
      requestRef.current += 1;
      pendingRef.current = null;
      try {
        playerRef.current.pause();
      } catch {
        // Native player already released — nothing to pause.
      }
      Speech.stop().catch(() => {});
    };
  }, []);

  const startCloud = useCallback(
    async (id: string, request: number) => {
      if (requestRef.current !== request) return;
      await player.seekTo(0).catch(() => {});
      if (requestRef.current !== request) return;
      modeRef.current = "cloud";
      setFallbackId(null);
      setLoadingId(null);
      setSpeakingId(id);
      try {
        player.play();
      } catch {
        // Player released between load and play — treat as a miss; the caller's
        // fallback/timeout paths still cover it.
      }
    },
    [player],
  );

  const startDeviceFallback = useCallback((id: string, text: string, request: number) => {
    if (requestRef.current !== request) return;
    modeRef.current = "device";
    setFallbackId(id);
    setLoadingId(null);
    setSpeakingId(id);
    const finish = () => {
      if (requestRef.current === request) {
        modeRef.current = null;
        setSpeakingId(null);
      }
    };
    Speech.speak(text, {
      language: ENGLISH_LOCALE,
      voice: voiceRef.current,
      rate: 0.9,
      pitch: 1,
      useApplicationAudioSession: true,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  }, []);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || pending.url !== audioUrl || requestRef.current !== pending.request) return;
    if (status.error) {
      pendingRef.current = null;
      startDeviceFallback(pending.id, pending.text, pending.request);
      return;
    }
    if (status.isLoaded) {
      pendingRef.current = null;
      startCloud(pending.id, pending.request);
    }
  }, [audioUrl, status.error, status.isLoaded, startCloud, startDeviceFallback]);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || pending.url !== audioUrl) return;
    const timeout = setTimeout(() => {
      if (pendingRef.current?.request !== pending.request) return;
      pendingRef.current = null;
      startDeviceFallback(pending.id, pending.text, pending.request);
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [audioUrl, startDeviceFallback]);

  useEffect(() => {
    if (status.didJustFinish && modeRef.current === "cloud") {
      modeRef.current = null;
      setSpeakingId(null);
    }
  }, [status.didJustFinish]);

  const stop = useCallback(async () => {
    requestRef.current += 1;
    pendingRef.current = null;
    modeRef.current = null;
    try {
      player.pause();
    } catch {
      // Native player already released — nothing to pause.
    }
    setLoadingId(null);
    setSpeakingId(null);
    setFallbackId(null);
    await Speech.stop().catch(() => {});
  }, [player]);

  const prepare = useCallback(async (id: string) => {
    if (!id) return;
    const request = requestRef.current;
    try {
      const cachedUrl = urlCache.current.get(id);
      const url = cachedUrl ?? (await fetchPhraseSpeech(id)).audioUrl;
      urlCache.current.set(id, url);
      // Loading the source now lets expo-audio download it before the user
      // taps, without starting playback or surfacing a fallback voice.
      if (requestRef.current === request && modeRef.current === null && pendingRef.current === null) {
        setAudioUrl(url);
      }
    } catch {
      // Preloading is an optimization. toggle() still retries and can use the
      // on-device voice if the cloud request is unavailable at tap time.
    }
  }, []);

  const toggle = useCallback(
    async (id: string, text: string) => {
      const phrase = text.trim();
      if (!phrase) return;
      if (speakingId === id || loadingId === id) {
        await stop();
        return;
      }

      await stop();
      const request = requestRef.current;
      setLoadingId(id);

      try {
        const cachedUrl = urlCache.current.get(id);
        const url = cachedUrl ?? (await fetchPhraseSpeech(id)).audioUrl;
        if (requestRef.current !== request) return;
        urlCache.current.set(id, url);
        if (url === audioUrl && status.isLoaded) {
          await startCloud(id, request);
        } else {
          pendingRef.current = { id, text: phrase, url, request };
          setAudioUrl(url);
        }
      } catch {
        startDeviceFallback(id, phrase, request);
      }
    },
    [audioUrl, loadingId, speakingId, startCloud, startDeviceFallback, status.isLoaded, stop],
  );

  return { speakingId, loadingId, fallbackId, prepare, toggle, stop };
}
