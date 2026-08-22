"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RECORDING_MAX_BYTES,
  normalizeRecordingMime,
} from "./recordings";
import type { MicTake } from "./useMicRecorder";

export type PracticeRecording = {
  id: string;
  duration_seconds: number;
  bytes: number;
  content_type: string;
  created_at: string;
  url: string;
};

export function usePracticeRecordings(videoId: string) {
  const [items, setItems] = useState<PracticeRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setPlayingId(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!videoId) return;
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/recordings`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        typeof body.error === "string"
          ? body.error
          : "Couldn't load recordings.",
      );
    }
    const data = (await res.json()) as { recordings?: PracticeRecording[] };
    setItems(data.recordings ?? []);
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load recordings.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      stopPlayback();
    };
  }, [refresh, stopPlayback]);

  const upload = useCallback(
    async (take: MicTake): Promise<boolean> => {
      setError(null);
      const contentType =
        normalizeRecordingMime(take.mimeType) ??
        normalizeRecordingMime(take.blob.type);
      if (!contentType) {
        setError("This recording format can't be saved.");
        return false;
      }
      if (take.blob.size > RECORDING_MAX_BYTES) {
        setError("That recording is too large to save.");
        return false;
      }
      if (take.blob.size === 0) {
        setError("Nothing was captured.");
        return false;
      }
      setSaving(true);
      let createdId: string | null = null;
      try {
        const res = await fetch(`/api/videos/${videoId}/recordings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contentType,
            durationSeconds: take.durationSeconds,
            bytes: take.blob.size,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          recording?: { id: string };
          uploadUrl?: string;
        };
        if (!res.ok || !body.recording?.id || !body.uploadUrl) {
          throw new Error(body.error || "Couldn't save the recording.");
        }
        createdId = body.recording.id;
        const put = await fetch(body.uploadUrl, {
          method: "PUT",
          body: take.blob,
          headers: { "Content-Type": contentType },
        });
        if (!put.ok) {
          throw new Error("Couldn't upload the recording.");
        }
        await refresh();
        return true;
      } catch (err) {
        if (createdId) {
          fetch(`/api/recordings/${createdId}`, { method: "DELETE" }).catch(
            () => {},
          );
        }
        setError(err instanceof Error ? err.message : "Couldn't save the recording.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refresh, videoId],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      if (playingId === id) stopPlayback();
      const prev = items;
      setItems((cur) => cur.filter((r) => r.id !== id));
      const res = await fetch(`/api/recordings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setItems(prev);
        const body = await res.json().catch(() => ({}));
        setError(
          typeof body.error === "string"
            ? body.error
            : "Couldn't delete that recording.",
        );
      }
    },
    [items, playingId, stopPlayback],
  );

  const togglePlay = useCallback(
    (item: PracticeRecording) => {
      if (playingId === item.id) {
        stopPlayback();
        return;
      }
      stopPlayback();
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = item.url;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        setError("Couldn't play that recording.");
      };
      void audio.play().then(
        () => setPlayingId(item.id),
        () => setError("Couldn't play that recording."),
      );
    },
    [playingId, stopPlayback],
  );

  return {
    items,
    loading,
    saving,
    error,
    setError,
    playingId,
    upload,
    remove,
    togglePlay,
    stopPlayback,
  };
}
