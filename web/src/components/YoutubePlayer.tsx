"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import type { AudioPlayerHandle } from "./AudioPlayer";

interface YoutubePlayerProps {
  videoId: string;
  onTimeUpdate?: (time: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  videoSlotRef: React.RefObject<HTMLDivElement | null>;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
  PlayerState: { PLAYING: number; [key: string]: number };
}

declare global {
  interface Window {
    YT: YTNamespace | undefined;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoaded = false;
let apiLoadingPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  if (apiLoadingPromise) return apiLoadingPromise;

  apiLoadingPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      apiLoaded = true;
      resolve();
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      apiLoaded = true;
      resolve();
    };
  });

  return apiLoadingPromise;
}

const YoutubePlayer = forwardRef<AudioPlayerHandle, YoutubePlayerProps>(
  ({ videoId, onTimeUpdate, onPlayingChange, videoSlotRef }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const iframeWrapperRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    // Mirror of `isPlayerReady` for use inside the once-per-mount player effect.
    // The effect's onReady/onStateChange/polling closures capture state at
    // mount (always false), so they must read readiness from a ref instead.
    const isReadyRef = useRef(false);
    const pendingActionsRef = useRef<Array<() => void>>([]);
    const timeUpdateIntervalRef = useRef<number | null>(null);

    // Keep the latest callbacks reachable from the stable effect closures.
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onPlayingChangeRef = useRef(onPlayingChange);
    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
      onPlayingChangeRef.current = onPlayingChange;
    }, [onTimeUpdate, onPlayingChange]);

    // Queue actions called before player is ready
    const runOrQueue = (action: () => void) => {
      if (playerRef.current && isReadyRef.current) {
        action();
      } else {
        pendingActionsRef.current.push(action);
      }
    };

    useImperativeHandle(ref, () => ({
      play: () => {
        runOrQueue(() => {
          playerRef.current?.playVideo();
        });
      },
      pause: () => {
        runOrQueue(() => {
          playerRef.current?.pauseVideo();
        });
      },
      seekTo: (time: number) => {
        runOrQueue(() => {
          playerRef.current?.seekTo(time, true);
        });
      },
      getCurrentTime: () => {
        if (playerRef.current && isReadyRef.current) {
          return playerRef.current.getCurrentTime();
        }
        return 0;
      },
      isPlaying: () => {
        if (playerRef.current && isReadyRef.current) {
          const playing = window.YT?.PlayerState?.PLAYING;
          return playerRef.current.getPlayerState() === playing;
        }
        return false;
      },
      setPlaybackRate: (rate: number) => {
        runOrQueue(() => {
          playerRef.current?.setPlaybackRate(rate);
        });
      },
    }));

    const startTimePolling = () => {
      if (timeUpdateIntervalRef.current) return;
      timeUpdateIntervalRef.current = window.setInterval(() => {
        const p = playerRef.current;
        if (p && typeof p.getCurrentTime === "function") {
          onTimeUpdateRef.current?.(p.getCurrentTime());
        }
      }, 100);
    };

    const stopTimePolling = () => {
      if (timeUpdateIntervalRef.current !== null) {
        window.clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };

    useEffect(() => {
      let active = true;

      loadYoutubeApi().then(() => {
        if (!active) return;
        const wrapper = iframeWrapperRef.current;
        if (!wrapper) return;
        const YT = window.YT;
        if (!YT) return;

        // Clean up previous player
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.error("Failed to destroy YT player", e);
          }
          playerRef.current = null;
          isReadyRef.current = false;
          setIsPlayerReady(false);
        }

        // Dynamically insert a fresh child div so the YT.Player doesn't destroy the wrapper ref element
        wrapper.innerHTML = '<div style="width: 100%; height: 100%;"></div>';
        const placeholder = wrapper.firstChild as HTMLDivElement;

        playerRef.current = new YT.Player(placeholder, {
          height: "100%",
          width: "100%",
          videoId: videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              if (!active) return;
              isReadyRef.current = true;
              setIsPlayerReady(true);
              pendingActionsRef.current.forEach((action) => action());
              pendingActionsRef.current = [];
            },
            onStateChange: (event: { data: number }) => {
              if (!active) return;
              const state = event.data;
              const isPlaying = state === window.YT?.PlayerState?.PLAYING;

              onPlayingChangeRef.current?.(isPlaying);

              if (isPlaying) {
                startTimePolling();
              } else {
                stopTimePolling();
                const p = playerRef.current;
                if (p && typeof p.getCurrentTime === "function") {
                  onTimeUpdateRef.current?.(p.getCurrentTime());
                }
              }
            },
          },
        });
      });

      return () => {
        active = false;
        isReadyRef.current = false;
        stopTimePolling();
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {
            console.error("Failed to destroy player on clean-up", e);
          }
          playerRef.current = null;
        }
      };
    }, [videoId]);

    // DOM Hoisting to the active video slot (desktop/mobile).
    // CRITICAL: only move the container when it isn't already in the target
    // slot. Re-appending a node that holds an <iframe> reloads the iframe,
    // which severs the YT.Player API binding (breaking play/seek/time polling).
    // The <video> hoist in the player page guards the same way.
    // Re-runs when the active slot ref swaps (mobile/desktop) or once the
    // player becomes ready. Depending on the ref *object* (not its `.current`)
    // keeps this lint-clean; the slot element is already attached during commit
    // by the time this effect runs.
    useEffect(() => {
      const slot = videoSlotRef.current;
      const container = containerRef.current;
      if (!slot || !container) return;
      if (container.parentElement !== slot) {
        slot.appendChild(container);
      }
    }, [videoSlotRef, isPlayerReady]);

    return (
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background: "#000",
          overflow: "hidden",
        }}
      >
        <div
          ref={iframeWrapperRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    );
  }
);

YoutubePlayer.displayName = "YoutubePlayer";

export default YoutubePlayer;
