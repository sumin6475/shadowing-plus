// library.tsx — Library tab: list + add sheet, clip focus reader, chunk save
// (sp-library.jsx). Default clip layout is "focus".
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Dimensions, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchLibrary, formatDuration, type LibraryEntry } from "@/lib/library";
import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Card, Chip, Header, Hero, Icon, Pill, Screen, Serif } from "@/design/ui";
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

const LIB_LINES = [
  { t: "0:41", x: "I always play it safe with cheap sunglasses.", saved: true, hot: false },
  { t: "0:47", x: "But honestly? I lose every single pair.", saved: false, hot: false },
  { t: "0:53", x: "So this year I’ll take the plunge and buy a nice pair of sunglasses.", saved: true, hot: true },
  { t: "1:02", x: "Imagine me sporting some cool specs by the pool.", saved: false, hot: false },
];

function LibLine({ l, size = 15, lh = 22 }: { l: (typeof LIB_LINES)[number]; size?: number; lh?: number }) {
  const t = useTheme();
  if (l.hot) {
    return (
      <Text style={{ fontSize: size, lineHeight: lh, color: t.colors.ink }}>
        So this year I’ll{" "}
        <Text style={{ backgroundColor: t.colors.accS, color: t.colors.accD, fontWeight: "700", fontStyle: "italic" }}> take the plunge </Text> and buy a nice pair of
        sunglasses.
      </Text>
    );
  }
  return <Text style={{ fontSize: size, lineHeight: lh, color: t.colors.ink }}>{l.x}</Text>;
}

// NOTE: the transcript/lines below are still sample content. The list (title,
// which clip you tapped) is real; wiring the real transcript (segments table +
// media playback) is the next data-connection step.
export function LibItem({ nav, title }: { id?: string; title?: string; nav: Nav }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [line, setLine] = useState(2);
  const [open, setOpen] = useState(false);
  const sheetH = Math.round(Dimensions.get("window").height * 0.53);
  const trans = useMemo(() => new Animated.Value(1), []); // 1 = closed, 0 = open
  const toggle = (o: boolean) => {
    setOpen(o);
    Animated.timing(trans, { toValue: o ? 0 : 1, duration: 320, useNativeDriver: true }).start();
  };
  const l = LIB_LINES[line];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 96, gap: t.gap }}
        showsVerticalScrollIndicator={false}
      >
        <BackBar title={title ?? "Sunglasses story"} onBack={nav.pop} right={<Pill tone="tint" small icon="dots" />} />
        <Card lg style={{ padding: 0, overflow: "hidden" }}>
          <View style={{ height: 216, backgroundColor: t.colors.soft, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: "Menlo", fontSize: 12, color: t.colors.ink3, position: "absolute", top: 12, left: 14 }}>your uploaded video</Text>
            <Pressable style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" s={24} c="#fff" />
            </Pressable>
          </View>
          <View style={{ padding: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.colors.accD }}>{l.t}</Text>
            <View style={{ flex: 1, height: 5, borderRadius: 9999, backgroundColor: t.colors.soft, overflow: "hidden" }}>
              <View style={{ width: `${18 + line * 16}%`, height: "100%", backgroundColor: t.colors.acc, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 13, color: t.colors.ink3 }}>4:12</Text>
          </View>
        </Card>
        <Text style={{ fontSize: 12, color: t.colors.ink3, paddingHorizontal: 6, fontStyle: "italic" }}>
          Sample transcript — your clip’s real lines connect next.
        </Text>
        <View style={{ paddingHorizontal: 6, paddingTop: 8, gap: 16 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, marginBottom: 10 }}>NOW PLAYING · {l.t}</Text>
            <Serif style={{ fontSize: 25, lineHeight: 36, color: t.colors.ink }}>
              <LibLine l={l} size={25} lh={36} />
            </Serif>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Pill small icon="bank" onPress={() => nav.push("saveChunk")}>
              Save phrase
            </Pill>
            <Pill tone="tint" small icon="speaker">
              Hear
            </Pill>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => setLine((i) => Math.max(0, i - 1))}
              style={[{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
            >
              <Icon name="back" s={15} w={2.2} c={t.colors.ink2} />
            </Pressable>
            <Pressable
              onPress={() => setLine((i) => Math.min(LIB_LINES.length - 1, i + 1))}
              style={[{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.colors.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
            >
              <Icon name="chev" s={15} w={2.2} c={t.colors.ink2} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* transcript sheet */}
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
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3 }}>{open ? "12 useful moments found" : "Tap to see all lines"}</Text>
          </View>
        </Pressable>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: t.gap }} showsVerticalScrollIndicator={false}>
          {LIB_LINES.map((l2, i) => (
            <Card
              key={i}
              onPress={() => setLine(i)}
              style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", borderWidth: line === i ? 2 : 0.5, borderColor: line === i ? t.colors.acc : t.ring }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.ink3, marginTop: 2 }}>{l2.t}</Text>
              <View style={{ flex: 1 }}>
                <LibLine l={l2} />
              </View>
              {l2.saved ? <Icon name="bank" s={15} w={2} c={t.colors.accD} /> : null}
            </Card>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export function ChunkSave({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [island, setIsland] = useState("Daily life");
  const [done, setDone] = useState(false);
  return (
    <Screen bottomPad={40}>
      <BackBar title="Save this as a phrase?" onBack={nav.pop} />
      <Card lg>
        <Serif style={{ fontSize: 22, color: t.colors.ink }}>take the plunge</Serif>
        <Text style={{ fontSize: 15, color: t.colors.ink2, marginTop: 6 }}>
          망설이다가 큰맘 먹고 실행하다 — finally do the thing you’d been hesitating about
        </Text>
        <View style={{ backgroundColor: t.colors.soft, borderRadius: 16, padding: 12, marginTop: 13 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3 }}>CONTEXT · 0:53</Text>
          <Serif style={{ fontSize: 15, fontStyle: "italic", lineHeight: 22, marginTop: 5, color: t.colors.ink }}>
            “So this year I’ll take the plunge and buy a nice pair of sunglasses.”
          </Serif>
        </View>
      </Card>
      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", marginBottom: 9, color: t.colors.ink }}>Which island does it belong to?</Text>
        <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>
          {["Daily life", "What I do", "Opinions", "New island…"].map((x) => (
            <Chip key={x} active={island === x} onPress={() => setIsland(x)}>
              {x}
            </Chip>
          ))}
        </View>
      </Card>
      <Card style={{ padding: 8 }}>
        <TextInput placeholder="Add a note for future-you (optional)" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, padding: 12, color: t.colors.ink }} />
      </Card>
      {!done ? (
        <>
          <Pill full icon="bank" onPress={() => setDone(true)}>
            Save to Phrase Bank
          </Pill>
          <View style={{ flexDirection: "row", gap: t.gap }}>
            <Pill tone="tint" full small onPress={() => setDone(true)}>
              Save and practice
            </Pill>
            <Pill tone="ghost" full small onPress={nav.pop}>
              Not now
            </Pill>
          </View>
        </>
      ) : (
        <Hero style={{ alignItems: "center" }}>
          <Serif style={{ fontSize: 22, lineHeight: 30, color: "#fff", textAlign: "center" }}>Saved to your {island} island.</Serif>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 7, textAlign: "center" }}>
            We’ll bring it back when it’s time to use it.
          </Text>
          <Pill tone="white" small onPress={nav.pop} textStyle={{ color: t.colors.accD }} style={{ marginTop: 14, shadowOpacity: 0 }}>
            Done
          </Pill>
        </Hero>
      )}
    </Screen>
  );
}
