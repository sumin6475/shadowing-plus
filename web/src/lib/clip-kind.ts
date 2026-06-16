import type { Video } from "./types";

export type ClipKind = "youtube" | "audio" | "video";

type ClipLike = Pick<Video, "media_type" | "audio_url">;

export function isYoutubeClip(video: Pick<Video, "audio_url">): boolean {
  return video.audio_url?.startsWith("youtube://") ?? false;
}

/** Library label for a clip: youtube imports override media_type=video. */
export function clipKind(video: ClipLike): ClipKind {
  if (isYoutubeClip(video)) return "youtube";
  return video.media_type;
}
