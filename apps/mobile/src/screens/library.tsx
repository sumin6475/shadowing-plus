// library.tsx — Library tab: list + add sheet, clip focus reader, chunk save
// (sp-library.jsx). Default clip layout is "focus".
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";

import { deleteClip, fetchClipMedia, fetchLibrary, fetchSegments, formatDuration, isPlayableUrl, setClipFavorite, type ClipMedia, type LibraryEntry, type TranscriptLine } from "@/lib/library";
import { createPhrase } from "@/lib/phrases";
import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Card, Header, Hero, Icon, Pill, Screen, Serif, SwipeRow, confirmDelete } from "@/design/ui";
import type { IconName } from "@/design/icon";
import type { Nav } from "./nav";

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
    setError(null);
    try {
      setEntries(await fetchLibrary());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your library.");
    }
  }, []);

  useEffect(() => {
    load();
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
        <Header
          eyebrow="Your Library"
          title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Learn from your{"\n"}own material.</Serif>}
          sub="Save the parts you want to understand — then use yourself."
          right={<Avatar onPress={() => nav.push("settings")} />}
        />

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
              Upload a clip from the web app — or make sure you’re signed in — and it’ll show up here.
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
                      This can take a few minutes for longer files. You can leave — we’ll keep processing in the background.
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

export function LibItem({ id, nav, title }: { id?: string; title?: string; nav: Nav }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [lines, setLines] = useState<TranscriptLine[] | null>(null);
  const [media, setMedia] = useState<ClipMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState(0);
  const [open, setOpen] = useState(false);
  const sheetH = Math.round(Dimensions.get("window").height * 0.53);
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

  const audioPlayer = useAudioPlayer(audioSrc);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const videoPlayer = useVideoPlayer(videoSrc ?? null, (p) => {
    p.timeUpdateEventInterval = 0.5;
  });
  // Subscribe to force re-renders on tick / play-state change, then read the
  // player's current values (avoids depending on exact event payload shapes).
  useEvent(videoPlayer, "timeUpdate");
  useEvent(videoPlayer, "playingChange");
  const vTime = videoPlayer.currentTime;
  const vPlaying = videoPlayer.playing;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

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

  // Unified playback state across the active player.
  const playable = isVideo || !!audioSrc;
  const playing = isVideo ? vPlaying : audioStatus.playing;
  const posRaw = isVideo ? vTime ?? 0 : audioStatus.currentTime;
  const durRaw = isVideo ? videoPlayer.duration : audioStatus.duration;

  const seekTo = (s: number) => {
    if (isVideo) videoPlayer.seekBy(s - videoPlayer.currentTime);
    else audioPlayer.seekTo(s).catch(() => {});
  };

  // Follow playback: highlight the line whose start time we've passed.
  useEffect(() => {
    if (!playable || !playing || !lines || !lines.length) return;
    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (posRaw >= lines[i].start) idx = i;
      else break;
    }
    setLine((prev) => (prev === idx ? prev : idx));
  }, [posRaw, playing, playable, lines]);

  const togglePlay = () => {
    if (!playable) return;
    if (isVideo) {
      if (vPlaying) videoPlayer.pause();
      else videoPlayer.play();
    } else {
      if (audioStatus.playing) audioPlayer.pause();
      else audioPlayer.play();
    }
  };

  // Select a line — jump the player there when playable, else just move the cursor.
  const selectLine = (i: number) => {
    setLine(i);
    if (playable && lines && lines[i]) seekTo(lines[i].start);
  };

  const mediaLoading = media === null;
  const dur = playable && durRaw > 0 ? durRaw : (total ?? 0);
  const pos = playable ? posRaw : cur ? cur.start : 0;
  const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 96, gap: t.gap }}
        showsVerticalScrollIndicator={false}
      >
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
                  <Text style={{ fontSize: 13, color: t.colors.ink3, position: "absolute", top: 14, left: 0, right: 0, textAlign: "center", paddingHorizontal: 24 }}>
                    {isYoutube ? "YouTube clip — open on the web to play" : "Audio unavailable for this clip"}
                  </Text>
                ) : null}
                <Pressable
                  onPress={togglePlay}
                  disabled={!playable}
                  style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center", opacity: playable ? 1 : 0.4 }}
                >
                  <Icon name={playing ? "pause" : "play"} s={24} c="#fff" />
                </Pressable>
              </>
            )}
          </View>
          <View style={{ padding: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.colors.accD }}>{formatDuration(pos)}</Text>
            <View style={{ flex: 1, height: 5, borderRadius: 9999, backgroundColor: t.colors.soft, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: "100%", backgroundColor: t.colors.acc, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 13, color: t.colors.ink3 }}>{formatDuration(dur || total)}</Text>
          </View>
        </Card>

        {lines === null && !error ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={t.colors.acc} />
          </View>
        ) : error ? (
          <Card style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Couldn’t load the transcript</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{error}</Text>
            <Pill tone="tint" small onPress={load} style={{ marginTop: 14 }}>
              Retry
            </Pill>
          </Card>
        ) : cur == null ? (
          <Card style={{ alignItems: "center", paddingVertical: 28 }}>
            <Serif style={{ fontSize: 20, color: t.colors.ink }}>No transcript yet</Serif>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>
              This clip doesn’t have transcript lines yet.
            </Text>
          </Card>
        ) : (
          <View style={{ paddingHorizontal: 6, paddingTop: 8, gap: 16 }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, marginBottom: 10 }}>NOW PLAYING · {formatDuration(cur.start)}</Text>
              <Serif style={{ fontSize: 25, lineHeight: 36, color: t.colors.ink }}>{cur.text}</Serif>
              {cur.translation ? <Text style={{ fontSize: 15, color: t.colors.ink3, marginTop: 8, lineHeight: 22 }}>{cur.translation}</Text> : null}
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Pill small icon="bank" onPress={() => nav.push("saveChunk", { segmentId: cur.id, videoId: id, text: cur.text, translation: cur.translation, sourceTitle: title, start: cur.start, end: cur.end })}>
                Save phrase
              </Pill>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => selectLine(Math.max(0, line - 1))}
                style={[{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
              >
                <Icon name="back" s={15} w={2.2} c={t.colors.ink2} />
              </Pressable>
              <Pressable
                onPress={() => lines && selectLine(Math.min(lines.length - 1, line + 1))}
                style={[{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
              >
                <Icon name="chev" s={15} w={2.2} c={t.colors.ink2} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* transcript sheet — real lines */}
      {cur != null && lines ? (
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
            transform: [{ translateY: trans.interpolate({ inputRange: [0, 1], outputRange: [0, sheetH - 76] }) }],
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

// Captures a reusable expression from a transcript line. The full line remains
// source context; the learner edits/selects the smaller Phrase Bank item.
export function ChunkSave({ nav, segmentId, videoId, text, translation, sourceTitle, start, end }: { nav: Nav; segmentId?: string; videoId?: string; text?: string; translation?: string | null; sourceTitle?: string; start?: number; end?: number }) {
  const t = useTheme();
  const [phrase, setPhrase] = useState(text ?? "");
  const [meaning, setMeaning] = useState(translation ?? "");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"saved" | "already" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const context = text ?? "";

  const save = async () => {
    if (!segmentId || !phrase.trim()) {
      setError("This line can’t be saved (missing reference).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await createPhrase({
        text: phrase,
        meaning,
        usageNote: memo,
        context,
        source: "clip",
        sourceLabel: sourceTitle,
        segmentId,
        videoId,
        startTime: start,
        endTime: end,
      });
      setResult(saved.result);
    } catch {
      setError("Couldn’t save this phrase. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Save this as a phrase?" onBack={nav.pop} />
      <Card lg>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.accD }}>PHRASE TO KEEP</Text>
        <TextInput value={phrase} onChangeText={setPhrase} multiline style={{ fontFamily: "Newsreader", fontSize: 22, lineHeight: 30, color: t.colors.ink, marginTop: 7, padding: 0 }} />
        <TextInput value={meaning} onChangeText={setMeaning} placeholder="Meaning (optional)" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, color: t.colors.ink2, marginTop: 8, padding: 0 }} />
        <View style={{ backgroundColor: t.colors.soft, borderRadius: 16, padding: 12, marginTop: 13 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3 }}>FROM THIS CLIP{start != null ? ` · ${formatDuration(start)}` : ""}</Text>
          <Serif style={{ fontSize: 15, fontStyle: "italic", lineHeight: 22, marginTop: 5, color: t.colors.ink }}>“{context}”</Serif>
        </View>
      </Card>

      {result ? (
        <Hero style={{ alignItems: "center" }}>
          <Serif style={{ fontSize: 22, lineHeight: 30, color: "#fff", textAlign: "center" }}>
            {result === "already" ? "Already in your Phrase Bank." : "Saved to your Phrase Bank."}
          </Serif>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 7, textAlign: "center" }}>
            We’ll bring it back when it’s time to use it.
          </Text>
          <Pill tone="white" small onPress={nav.pop} textStyle={{ color: t.colors.accD }} style={{ marginTop: 14, shadowOpacity: 0 }}>
            Done
          </Pill>
        </Hero>
      ) : (
        <>
          <Card style={{ padding: 8 }}>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="Add a note for future-you (optional)"
              placeholderTextColor={t.colors.ink3}
              style={{ fontSize: 15, padding: 12, color: t.colors.ink }}
              editable={!saving}
            />
          </Card>
          {error ? <Text style={{ fontSize: 13, color: "#E5484D", paddingHorizontal: 4 }}>{error}</Text> : null}
          <Pill full icon="bank" onPress={save} style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? <ActivityIndicator color="#fff" /> : "Save to Phrase Bank"}
          </Pill>
          <Pill tone="ghost" full small onPress={nav.pop}>
            Not now
          </Pill>
        </>
      )}
    </Screen>
  );
}
