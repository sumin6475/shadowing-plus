// library.tsx — Library tab: list + add sheet, clip focus reader.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";

import { prepareSpeakerPlayback, registerPlaybackStopper } from "@/lib/audio-session";
import { deleteClip, fetchClipMedia, fetchLibrary, fetchSegments, formatDuration, isPlayableUrl, setClipFavorite, type ClipMedia, type LibraryEntry, type TranscriptLine } from "@/lib/library";
import { useTheme } from "@/design/theme";
import { BackBar, Card, Icon, Pill, Screen, Serif, SwipeRow, Wave, confirmDelete } from "@/design/ui";
import type { IconName } from "@/design/icon";
import type { Nav } from "./nav";

/** Lean Library clip row for use OUTSIDE the Library screens (e.g. a phrase's
 * In-context source). It lives here so it ships — and can be removed — with
 * the Library beta as one unit. */
export function LibraryClipRow({ title, meta, onPress }: { title: string; meta: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: "row", gap: 13, alignItems: "center" }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: t.colors.sky, alignItems: "center", justifyContent: "center" }}>
          <Icon name="clip" s={21} c={t.colors.onB} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }} numberOfLines={2}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>{meta}</Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </View>
    </Card>
  );
}

const CARD_TONES = ["butter", "sky", "sage", "blush"] as const;

const ADD_OPTS: [IconName, string, string][] = [
  ["upload", "Upload video", "From your camera roll or files"],
  ["wave2", "Upload audio", "Voice memos, podcasts you own"],
  ["text", "Add text", "Paste anything you’re reading"],
  ["bank", "Add a phrase", "Type one you want to keep"],
  ["book", "Paste from another app", "Bring what you learned elsewhere"],
];

export function LibraryScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [add, setAdd] = useState(false);
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const nextEntries = await fetchLibrary();
      setError(null);
      setEntries(nextEntries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your library.");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Optimistically drop the clip, then delete; restore it if the delete fails.
  const removeClip = useCallback(async (videoId: string) => {
    let prev: LibraryEntry[] | null = null;
    setEntries((xs) => {
      prev = xs;
      return (xs ?? []).filter((e) => e.id !== videoId);
    });
    try {
      await deleteClip(videoId);
    } catch (e) {
      setEntries(prev);
      Alert.alert("Couldn’t delete", e instanceof Error ? e.message : "Try again.");
    }
  }, []);

  // Left-swipe toggles the star. Optimistic, with rollback on failure.
  const toggleFav = useCallback(async (videoId: string, next: boolean) => {
    setEntries((xs) => (xs ?? []).map((e) => (e.id === videoId ? { ...e, favorite: next } : e)));
    try {
      await setClipFavorite(videoId, next);
    } catch (err) {
      setEntries((xs) => (xs ?? []).map((e) => (e.id === videoId ? { ...e, favorite: !next } : e)));
      Alert.alert("Couldn’t update", err instanceof Error ? err.message : "Try again.");
    }
  }, []);

  return (
    <>
      <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.acc} />}>
        <BackBar title="Library" onBack={nav.pop} />
        <View style={{ paddingHorizontal: 2, paddingTop: 2, paddingBottom: 2 }}>
          <Serif style={{ fontSize: 32, lineHeight: 37, color: t.colors.ink }}>Learn from your{"\n"}own material.</Serif>
          <Text style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink3, marginTop: 8 }}>Save the parts you want to understand.</Text>
        </View>

        {entries === null && !error ? (
          <View style={{ paddingVertical: 48, alignItems: "center" }}>
            <ActivityIndicator color={t.colors.acc} />
          </View>
        ) : error ? (
          <Card style={{ alignItems: "center", paddingVertical: 28 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink, textAlign: "center" }}>Couldn’t load your library</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{error}</Text>
            <Pill tone="tint" small onPress={load} style={{ marginTop: 14 }}>
              Retry
            </Pill>
          </Card>
        ) : !entries || entries.length === 0 ? (
          <Card style={{ alignItems: "center", paddingVertical: 34 }}>
            <Serif style={{ fontSize: 20, color: t.colors.ink }}>Nothing here yet</Serif>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>
              Upload a clip from the web app and it’ll show up here.
            </Text>
          </Card>
        ) : (
          entries.map((item, i) => {
            const tone = CARD_TONES[i % CARD_TONES.length];
            const icon: IconName = item.mediaType === "audio" ? "wave2" : "clip";
            const meta = item.ready
              ? `${formatDuration(item.durationSec)} · ${item.mediaType}`
              : "Processing your upload…";
            const card = (
              <Card onPress={item.ready ? () => nav.push("libItem", { id: item.id, title: item.title }) : undefined}>
                <View style={{ flexDirection: "row", gap: 13, alignItems: "center" }}>
                  <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: t.colors[tone], alignItems: "center", justifyContent: "center" }}>
                    <Icon name={icon} s={21} c={t.colors.onB} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>{meta}</Text>
                  </View>
                  {item.ready && item.favorite ? <Icon name="star" s={15} c={t.colors.acc} /> : null}
                  {item.ready ? (
                    <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
                  ) : (
                    <View style={{ backgroundColor: t.colors.accS, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.accD }}>{item.statusLabel}</Text>
                    </View>
                  )}
                </View>
                {!item.ready ? (
                  <>
                    <View style={{ height: 6, borderRadius: 9999, backgroundColor: t.colors.soft, marginTop: 13, overflow: "hidden" }}>
                      <View style={{ width: `${Math.round((item.progress ?? 0) * 100)}%`, height: "100%", borderRadius: 9999, backgroundColor: t.colors.acc }} />
                    </View>
                    <Text style={{ fontSize: 12, color: t.colors.ink3, marginTop: 7, lineHeight: 18 }}>
                      This can take a few minutes for longer files. You can leave. We’ll keep processing in the background.
                    </Text>
                  </>
                ) : null}
              </Card>
            );
            // Only ready clips are deletable (processing rows are jobs, not videos).
            return item.ready ? (
              <SwipeRow
                key={item.id}
                favorited={item.favorite}
                onFavorite={() => toggleFav(item.id, !item.favorite)}
                onDelete={() =>
                  confirmDelete({
                    title: "Delete this clip?",
                    message: "The clip and its transcript will be removed. Phrases you saved will stay in your Phrase Bank without the clip link.",
                    deleteLabel: "Delete",
                    onConfirm: () => removeClip(item.id),
                  })
                }
              >
                {card}
              </SwipeRow>
            ) : (
              <Fragment key={item.id}>{card}</Fragment>
            );
          })
        )}

        <Pill full icon="plus" tone="dark" onPress={() => setAdd(true)}>
          Add something to learn from
        </Pill>
      </Screen>

      <Modal visible={add} transparent animationType="slide" onRequestClose={() => setAdd(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setAdd(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: t.colors.bg, borderTopLeftRadius: 38, borderTopRightRadius: 38, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40, gap: 9 }}
          >
            <View style={{ width: 40, height: 5, borderRadius: 9999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 14 }} />
            <Serif style={{ fontSize: 22, paddingHorizontal: 4, paddingBottom: 12, color: t.colors.ink }}>Add something you want to learn from</Serif>
            {ADD_OPTS.map(([ic, l, d]) => (
              <Card key={l} onPress={() => setAdd(false)} style={{ flexDirection: "row", gap: 12, alignItems: "center", padding: 13 }}>
                <View style={{ width: 38, height: 38, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={ic} s={18} c={t.colors.accD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{l}</Text>
                  <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 1 }}>{d}</Text>
                </View>
              </Card>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const FOCUS_FADE_MS = 120;
const PIN_HOLD_MS = 600;
const SEEK_SLOP_SEC = 0.15;
// Time updates land every ~0.25–0.5s, so a loop has to turn slightly early or
// it overshoots into the next line before the seek fires.
const LOOP_SLOP_SEC = 0.25;

function lineIndexAt(lines: TranscriptLine[], t: number) {
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (t >= lines[i].start) idx = i;
    else break;
  }
  return idx;
}

function ClipScrubBar({
  isVideo,
  videoPlayer,
  audioPlayer,
  playable,
  fallbackPos,
  fallbackDur,
  accent,
  muted,
  track,
  fill,
  onTick,
}: {
  isVideo: boolean;
  videoPlayer: ReturnType<typeof useVideoPlayer>;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  playable: boolean;
  fallbackPos: number;
  fallbackDur: number;
  accent: string;
  muted: string;
  track: string;
  fill: string;
  onTick: (pos: number, playing: boolean) => void;
}) {
  useEvent(videoPlayer, "timeUpdate");
  useEvent(videoPlayer, "playingChange");
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const posRaw = isVideo ? (videoPlayer.currentTime ?? 0) : audioStatus.currentTime;
  const durRaw = isVideo ? videoPlayer.duration : audioStatus.duration;
  const playing = isVideo ? videoPlayer.playing : audioStatus.playing;
  const pos = playable ? posRaw : fallbackPos;
  const dur = playable && durRaw > 0 ? durRaw : fallbackDur;
  const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;

  useEffect(() => {
    onTick(posRaw, playing);
  }, [posRaw, playing, onTick]);

  return (
    <View style={{ padding: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: accent }}>{formatDuration(pos)}</Text>
      <View style={{ flex: 1, height: 5, borderRadius: 9999, backgroundColor: track, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: fill, borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 13, color: muted }}>{formatDuration(dur)}</Text>
    </View>
  );
}

/** One transport control. Fixed width so the row never reflows between states. */
function TransportButton({
  onPress,
  disabled,
  size,
  active,
  primary,
  label,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  size: number;
  active?: boolean;
  primary?: boolean;
  label?: string;
  accessibilityLabel: string;
  children?: ReactNode;
}) {
  const t = useTheme();
  const bg = primary || active ? t.colors.acc : t.colors.card;
  const fg = primary || active ? "#fff" : t.colors.ink2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: primary || active ? 0 : 0.5,
          borderColor: t.ring,
          opacity: disabled ? 0.35 : pressed ? 0.75 : 1,
        },
        primary || active ? null : t.shadowCard,
      ]}
    >
      {label ? <Text style={{ fontSize: 13, fontWeight: "700", color: fg }}>{label}</Text> : children}
    </Pressable>
  );
}

/** Chip for the secondary row: icon + at most a 4-character value, so the row
 *  keeps its rhythm whatever the state. Toggling changes colour, never width. */
function ToolChip({
  icon,
  value,
  active,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  value?: string;
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const t = useTheme();
  const fg = active ? t.colors.accD : t.colors.ink2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingHorizontal: value ? 13 : 10,
        borderRadius: 999,
        backgroundColor: active ? t.colors.accS : t.colors.soft,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon name={icon} s={15} w={2} c={fg} />
      {value ? (
        <Text style={{ fontSize: 13, fontWeight: "600", color: fg, minWidth: 26, textAlign: "center" }}>{value}</Text>
      ) : null}
    </Pressable>
  );
}

function FocusCopy({
  line,
  text,
  translation,
  ink,
  ink3,
}: {
  line: number;
  text: string;
  translation: string | null;
  ink: string;
  ink3: string;
}) {
  const opacity = useMemo(() => new Animated.Value(1), []);
  const skip = useRef(true);
  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    // NOT native-driven. The parent re-renders on every playback tick, and a
    // native-driven opacity here was getting dropped mid-flight — leaving the
    // sentence stranded at opacity 0, i.e. an empty screen where the one thing
    // the reader needs should be. The JS driver re-commits the live value on
    // each render, and the cleanup guarantees the value lands back on 1.
    opacity.setValue(0);
    const anim = Animated.timing(opacity, { toValue: 1, duration: FOCUS_FADE_MS, useNativeDriver: false });
    anim.start(({ finished }) => {
      if (!finished) opacity.setValue(1);
    });
    return () => {
      anim.stop();
      opacity.setValue(1);
    };
  }, [line, opacity]);
  // Lines run from three words to three clauses. Step the size down instead of
  // letting the block grow — the transport under it has to stay put, because
  // you cannot hunt for a moving Play button while shadowing.
  const size = text.length > 150 ? 17 : text.length > 80 ? 20 : 25;
  return (
    <Animated.View style={{ opacity }}>
      <Serif style={{ fontSize: size, lineHeight: Math.round(size * 1.44), color: ink }}>{text}</Serif>
      {translation ? <Text style={{ fontSize: 15, color: ink3, marginTop: 8, lineHeight: 22 }}>{translation}</Text> : null}
    </Animated.View>
  );
}

export function LibItem({ id, nav, title, covered = false }: { id?: string; title?: string; nav: Nav; covered?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<TranscriptLine[] | null>(null);
  const [media, setMedia] = useState<ClipMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState(0);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  // Repeat the current sentence. Mutually exclusive with an A–B range: two
  // loops fighting over the same seek would stutter.
  const [loopLine, setLoopLine] = useState(false);
  // A–B is a three-step control: idle → A armed → range looping.
  const [ab, setAb] = useState<{ a: number; b: number | null } | null>(null);
  const sheetH = Math.round(Dimensions.get("window").height * 0.53);
  const peek = 76;
  const trans = useMemo(() => new Animated.Value(1), []); // 1 = closed, 0 = open
  const toggle = (o: boolean) => {
    setOpen(o);
    Animated.timing(trans, { toValue: o ? 0 : 1, duration: 320, useNativeDriver: true }).start();
  };

  // ── Media playback: video (expo-video) when the clip has a playable video
  //    URL, else audio (expo-audio). Both hooks run; only one is active. ──
  const videoSrc = media && isPlayableUrl(media.videoUrl) ? media.videoUrl : undefined;
  const isVideo = !!videoSrc;
  const audioSrc = !isVideo && media && isPlayableUrl(media.audioUrl) ? media.audioUrl : undefined;
  const isYoutube = !!media?.audioUrl?.startsWith("youtube://") || !!media?.videoUrl?.startsWith("youtube://");

  const audioPlayer = useAudioPlayer(audioSrc, { keepAudioSessionActive: true });
  const videoPlayer = useVideoPlayer(videoSrc ?? null, (p) => {
    p.timeUpdateEventInterval = 0.5;
  });

  // Let a Talk start pause both Library players before the recognizer takes
  // the shared session. Re-register on player identity change so the stopper
  // always holds the live instance (unregister does not touch the player).
  useEffect(() => {
    return registerPlaybackStopper(() => {
      audioPlayer.pause();
      videoPlayer.pause();
    });
  }, [audioPlayer, videoPlayer]);

  const load = useCallback(async () => {
    if (!id) {
      setLines([]);
      setMedia({ audioUrl: null, videoUrl: null });
      return;
    }
    setError(null);
    try {
      const [segs, m] = await Promise.all([
        fetchSegments(id),
        fetchClipMedia(id).catch(() => ({ audioUrl: null, videoUrl: null }) as ClipMedia),
      ]);
      setLines(segs);
      setMedia(m);
      setLine(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load the transcript.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const total = lines && lines.length ? lines[lines.length - 1].end : null;
  const cur = lines && lines.length ? lines[Math.min(line, lines.length - 1)] : null;

  const playable = isVideo || !!audioSrc;

  const seekTo = (s: number) => {
    if (isVideo) videoPlayer.seekBy(s - videoPlayer.currentTime);
    else audioPlayer.seekTo(s).catch(() => {});
  };

  const playingRef = useRef(false);
  const resumeAfterCover = useRef(false);
  const pendingLineRef = useRef<number | null>(null);
  const pinUntilRef = useRef(0);
  const linesRef = useRef(lines);
  const playableRef = useRef(playable);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    playableRef.current = playable;
  }, [playable]);

  // The tick callback is stable (empty deps) so every value it reads at
  // playback time comes through a ref.
  const lineRef = useRef(line);
  const loopRef = useRef(loopLine);
  const abRef = useRef(ab);
  const posRef = useRef(0);
  const seekRef = useRef<(s: number) => void>(() => {});
  useEffect(() => {
    lineRef.current = line;
  }, [line]);
  useEffect(() => {
    loopRef.current = loopLine;
  }, [loopLine]);
  useEffect(() => {
    abRef.current = ab;
  }, [ab]);
  useEffect(() => {
    seekRef.current = seekTo;
  });

  // Pause under the capture overlay; restore play only if it was playing.
  // Depend only on `covered` so a player identity change while paused cannot
  // clear the resume flag.
  useEffect(() => {
    if (covered) {
      resumeAfterCover.current = playingRef.current;
      if (playingRef.current) {
        if (isVideo) videoPlayer.pause();
        else audioPlayer.pause();
      }
      return;
    }
    if (resumeAfterCover.current) {
      resumeAfterCover.current = false;
      if (isVideo) videoPlayer.play();
      else audioPlayer.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pause/resume on cover edges only
  }, [covered]);

  // Follow playback only when the index actually changes. Manual prev/next
  // pins the chosen line until seek lands (or PIN_HOLD_MS elapses).
  const onTick = useCallback((pos: number, isPlaying: boolean) => {
    playingRef.current = isPlaying;
    posRef.current = pos;
    setPlaying((prev) => (prev === isPlaying ? prev : isPlaying));
    const xs = linesRef.current;
    if (!playableRef.current || !isPlaying || !xs?.length) return;

    // Loops run before line-following: a loop that let the cursor advance
    // first would flash the next sentence on every pass.
    const range = abRef.current;
    if (range?.b != null) {
      if (pos >= range.b - LOOP_SLOP_SEC || pos < range.a - 1) {
        seekRef.current(range.a);
        return;
      }
    } else if (loopRef.current) {
      const held = xs[lineRef.current];
      if (held && (pos >= held.end - LOOP_SLOP_SEC || pos < held.start - 1)) {
        pendingLineRef.current = lineRef.current;
        pinUntilRef.current = Date.now() + PIN_HOLD_MS;
        seekRef.current(held.start);
        return;
      }
    }
    const pending = pendingLineRef.current;
    if (pending != null && pending >= 0 && pending < xs.length) {
      const start = xs[pending].start;
      const nextStart = pending + 1 < xs.length ? xs[pending + 1].start : Number.POSITIVE_INFINITY;
      const landed = pos >= start - SEEK_SLOP_SEC && pos < nextStart;
      if (!landed && Date.now() < pinUntilRef.current) return;
      pendingLineRef.current = null;
    }
    const idx = lineIndexAt(xs, pos);
    setLine((prev) => (prev === idx ? prev : idx));
  }, []);

  // Select a line — jump the player there when playable, else just move the cursor.
  // Jumping to another sentence abandons an A–B range: the range belongs to the
  // spot it was marked on, and silently yanking playback back to it after a
  // deliberate jump is the confusing option.
  const selectLine = (i: number) => {
    setAb(null);
    pendingLineRef.current = i;
    pinUntilRef.current = Date.now() + PIN_HOLD_MS;
    setLine(i);
    if (playable && lines && lines[i]) seekTo(lines[i].start);
  };

  const togglePlay = () => {
    if (!playable) return;
    if (isVideo) {
      if (videoPlayer.playing) videoPlayer.pause();
      else videoPlayer.play();
      return;
    }
    if (playingRef.current) {
      audioPlayer.pause();
      return;
    }
    void prepareSpeakerPlayback().then(() => audioPlayer.play());
  };

  const step = (delta: number) => {
    if (!lines?.length) return;
    selectLine(Math.max(0, Math.min(lines.length - 1, line + delta)));
  };

  const toggleLoop = () => {
    setLoopLine((on) => {
      if (!on) setAb(null);
      return !on;
    });
    if (playable && !loopLine && cur) seekTo(cur.start);
  };

  // idle → mark A at the playhead → mark B → clear.
  const cycleAb = () => {
    if (!playable) return;
    setAb((current) => {
      if (!current) {
        setLoopLine(false);
        return { a: posRef.current, b: null };
      }
      if (current.b == null) {
        const b = posRef.current;
        if (b <= current.a + 0.4) return current; // too short to loop — keep waiting for B
        return { a: current.a, b };
      }
      return null;
    });
  };

  const savePhrase = () => {
    if (!cur) return;
    nav.push("capture", {
      clipSeed: {
        contextText: cur.text,
        contextTranslation: cur.translation,
        sourceLabel: title,
        videoId: id,
        segmentId: cur.id,
        start: cur.start,
        end: cur.end,
      },
    });
  };

  const mediaLoading = media === null;
  const showDock = cur != null && lines != null && lines.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, gap: t.gap }}>
        <BackBar title={title ?? "Clip"} onBack={nav.pop} />
        <Card lg style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ height: 216, backgroundColor: isVideo ? "#000" : t.colors.soft, alignItems: "center", justifyContent: "center" }}>
            {mediaLoading ? (
              <ActivityIndicator color={t.colors.acc} />
            ) : isVideo ? (
              <VideoView player={videoPlayer} style={{ width: "100%", height: 216 }} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} />
            ) : (
              <>
                {!playable ? (
                  <Text style={{ fontSize: 13, color: t.colors.ink3, textAlign: "center", paddingHorizontal: 24 }}>
                    {isYoutube ? "YouTube clip · open on the web to play" : "Audio unavailable for this clip"}
                  </Text>
                ) : (
                  <Wave n={24} h={34} active={playing} />
                )}
              </>
            )}
          </View>
          <ClipScrubBar
            isVideo={isVideo}
            videoPlayer={videoPlayer}
            audioPlayer={audioPlayer}
            playable={playable}
            fallbackPos={cur ? cur.start : 0}
            fallbackDur={total ?? 0}
            accent={t.colors.accD}
            muted={t.colors.ink3}
            track={t.colors.soft}
            fill={t.colors.acc}
            onTick={onTick}
          />
        </Card>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, minHeight: 0 }}>
        {lines === null && !error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={t.colors.acc} />
          </View>
        ) : error ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Card style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Couldn’t load the transcript</Text>
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{error}</Text>
              <Pill tone="tint" small onPress={load} style={{ marginTop: 14 }}>
                Retry
              </Pill>
            </Card>
          </View>
        ) : cur == null ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Card style={{ alignItems: "center", paddingVertical: 28 }}>
              <Serif style={{ fontSize: 20, color: t.colors.ink }}>No transcript yet</Serif>
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>
                This clip doesn’t have transcript lines yet.
              </Text>
            </Card>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, marginBottom: 10 }}>
              {ab?.b != null ? `A–B · ${formatDuration(ab.a)}–${formatDuration(ab.b)}` : `NOW PLAYING · ${formatDuration(cur.start)}`}
            </Text>
            <FocusCopy line={line} text={cur.text} translation={cur.translation} ink={t.colors.ink} ink3={t.colors.ink3} />
          </ScrollView>
        )}
      </View>

      {showDock ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 10, gap: 12 }}>
          {/* Transport — fixed geometry: repeat · prev · play · next · A–B. */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <TransportButton
              size={40}
              active={loopLine}
              disabled={!playable}
              onPress={toggleLoop}
              accessibilityLabel={loopLine ? "Stop repeating this sentence" : "Repeat this sentence"}
            >
              <Icon name="repeat" s={17} w={2} c={loopLine ? "#fff" : t.colors.ink2} />
            </TransportButton>
            <TransportButton size={44} onPress={() => step(-1)} accessibilityLabel="Previous sentence">
              <Icon name="back" s={17} w={2.2} c={t.colors.ink2} />
            </TransportButton>
            <TransportButton size={64} primary disabled={!playable} onPress={togglePlay} accessibilityLabel={playing ? "Pause" : "Play"}>
              <Icon name={playing ? "pause" : "play"} s={26} c="#fff" />
            </TransportButton>
            <TransportButton size={44} onPress={() => step(1)} accessibilityLabel="Next sentence">
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icon name="back" s={17} w={2.2} c={t.colors.ink2} />
              </View>
            </TransportButton>
            <TransportButton
              size={40}
              disabled={!playable}
              active={ab != null}
              label={ab == null ? "A–B" : ab.b == null ? "A·" : "A–B"}
              onPress={cycleAb}
              accessibilityLabel={ab == null ? "Set loop point A" : ab.b == null ? "Set loop point B" : "Clear the A–B loop"}
            />
          </View>

          {/* Everything else rides one scrolling row of chips. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 6 }}
          >
            <ToolChip icon="bank" value="Save" onPress={savePhrase} accessibilityLabel="Save this sentence as a phrase" />
            <ToolChip icon="text" value="Script" active={open} onPress={() => toggle(!open)} accessibilityLabel="Show the transcript" />
          </ScrollView>
        </View>
      ) : null}

      {showDock ? <View style={{ height: peek }} /> : null}

      {/* transcript sheet — real lines */}
      {showDock && lines ? (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: sheetH,
            backgroundColor: t.colors.bg,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderWidth: 0.5,
            borderColor: t.colors.sep,
            transform: [{ translateY: trans.interpolate({ inputRange: [0, 1], outputRange: [0, sheetH - peek] }) }],
          }}
        >
          <Pressable onPress={() => toggle(!open)} style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 }}>
            <View style={{ width: 40, height: 5, borderRadius: 9999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 12 }} />
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Serif style={{ fontSize: 20, color: t.colors.ink }}>Transcript</Serif>
              <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3 }}>
                {open ? `${lines.length} line${lines.length === 1 ? "" : "s"}` : "Tap to see all lines"}
              </Text>
            </View>
          </Pressable>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: t.gap }} showsVerticalScrollIndicator={false}>
            {lines.map((l2, i) => (
              <Card
                key={l2.id}
                onPress={() => selectLine(i)}
                style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: line === i ? 2 : 0.5, borderColor: line === i ? t.colors.acc : t.ring }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.ink3, marginTop: 2 }}>{formatDuration(l2.start)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink }}>{l2.text}</Text>
                  {l2.translation ? <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3, lineHeight: 19 }}>{l2.translation}</Text> : null}
                </View>
              </Card>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}
