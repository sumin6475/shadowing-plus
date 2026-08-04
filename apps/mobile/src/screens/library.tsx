// library.tsx — Library tab: list + add sheet, clip focus reader, chunk save
// (sp-library.jsx). Default clip layout is "focus".
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { fetchClipMedia, fetchLibrary, fetchSegments, formatDuration, isPlayableUrl, type ClipMedia, type LibraryEntry, type TranscriptLine } from "@/lib/library";
import { saveBookmark } from "@/lib/phrases";
import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Card, Header, Hero, Icon, Pill, Screen, Serif } from "@/design/ui";
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
            return (
              <Card key={item.id} onPress={item.ready ? () => nav.push("libItem", { id: item.id, title: item.title }) : undefined}>
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

  // ── Audio playback (expo-audio) ──
  const playSrc = media && isPlayableUrl(media.audioUrl) ? media.audioUrl : undefined;
  const player = useAudioPlayer(playSrc);
  const status = useAudioPlayerStatus(player);
  const playable = !!playSrc;
  const isYoutube = !!media?.audioUrl?.startsWith("youtube://");

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

  // Follow playback: highlight the line whose start time we've passed.
  useEffect(() => {
    if (!playable || !status.playing || !lines || !lines.length) return;
    const ct = status.currentTime;
    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (ct >= lines[i].start) idx = i;
      else break;
    }
    setLine((prev) => (prev === idx ? prev : idx));
  }, [status.currentTime, status.playing, playable, lines]);

  const togglePlay = () => {
    if (!playable) return;
    if (status.playing) player.pause();
    else player.play();
  };

  // Select a line — jump audio there when playable, else just move the cursor.
  const selectLine = (i: number) => {
    setLine(i);
    if (playable && lines && lines[i]) player.seekTo(lines[i].start).catch(() => {});
  };

  const mediaLoading = media === null;
  const dur = playable && status.duration > 0 ? status.duration : (total ?? 0);
  const pos = playable ? status.currentTime : cur ? cur.start : 0;
  const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 96, gap: t.gap }}
        showsVerticalScrollIndicator={false}
      >
        <BackBar title={title ?? "Clip"} onBack={nav.pop} right={<Pill tone="tint" small icon="dots" />} />
        <Card lg style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ height: 216, backgroundColor: t.colors.soft, alignItems: "center", justifyContent: "center" }}>
            {mediaLoading ? (
              <ActivityIndicator color={t.colors.acc} />
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
                  <Icon name={status.playing ? "pause" : "play"} s={24} c="#fff" />
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
              <Pill small icon="bank" onPress={() => nav.push("saveChunk", { segmentId: cur.id, text: cur.text, translation: cur.translation, time: formatDuration(cur.start) })}>
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

// Saves the reader's current transcript line as a real bookmark (bookmarks
// table, RLS-scoped). Idempotent — re-saving the same line reports "already".
export function ChunkSave({ nav, segmentId, text, translation, time }: { nav: Nav; segmentId?: string; text?: string; translation?: string | null; time?: string }) {
  const t = useTheme();
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<"saved" | "already" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const phrase = text ?? "take the plunge";

  const save = async () => {
    if (!segmentId) {
      setError("This line can’t be saved (missing reference).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      setResult(await saveBookmark(segmentId, memo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen bottomPad={40}>
      <BackBar title="Save this as a phrase?" onBack={nav.pop} />
      <Card lg>
        <Serif style={{ fontSize: 22, lineHeight: 30, color: t.colors.ink }}>{phrase}</Serif>
        {translation ? <Text style={{ fontSize: 15, color: t.colors.ink2, marginTop: 6, lineHeight: 22 }}>{translation}</Text> : null}
        <View style={{ backgroundColor: t.colors.soft, borderRadius: 16, padding: 12, marginTop: 13 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3 }}>FROM THIS CLIP{time ? ` · ${time}` : ""}</Text>
          <Serif style={{ fontSize: 15, fontStyle: "italic", lineHeight: 22, marginTop: 5, color: t.colors.ink }}>“{phrase}”</Serif>
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
