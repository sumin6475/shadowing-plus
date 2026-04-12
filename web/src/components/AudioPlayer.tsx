"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
}

interface AudioPlayerProps {
  src: string;
  duration: number;
  onTimeUpdate?: (time: number) => void;
  externalMediaRef?: React.RefObject<HTMLMediaElement | null>;
  abRepeat?: { a: number; b: number | null } | null;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  ({ src, duration, onTimeUpdate, externalMediaRef, abRepeat }, ref) => {
    const internalAudioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const progressRef = useRef<HTMLDivElement>(null);

    const getMedia = useCallback((): HTMLMediaElement | null => {
      return externalMediaRef?.current ?? internalAudioRef.current;
    }, [externalMediaRef]);

    useImperativeHandle(ref, () => ({
      play: () => getMedia()?.play(),
      pause: () => getMedia()?.pause(),
      seekTo: (time: number) => {
        const el = getMedia();
        if (el) el.currentTime = time;
      },
      getCurrentTime: () => getMedia()?.currentTime ?? 0,
      isPlaying: () => !getMedia()?.paused,
    }));

    useEffect(() => {
      const media = getMedia();
      if (!media) return;

      const handleTimeUpdate = () => {
        const t = media.currentTime;
        setCurrentTime(t);
        onTimeUpdate?.(t);
      };

      const handlePlay = () => setPlaying(true);
      const handlePause = () => setPlaying(false);

      media.addEventListener("timeupdate", handleTimeUpdate);
      media.addEventListener("play", handlePlay);
      media.addEventListener("pause", handlePause);

      return () => {
        media.removeEventListener("timeupdate", handleTimeUpdate);
        media.removeEventListener("play", handlePlay);
        media.removeEventListener("pause", handlePause);
      };
    }, [onTimeUpdate, getMedia]);

    const togglePlay = useCallback(() => {
      const media = getMedia();
      if (!media) return;
      if (media.paused) {
        media.play();
      } else {
        media.pause();
      }
    }, [getMedia]);

    const handleProgressClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const bar = progressRef.current;
        const media = getMedia();
        if (!bar || !media) return;

        const rect = bar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        media.currentTime = ratio * (media.duration || duration);
      },
      [duration, getMedia],
    );

    const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const hasExternal = !!externalMediaRef;

    return (
      <div className="bg-card border-b border-border px-4 py-3">
        {!hasExternal && (
          <audio ref={internalAudioRef} src={src} preload="auto" />
        )}
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            )}
          </button>

          <span className="text-xs text-muted-foreground font-mono w-10 text-right shrink-0">
            {formatTime(currentTime)}
          </span>

          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-2 bg-muted rounded-full cursor-pointer group relative"
          >
            {abRepeat && duration > 0 && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                  style={{ left: `${(abRepeat.a / duration) * 100}%` }}
                />
                {abRepeat.b !== null && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 bg-primary/20 rounded-full"
                      style={{
                        left: `${(abRepeat.a / duration) * 100}%`,
                        width: `${((abRepeat.b - abRepeat.a) / duration) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                      style={{ left: `${(abRepeat.b / duration) * 100}%` }}
                    />
                  </>
                )}
              </>
            )}
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-100 relative z-[5]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <span className="text-xs text-muted-foreground font-mono w-10 shrink-0">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    );
  },
);

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
