// use-segment-player.ts — play just one transcript segment ("Hear this phrase").
// Loads the clip's signed audio (via /api/media, cached per clip), seeks to the
// segment start, plays, and auto-pauses at the segment end. One player instance
// per screen; `toggle` on the currently-playing id stops it.
import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { prepareSpeakerPlayback, registerPlaybackStopper } from "@/lib/audio-session";
import { fetchClipMedia, isPlayableUrl } from "@/lib/library";

export interface PlayableSegment {
  id: string;
  videoId: string | null;
  start: number;
  end: number;
}

export function useSegmentPlayer() {
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const player = useAudioPlayer(audioUrl, { keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const pending = useRef<PlayableSegment | null>(null);
  const endRef = useRef<number | null>(null);
  const cache = useRef<Map<string, string>>(new Map());
  // Keep the latest player identity without re-registering the coordinator
  // stopper on every source swap (which can release the old native player).
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    return registerPlaybackStopper(() => {
      try {
        playerRef.current.pause();
      } catch {
        // Native player already released — nothing to pause.
      }
    });
  }, []);

  const startAt = useCallback(
    async (seg: PlayableSegment) => {
      endRef.current = seg.end > seg.start ? seg.end : seg.start + 4;
      await prepareSpeakerPlayback();
      player.seekTo(seg.start).catch(() => {});
      player.play();
      setCurrentId(seg.id);
    },
    [player],
  );

  // Fulfil a pending play once the (new) source has loaded.
  useEffect(() => {
    const seg = pending.current;
    if (seg && status.isLoaded && status.duration > 0) {
      pending.current = null;
      startAt(seg);
    }
  }, [status.isLoaded, status.duration, startAt]);

  // Auto-stop at the segment's end.
  useEffect(() => {
    if (currentId && endRef.current != null && status.playing && status.currentTime >= endRef.current) {
      player.pause();
      setCurrentId(null);
    }
  }, [status.currentTime, status.playing, currentId, player]);

  const stop = useCallback(() => {
    player.pause();
    setCurrentId(null);
    pending.current = null;
  }, [player]);

  const toggle = useCallback(
    async (seg: PlayableSegment) => {
      if (currentId === seg.id) {
        stop();
        return;
      }
      if (!seg.videoId) return;

      const cached = cache.current.get(seg.videoId);
      // Same clip already loaded → seek + play immediately.
      if (cached && cached === audioUrl && status.isLoaded) {
        startAt(seg);
        return;
      }

      setLoadingId(seg.id);
      try {
        let url = cached ?? null;
        if (!url) {
          const media = await fetchClipMedia(seg.videoId);
          if (!isPlayableUrl(media.audioUrl)) return;
          url = media.audioUrl;
          cache.current.set(seg.videoId, url);
        }
        if (url === audioUrl && status.isLoaded) {
          startAt(seg);
        } else {
          pending.current = seg; // effect plays once loaded
          setAudioUrl(url);
        }
      } catch {
        // ignore — Hear is best-effort
      } finally {
        setLoadingId(null);
      }
    },
    [currentId, audioUrl, status.isLoaded, startAt, stop],
  );

  return { currentId, loadingId, playing: status.playing, toggle, stop };
}
