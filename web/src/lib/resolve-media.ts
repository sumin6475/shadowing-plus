/**
 * Resolve a video's playable audio URL via /api/media/[videoId].
 *
 * Since the R2-privacy change, `videos.audio_url` holds a bare R2 key, not a
 * public URL — it can't be fed to an <audio> element directly. This asks the
 * server to sign it (or pass through an external YouTube ref). Used by the
 * bookmarks and practice players, which play audio without the full clip page.
 *
 * Returns null if the video isn't found or the request fails, so callers can
 * bail out of playback gracefully.
 */
export async function resolveAudioUrl(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/media/${videoId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { audioUrl: string | null };
    return data.audioUrl ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve signed audio URLs for many videos at once, returning a
 * videoId → url map (entries that fail to resolve are omitted).
 *
 * Used to PRELOAD urls when a list mounts, so a later play() can run
 * synchronously inside the tap handler — mobile in-app browsers and installed
 * PWAs block audio started after an `await`, which is what breaks playback when
 * the url is signed lazily at tap time.
 */
export async function resolveAudioUrls(
  videoIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(videoIds));
  const entries = await Promise.all(
    unique.map(async (id): Promise<[string, string] | null> => {
      const url = await resolveAudioUrl(id);
      return url ? [id, url] : null;
    }),
  );
  return new Map(entries.filter((e): e is [string, string] => e !== null));
}
