// world.tsx — Studio tab: folio donut + topics, then a topic's story list,
// Story folio (versions / phrases / sessions), and a Version outline that talks.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, { Easing as REasing, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

import { deleteTalkSessionAudio, talkAudioUri } from "@/lib/talk-audio";
import { prepareTalkRecordingPlayback } from "@/lib/talk-audio-session";
import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Card, Chip as InputChip, EnterStagger, ExpandableCopy, Header, Icon, Pill, Screen, Sect, Serif, Stagger, SwipeRow, confirmDelete, toneColor } from "@/design/ui";
import { fetchSessionPhraseMemory, fetchStoryPhrases, type PhraseItem, type SessionPhraseLink } from "@/lib/phrases";
import { RowIconButton } from "./phrases";
import { usePhraseSpeech } from "@/hooks/use-phrase-speech";
import {
  createBeat,
  createMessage,
  createStory,
  deleteBeat,
  deleteTalkSession,
  ensureStoryDomain,
  fetchBeats,
  fetchDomains,
  fetchMessages,
  fetchStories,
  fetchStory,
  fetchStudioCollection,
  fetchTalkSessions,
  isLiveStory,
  archiveStory,
  setBeatPositions,
  updateBeat,
  updateStoryDomain,
  updateStorySummary,
  type Beat,
  type Domain,
  type Story,
  type StoryMessage,
  type StudioDomain,
  type TalkSession,
} from "@/lib/speaking-world";
import { storyPromptFor } from "@/lib/story-prompts";
import type { Nav } from "./nav";

const TONES = ["sage", "sky", "blush", "butter"];
const VERSION_PRESETS = [
  { label: "30-second version", seconds: 30 },
  { label: "Interview version", seconds: 90 },
  { label: "For a friend", seconds: 60 },
  { label: "The short version", seconds: 45 },
] as const;

function storyIdeasFor(domainName?: string | null): string[] {
  const name = (domainName ?? "").toLocaleLowerCase("en");
  if (name.includes("about")) return ["My design background", "What I believe", "How I got here", "A thing I’m proud of"];
  if (name.includes("work") || name.includes("study")) return ["Current project", "Why this role", "A win at work", "What I’m learning"];
  if (name.includes("experience")) return ["Moving abroad", "A hard season", "A trip that stayed", "A mistake I still use"];
  if (name.includes("daily")) return ["Morning routine", "How I rest", "A usual weekend", "Something I cook"];
  if (name.includes("idea")) return ["Something I learned", "A take on AI", "How I design", "A book that shifted me"];
  return ["My design background", "Current project", "A recent challenge", "Something I learned"];
}

const FOLIO_RING: Record<string, string> = {
  sage: "#8FB56A",
  sky: "#3B6EE1",
  blush: "#C9A0C4",
  butter: "#E0B85C",
};

function folioRing(tone: string, index: number): string {
  return FOLIO_RING[tone] ?? Object.values(FOLIO_RING)[index % 4];
}

const AnimatedRing = Reanimated.createAnimatedComponent(Circle);

// One donut slice that reveals itself as the shared sweep (0→C, clockwise
// from 12 o'clock) passes over its arc — so slices light up in order, like a
// chart drawing itself.
function DonutSlice({
  cx,
  r,
  stroke,
  color,
  start,
  len,
  c,
  progress,
}: {
  cx: number;
  r: number;
  stroke: number;
  color: string;
  start: number;
  len: number;
  c: number;
  progress: { value: number };
}) {
  const animatedProps = useAnimatedProps(() => {
    const sweep = progress.value * c;
    const visible = Math.min(Math.max(sweep - start, 0), len);
    return { strokeDasharray: [visible, c] };
  });
  return (
    <AnimatedRing
      cx={cx}
      cy={cx}
      r={r}
      stroke={color}
      strokeWidth={stroke}
      fill="none"
      strokeDashoffset={-start}
      strokeLinecap="butt"
      animatedProps={animatedProps}
      transform={`rotate(-90 ${cx} ${cx})`}
    />
  );
}

function FolioDonut({
  segments,
  track,
  size = 176,
  stroke = 22,
  animKey = 0,
}: {
  segments: { color: string; value: number }[];
  track: string;
  size?: number;
  stroke?: number;
  /** Bump to replay the clockwise fill (e.g. on tab focus). */
  animKey?: number;
}) {
  const cx = size / 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const gap = segments.length > 1 ? Math.min(10, c * 0.018) : 0;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(180, withTiming(1, { duration: 900, easing: REasing.out(REasing.cubic) }));
  }, [animKey, total, progress]);
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {total > 0
        ? segments.map((seg, index) => {
            const raw = (seg.value / total) * c;
            const len = Math.max(0, raw - gap);
            const node = (
              <DonutSlice
                key={`${seg.color}-${index}`}
                cx={cx}
                r={r}
                stroke={stroke}
                color={seg.color}
                start={offset}
                len={len}
                c={c}
                progress={progress}
              />
            );
            offset += raw;
            return node;
          })
        : null}
    </Svg>
  );
}

function Loading() {
  const t = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }}>
      <ActivityIndicator color={t.colors.acc} />
    </View>
  );
}
function ErrorCard({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 26 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Couldn’t load this</Text>
      <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{msg}</Text>
      <Pill tone="tint" small onPress={onRetry} style={{ marginTop: 14 }}>
        Retry
      </Pill>
    </Card>
  );
}

function StudioSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.28)", justifyContent: "flex-end" }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: t.colors.bg,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 22,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }}
          >
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 16 }} />
            <Serif style={{ fontSize: 24, color: t.colors.ink, textAlign: "center" }}>{title}</Serif>
            {subtitle ? (
              <Text style={{ fontSize: 13.5, color: t.colors.ink3, textAlign: "center", marginTop: 6, marginBottom: 14, lineHeight: 19 }}>{subtitle}</Text>
            ) : (
              <View style={{ height: 14 }} />
            )}
            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function DraftChip() {
  const t = useTheme();
  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: t.colors.ink3,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "600", color: t.colors.ink3 }}>Draft</Text>
    </View>
  );
}

function StoryListRow({
  story,
  onPress,
  onArchive,
}: {
  story: Story;
  onPress: () => void;
  onArchive: () => void;
}) {
  const t = useTheme();
  const live = isLiveStory(story);
  return (
    <SwipeRow
      onDelete={() =>
        confirmDelete({
          title: "Archive this story?",
          message: "It will leave this topic. Versions and talks stay attached if you restore it later.",
          deleteLabel: "Archive",
          onConfirm: onArchive,
        })
      }
    >
      <Card onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" s={18} c={t.colors.accD} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>
              {story.title}
            </Text>
            {live ? null : <DraftChip />}
          </View>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>
            {story.messageCount} version{story.messageCount === 1 ? "" : "s"}
          </Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>
    </SwipeRow>
  );
}

function NewStorySheet({
  open,
  domainId,
  domainName,
  domains,
  onClose,
  onCreated,
}: {
  open: boolean;
  domainId?: string | null;
  domainName?: string | null;
  domains: Domain[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTheme();
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string | null>(domainId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ideas = storyIdeasFor(domainName ?? domains.find((d) => d.id === picked)?.name);
  const locked = Boolean(domainId);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPicked(domainId ?? null);
    setError(null);
  }, [open, domainId]);

  const save = async (nextTitle: string) => {
    const name = nextTitle.trim();
    const topic = domainId ?? picked;
    if (!name || !topic || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createStory(topic, name);
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the story.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudioSheet
      open={open}
      title="New story"
      subtitle={locked ? `In ${domainName ?? "this part of your life"}` : "A drawer to keep shaping."}
      onClose={onClose}
    >
      <Card lg style={{ padding: 8 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. My design background"
          placeholderTextColor={t.colors.ink3}
          autoFocus={open}
          style={{ fontSize: 17, fontWeight: "600", padding: 12, color: t.colors.ink }}
        />
      </Card>
      <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
        {ideas.map((idea) => (
          <InputChip
            key={idea}
            active={title === idea}
            onPress={() => {
              if (!locked && !picked) {
                setError("Pick a part of your life first.");
                return;
              }
              void save(idea);
            }}
          >
            {idea}
          </InputChip>
        ))}
      </View>
      {locked ? null : (
        <>
          <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.accD, marginTop: 16, marginBottom: 8 }}>WHICH PART OF YOUR LIFE?</Text>
          <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>
            {domains.map((d) => (
              <InputChip key={d.id} active={picked === d.id} onPress={() => setPicked(d.id)}>
                {d.name}
              </InputChip>
            ))}
          </View>
        </>
      )}
      {error ? <Text style={{ fontSize: 13, color: "#E5484D", marginTop: 10 }}>{error}</Text> : null}
      <Pill
        full
        icon="plus"
        onPress={() => void save(title)}
        style={{ opacity: title.trim() && (domainId || picked) && !saving ? 1 : 0.45, marginTop: 16 }}
      >
        {saving ? <ActivityIndicator color="#fff" /> : "Add to studio"}
      </Pill>
    </StudioSheet>
  );
}

function NewVersionSheet({
  open,
  storyId,
  storyTitle,
  onClose,
  onCreated,
}: {
  open: boolean;
  storyId: string;
  storyTitle?: string;
  onClose: () => void;
  onCreated: (id: string, label: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTheme();

  const pick = async (label: string, seconds?: number) => {
    if (saving) return;
    setSaving(label);
    setError(null);
    try {
      const id = await createMessage(storyId, label, seconds);
      if (!id) throw new Error("Couldn’t create the version.");
      onCreated(id, label);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the version.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <StudioSheet
      open={open}
      title="New version"
      subtitle={storyTitle ? `How you’ll tell “${storyTitle}”` : "Pick a situation. We’ll open the outline."}
      onClose={onClose}
    >
      <View style={{ gap: 8 }}>
        {VERSION_PRESETS.map((preset) => (
          <Pressable
            key={preset.label}
            onPress={() => void pick(preset.label, preset.seconds)}
            style={({ pressed }) => ({
              minHeight: 52,
              borderRadius: 16,
              paddingHorizontal: 16,
              backgroundColor: pressed ? t.colors.soft : t.colors.card,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: saving && saving !== preset.label ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }}>{preset.label}</Text>
            {saving === preset.label ? <ActivityIndicator color={t.colors.acc} /> : <Text style={{ fontSize: 13, color: t.colors.ink3 }}>~{preset.seconds}s</Text>}
          </Pressable>
        ))}
      </View>
      {error ? <Text style={{ fontSize: 13, color: "#E5484D", marginTop: 10 }}>{error}</Text> : null}
    </StudioSheet>
  );
}

export function SpeakingWorldScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [collection, setCollection] = useState<StudioDomain[] | null>(null);
  const [recent, setRecent] = useState<TalkSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Native tabs keep this screen mounted, so replay the entrance cascade +
  // donut fill every time the tab regains focus.
  const [enterKey, setEnterKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterKey((k) => k + 1);
    }, []),
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [groups, sessions] = await Promise.all([fetchStudioCollection(), fetchTalkSessions(1)]);
      setCollection(groups);
      setRecent(sessions[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your studio.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const groups = collection ?? [];
  const topicCount = groups.length;
  const storyCount = groups.reduce((n, group) => n + group.stories.length, 0);
  const donutSegments = groups.map((group, i) => {
    const tone = group.domain.color ?? TONES[i % TONES.length];
    return { color: folioRing(tone, i), value: Math.max(group.stories.length, 0) };
  });

  return (
    <Screen>
      <View style={{ paddingHorizontal: 2, paddingTop: 4, paddingBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 }}>
        <Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>My Studio</Serif>
        <Avatar onPress={() => nav.push("settings")} />
      </View>

      {collection === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : (
        <>
          <EnterStagger key={`folio-${enterKey}`} i={0}>
          <Card lg style={{ paddingVertical: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Speaking folio</Text>
            <View style={{ alignItems: "center", marginTop: 8 }}>
              <View style={{ width: 176, height: 176, alignItems: "center", justifyContent: "center" }}>
                <FolioDonut segments={donutSegments.filter((seg) => seg.value > 0)} track={t.colors.soft} animKey={enterKey} />
                <View style={{ position: "absolute", alignItems: "center" }}>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: t.colors.ink }}>
                    {topicCount} Topic{topicCount === 1 ? "" : "s"}
                  </Text>
                  <Text style={{ fontSize: 14, color: t.colors.ink2, marginTop: 2 }}>
                    {storyCount} stor{storyCount === 1 ? "y" : "ies"}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
          </EnterStagger>

          <EnterStagger key={`insight-${enterKey}`} i={1}>
          <Pressable onPress={() => nav.push("studio")} style={t.shadowCard}>
            <LinearGradient
              colors={["#3D6FE0", "#6C9BF2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: t.r, paddingVertical: 15, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
                <Icon name="globe" s={21} c="#fff" />
              </View>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: "#fff" }}>Speaking insight</Text>
              <Icon name="chev" s={16} c="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </Pressable>
          </EnterStagger>

          <EnterStagger key={`topics-${enterKey}`} i={2} style={{ gap: t.gap }}>
          <Pressable
            onPress={() => nav.push("topicsList")}
            hitSlop={6}
            style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 2, paddingTop: 6 }}
          >
            <Serif style={{ fontSize: 22, color: t.colors.ink }}>Topics</Serif>
            <Icon name="chev" s={15} w={2.4} c={t.colors.ink3} />
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // Vertical breathing room inside the clip bounds, so card shadows
            // (reach ≈ 18pt) aren't cut at the strip's edges.
            style={{ marginHorizontal: -18, marginVertical: -20 }}
            contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 20, gap: 10 }}
          >
            {groups.map((group, i) => {
              const tone = group.domain.color ?? TONES[i % TONES.length];
              const n = group.stories.length;
              return (
                <Pressable
                  key={group.domain.id}
                  onPress={() => nav.push("domain", { id: group.domain.id, name: group.domain.name })}
                  style={({ pressed }) => [
                    {
                      width: 150,
                      height: 150,
                      borderRadius: 22,
                      padding: 16,
                      backgroundColor: toneColor(t, tone),
                      justifyContent: "space-between",
                      opacity: pressed ? 0.88 : 1,
                    },
                    t.shadowCard,
                  ]}
                >
                  <Text style={{ fontSize: 18, fontWeight: "800", color: t.colors.onB }} numberOfLines={3}>
                    {group.domain.name}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.onB2 }}>
                    {n > 0 ? `${n} stor${n === 1 ? "y" : "ies"}` : "Empty drawer"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          </EnterStagger>

          {recent ? (
            <EnterStagger key={`recent-${enterKey}`} i={3} style={{ gap: t.gap }}>
              <Pressable
                onPress={() => nav.push("sessionsList")}
                hitSlop={6}
                style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 2, paddingTop: 6 }}
              >
                <Serif style={{ fontSize: 22, color: t.colors.ink }}>Recently recorded</Serif>
                <Icon name="chev" s={15} w={2.4} c={t.colors.ink3} />
              </Pressable>
              <SessionRow
                session={recent}
                onOpen={() => nav.push("session", { session: recent })}
                onConfirmDelete={() => {
                  deleteTalkSession(recent.id)
                    .then(() => void load())
                    .catch((e) => Alert.alert("Couldn’t delete", e instanceof Error ? e.message : "Try again."));
                }}
              />
            </EnterStagger>
          ) : null}
        </>
      )}
    </Screen>
  );
}

export function TopicsListScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [collection, setCollection] = useState<StudioDomain[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCollection(await fetchStudioCollection());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load topics.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <Stagger>
        <Header title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Topics</Serif>} />
      </Stagger>
      {collection === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : (
        <Stagger startIndex={1}>
        {(collection ?? []).map((group, i) => {
          const tone = group.domain.color ?? TONES[i % TONES.length];
          const n = group.stories.length;
          return (
            <Card
              key={group.domain.id}
              onPress={() => nav.push("domain", { id: group.domain.id, name: group.domain.name })}
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: toneColor(t, tone) }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>{group.domain.name}</Text>
                <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>
                  {n > 0 ? `${n} stor${n === 1 ? "y" : "ies"}` : "No stories yet"}
                </Text>
              </View>
              <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
            </Card>
          );
        })}
        </Stagger>
      )}
      <EnterStagger i={1 + (collection?.length ?? 0)}>
      <Card onPress={() => nav.push("recs")} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
        <View style={{ width: 38, height: 38, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" s={18} c={t.colors.accD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Recommendations</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 1 }}>Ideas to grow your speaking world</Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>
      </EnterStagger>
    </Screen>
  );
}

// Duration mm:ss and a compact relative time for the sessions list.
function fmtDur(s: number | null): string {
  const v = Math.max(0, Math.round(s ?? 0));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// One session row — a swipe-to-delete card shared by the Sessions tab (with the
// story title) and a Story's own Sessions section (showStory=false, since every
// row belongs to the same story there).
function SessionRow({
  session,
  onOpen,
  onConfirmDelete,
  showStory = true,
}: {
  session: TalkSession;
  onOpen: () => void;
  onConfirmDelete: () => void;
  showStory?: boolean;
}) {
  const t = useTheme();
  const transcript = session.transcript?.trim() || "No words were captured.";
  return (
    <SwipeRow
      onDelete={() =>
        confirmDelete({
          title: "Delete this session?",
          message: "This self-talk session and its transcript will be removed.",
          deleteLabel: "Delete",
          onConfirm: onConfirmDelete,
        })
      }
    >
      <Card onPress={onOpen} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ alignItems: "center", gap: 3, width: 44 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic" s={17} c={t.colors.accD} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: "700", color: t.colors.accD }}>{fmtDur(session.durationSeconds)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {showStory ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>
                {session.storyTitle ?? "Free talk"}
              </Text>
              <Text style={{ fontSize: 12, color: t.colors.ink3 }}>{relTime(session.createdAt)}</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.colors.ink3 }}>{relTime(session.createdAt)}</Text>
          )}
          <Text
            style={{ fontSize: showStory ? 13 : 14.5, fontWeight: showStory ? "400" : "600", color: showStory ? t.colors.ink3 : t.colors.ink, marginTop: 3, lineHeight: 19 }}
            numberOfLines={2}
          >
            {transcript}
          </Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>
    </SwipeRow>
  );
}

export function SessionsScreen({ nav, stacked }: { nav: Nav; stacked?: boolean }) {
  const t = useTheme();
  const [sessions, setSessions] = useState<TalkSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSessions(await fetchTalkSessions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your sessions.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Optimistically drop the row, then delete; restore it if the delete fails.
  const removeSession = useCallback(async (id: string) => {
    let prev: TalkSession[] | null = null;
    setSessions((xs) => {
      prev = xs;
      return (xs ?? []).filter((s) => s.id !== id);
    });
    try {
      await deleteTalkSession(id);
    } catch (e) {
      setSessions(prev);
      Alert.alert("Couldn’t delete", e instanceof Error ? e.message : "Try again.");
    }
  }, []);

  const total = sessions?.length ?? 0;

  return (
    <Screen>
      {stacked ? <BackBar onBack={nav.pop} /> : null}
      <Stagger>
        <Header
          eyebrow={stacked ? undefined : "Sessions"}
          title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Your sessions</Serif>}
          sub={total > 0 ? `${total} time${total === 1 ? "" : "s"} you sat down and talked.` : "Every self-talk session lands here."}
          right={stacked ? undefined : <Avatar onPress={() => nav.push("settings")} />}
        />
      </Stagger>

      {sessions === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : total === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 30 }}>
          <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic" s={20} c={t.colors.accD} />
          </View>
          <Serif style={{ fontSize: 20, color: t.colors.ink, marginTop: 14 }}>No sessions yet</Serif>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19, paddingHorizontal: 8 }}>
            Tap the mic and just talk. What you say is turned to text and saved here.
          </Text>
          <Pill icon="mic" onPress={() => nav.startTalk({ ctx: "Free talk", from: "sessions" })} style={{ marginTop: 16 }}>
            Start a session
          </Pill>
        </Card>
      ) : (
        <Stagger startIndex={1}>
          {(sessions ?? []).map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              onOpen={() => nav.push("session", { session: s })}
              onConfirmDelete={() => removeSession(s.id)}
            />
          ))}
        </Stagger>
      )}
    </Screen>
  );
}

export function SessionDetail({ session, nav }: { session?: TalkSession; nav: Nav }) {
  const t = useTheme();
  // Hooks run unconditionally (before any early return). The recording, if any,
  // is a local file resolved from the session's audio_key.
  const [deleted, setDeleted] = useState(false);
  const [memory, setMemory] = useState<{ used: SessionPhraseLink[]; recommended: SessionPhraseLink[] } | null>(null);
  const audioUri = session && !deleted ? talkAudioUri(session.audioKey) : null;
  const player = useAudioPlayer(audioUri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!session?.id) return;
    let active = true;
    fetchSessionPhraseMemory(session.id)
      .then((result) => {
        if (active) setMemory(result);
      })
      .catch(() => {
        if (active) setMemory({ used: [], recommended: [] });
      });
    return () => {
      active = false;
    };
  }, [session?.id]);

  if (!session) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <ErrorCard msg="This session couldn’t be opened." onRetry={nav.pop} />
      </Screen>
    );
  }

  const togglePlay = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration) player.seekTo(0);
    // The speech recognizer leaves iOS in playAndRecord + measurement mode.
    // Preserve the category (so we do not regress the next STT session), but
    // restore normal output processing and default the built-in route to the
    // loudspeaker before playback. A connected headset/Bluetooth route still
    // wins over defaultToSpeaker.
    await prepareTalkRecordingPlayback();
    player.play();
  };
  const deleteRecording = () =>
    confirmDelete({
      title: "Delete this recording?",
      message: "The audio for this session will be removed from your device.",
      deleteLabel: "Delete",
      onConfirm: async () => {
        try {
          player.pause();
          await deleteTalkSessionAudio(session.id, session.audioKey);
          setDeleted(true);
        } catch (e) {
          Alert.alert("Couldn’t delete", e instanceof Error ? e.message : "Try again.");
        }
      },
    });

  return (
    <Screen>
      <BackBar title={session.storyTitle ?? "Free talk"} onBack={nav.pop} />
      <Stagger>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2, paddingTop: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: t.colors.accD }}>{fmtDur(session.durationSeconds)}</Text>
        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: t.colors.ink3 }} />
        <Text style={{ fontSize: 13, color: t.colors.ink3 }}>{relTime(session.createdAt)}</Text>
      </View>

      {audioUri ? (
        (() => {
          const dur = status.duration > 0 ? status.duration : (session.durationSeconds ?? 0);
          const pct = dur > 0 ? Math.min(100, (status.currentTime / dur) * 100) : 0;
          return (
            <Card style={{ gap: 13 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Pressable
                  onPress={togglePlay}
                  style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name={status.playing ? "pause" : "play"} s={22} c="#fff" />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Your recording</Text>
                  <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>Play back your self-talk · on this device</Text>
                </View>
                <Pill tone="tint" small onPress={deleteRecording}>
                  Delete
                </Pill>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.accD, width: 38, fontVariant: ["tabular-nums"] }}>{fmtDur(status.currentTime)}</Text>
                <View style={{ flex: 1, height: 5, borderRadius: 9999, backgroundColor: t.colors.soft, overflow: "hidden" }}>
                  <View style={{ width: `${pct}%`, height: "100%", backgroundColor: t.colors.acc, borderRadius: 9999 }} />
                </View>
                <Text style={{ fontSize: 12, color: t.colors.ink3, width: 38, textAlign: "right", fontVariant: ["tabular-nums"] }}>{fmtDur(dur)}</Text>
              </View>
            </Card>
          );
        })()
      ) : null}

      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 4 }}>WHAT YOU SAID</Text>
      <Card>
        <ExpandableCopy text={session.transcript ?? ""} style={{ fontSize: 16, lineHeight: 25 }} />
      </Card>
      {memory && (memory.used.length || memory.recommended.length) ? (
        <>
          {memory.used.length ? (
            <>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 4 }}>PHRASES YOU USED</Text>
              {memory.used.map((item) => (
                <Card key={`used-${item.id ?? item.text}`}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{item.text}</Text>
                </Card>
              ))}
            </>
          ) : null}
          {memory.recommended.length ? (
            <>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 2 }}>RECOMMENDED FOR THIS SESSION</Text>
              {memory.recommended.map((item) => (
                <Card key={`rec-${item.id ?? item.text}`}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{item.text}</Text>
                </Card>
              ))}
            </>
          ) : null}
        </>
      ) : null}
      <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: session.storyTitle ?? "Free talk", storyId: session.storyId, from: "topics" })} style={{ marginTop: 4 }}>
        Talk again
      </Pill>
      </Stagger>
    </Screen>
  );
}

export function DomainScreen({ id, name, nav }: { id: string; name?: string; nav: Nav }) {
  const t = useTheme();
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStories(await fetchStories(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load stories.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const removeStory = useCallback(
    async (storyId: string) => {
      let prev: Story[] | null = null;
      setStories((xs) => {
        prev = xs;
        return (xs ?? []).filter((s) => s.id !== storyId);
      });
      try {
        await archiveStory(storyId);
      } catch (e) {
        setStories(prev);
        Alert.alert("Couldn’t archive", e instanceof Error ? e.message : "Try again.");
      }
    },
    [],
  );

  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <Stagger>
      <View style={{ paddingHorizontal: 2, paddingTop: 4 }}>
        <Serif style={{ fontSize: 32, lineHeight: 35, color: t.colors.ink }}>{name ?? "This part of life"}</Serif>
        <Text style={{ fontSize: 14.5, color: t.colors.ink2, marginTop: 8, lineHeight: 21 }}>
          The stories you want to be able to tell in this part of your life.
        </Text>
      </View>
      <Sect title="Stories" action="+ New story" onAction={() => setSheetOpen(true)} />
      </Stagger>
      {stories === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : !stories || stories.length === 0 ? (
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={{
            marginTop: 8,
            minHeight: 100,
            borderRadius: 22,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: t.colors.ink3,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.ink3, textAlign: "center" }}>
            An empty drawer. Tap to start a story.
          </Text>
        </Pressable>
      ) : (
        <Stagger startIndex={2}>
          {stories.map((s) => (
            <StoryListRow
              key={s.id}
              story={s}
              onPress={() => nav.push("story", { id: s.id, title: s.title, domainId: id, domainName: name })}
              onArchive={() => void removeStory(s.id)}
            />
          ))}
        </Stagger>
      )}
      <NewStorySheet
        open={sheetOpen}
        domainId={id}
        domainName={name}
        domains={[]}
        onClose={() => setSheetOpen(false)}
        onCreated={() => void load()}
      />
    </Screen>
  );
}

const DEFAULT_BEAT_ROW = 52;

function targetBeatIndex(from: number, dy: number, heights: number[], count: number): number {
  if (count <= 1) return from;
  let acc = 0;
  let i = from;
  if (dy >= 0) {
    while (i < count - 1) {
      const nextH = heights[i + 1] ?? DEFAULT_BEAT_ROW;
      if (dy - acc < nextH * 0.5) break;
      acc += nextH;
      i += 1;
    }
  } else {
    const dist = -dy;
    while (i > 0) {
      const prevH = heights[i - 1] ?? DEFAULT_BEAT_ROW;
      if (dist - acc < prevH * 0.5) break;
      acc += prevH;
      i -= 1;
    }
  }
  return i;
}

function StoryDescription({
  storyId,
  title,
  savedSummary,
  onSaved,
}: {
  storyId: string;
  title: string;
  savedSummary: string | null;
  onSaved: (summary: string | null) => void;
}) {
  const t = useTheme();
  const builtin = storyPromptFor(title);
  const [text, setText] = useState(savedSummary ?? "");

  useEffect(() => {
    setText(savedSummary ?? "");
  }, [storyId, savedSummary]);

  if (builtin) {
    return (
      <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 4 }}>
        {builtin}
      </Text>
    );
  }

  return (
    <View style={{ backgroundColor: t.colors.soft, borderRadius: t.r, overflow: "hidden" }}>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => {
          const next = text.trim();
          setText(next);
          const previous = (savedSummary ?? "").trim();
          if (next === previous) return;
          updateStorySummary(storyId, next || null).then(() => onSaved(next || null)).catch(() => {});
        }}
        placeholder="Add a description"
        placeholderTextColor={t.colors.ink3}
        multiline
        textAlignVertical="top"
        style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2, padding: t.padc, minHeight: 76 }}
      />
    </View>
  );
}

function BeatRow({
  beat,
  index,
  last,
  onChangeText,
  onCommit,
  onReorder,
  onLockScroll,
  onLayoutHeight,
}: {
  beat: Beat;
  index: number;
  last: boolean;
  onChangeText: (id: string, text: string) => void;
  onCommit: (id: string, text: string) => void;
  onReorder: (from: number, dy: number) => void;
  onLockScroll: (locked: boolean) => void;
  onLayoutHeight: (index: number, height: number) => void;
}) {
  const t = useTheme();
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(160)
        .runOnJS(true)
        .onStart(() => {
          active.current = true;
          setDragging(true);
          onLockScroll(true);
        })
        .onUpdate((e) => {
          setDy(e.translationY);
        })
        .onFinalize((e) => {
          const was = active.current;
          const translation = e.translationY;
          active.current = false;
          setDragging(false);
          setDy(0);
          onLockScroll(false);
          if (was) onReorder(index, translation);
        }),
    [index, onLockScroll, onReorder],
  );

  return (
    <View
      onLayout={(e) => onLayoutHeight(index, e.nativeEvent.layout.height)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: DEFAULT_BEAT_ROW,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.sep,
        zIndex: dragging ? 4 : 0,
        elevation: dragging ? 4 : 0,
        backgroundColor: t.colors.card,
        transform: [{ translateY: dy }, { scale: dragging ? 1.015 : 1 }],
        shadowColor: dragging ? "#000" : "transparent",
        shadowOpacity: dragging ? 0.1 : 0,
        shadowRadius: dragging ? 10 : 0,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.colors.accD }}>{index + 1}</Text>
      </View>
      <TextInput
        value={beat.text}
        onChangeText={(v) => onChangeText(beat.id, v)}
        onEndEditing={(e) => onCommit(beat.id, e.nativeEvent.text)}
        placeholder="A key point…"
        placeholderTextColor={t.colors.ink3}
        multiline
        style={{ flex: 1, fontSize: 15, fontWeight: "600", color: t.colors.ink, paddingVertical: 8 }}
      />
      <GestureDetector gesture={pan}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Reorder"
          onTouchStart={() => onLockScroll(true)}
          onTouchEnd={() => {
            if (!active.current) onLockScroll(false);
          }}
          onTouchCancel={() => {
            if (!active.current) onLockScroll(false);
          }}
          style={{ width: 32, height: 36, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="grip" s={18} w={2.2} c={t.colors.ink3} />
        </View>
      </GestureDetector>
    </View>
  );
}

export function StoryScreen({
  id,
  title,
  domainId: domainIdProp,
  domainName: domainNameProp,
  nav,
}: {
  id: string;
  title?: string;
  domainId?: string;
  domainName?: string;
  nav: Nav;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<StoryMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TalkSession[] | null>(null);
  const [storyTitle, setStoryTitle] = useState(title ?? "Story");
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryReady, setSummaryReady] = useState(false);
  const [domainId, setDomainId] = useState<string | null>(domainIdProp ?? null);
  const [domainName, setDomainName] = useState<string | null>(domainNameProp ?? null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [savingMove, setSavingMove] = useState(false);
  const [versionSheet, setVersionSheet] = useState(false);
  const [phrases, setPhrases] = useState<{ id: string; text: string; translation: string | null }[] | null>(null);
  const phraseSpeech = usePhraseSpeech();

  const load = useCallback(async () => {
    setError(null);
    try {
      setMessages(await fetchMessages(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load versions.");
    }
  }, [id]);
  // Sessions load on their own — a failure here shouldn't hide the versions.
  const loadSessions = useCallback(async () => {
    try {
      setSessions(await fetchTalkSessions(100, id));
    } catch {
      setSessions([]);
    }
  }, [id]);
  const loadPhrases = useCallback(async () => {
    try {
      setPhrases(await fetchStoryPhrases(id));
    } catch {
      setPhrases([]);
    }
  }, [id]);
  const loadStory = useCallback(async () => {
    setSummaryReady(false);
    try {
      const story = await fetchStory(id);
      if (story) {
        setStoryTitle(story.title);
        setSummary(story.summary);
        let nextDomainId = story.domainId;
        let nextDomainName = story.domainName;
        if (!nextDomainId) {
          try {
            const assigned = await ensureStoryDomain(story.id, story.title, story.domainId);
            if (assigned) {
              nextDomainId = assigned.domainId;
              nextDomainName = assigned.domainName;
            }
          } catch {
            // Chip stays hidden if we couldn't attach a topic.
          }
        }
        setDomainId(nextDomainId);
        setDomainName(nextDomainName);
      }
    } catch {
      // Title from nav is enough to show the built-in prompt.
    } finally {
      setSummaryReady(true);
    }
  }, [id]);
  useEffect(() => {
    load();
    loadSessions();
    loadStory();
    loadPhrases();
  }, [load, loadSessions, loadStory, loadPhrases]);

  // Optimistically drop the row, then delete; restore it if the delete fails.
  const removeSession = useCallback(async (sid: string) => {
    let prev: TalkSession[] | null = null;
    setSessions((xs) => {
      prev = xs;
      return (xs ?? []).filter((s) => s.id !== sid);
    });
    try {
      await deleteTalkSession(sid);
    } catch (e) {
      setSessions(prev);
      Alert.alert("Couldn’t delete", e instanceof Error ? e.message : "Try again.");
    }
  }, []);

  const openMove = useCallback(() => {
    setMoveOpen(true);
    setMoveError(null);
    fetchDomains()
      .then(setDomains)
      .catch((e) => setMoveError(e instanceof Error ? e.message : "Couldn’t load topics."));
  }, []);

  const pickTopic = useCallback(
    async (next: Domain) => {
      if (savingMove) return;
      if (next.id === domainId) {
        setMoveOpen(false);
        return;
      }
      setSavingMove(true);
      try {
        await updateStoryDomain(id, next.id);
        setDomainId(next.id);
        setDomainName(next.name);
        setMoveOpen(false);
      } catch (e) {
        Alert.alert("Couldn’t move this story", e instanceof Error ? e.message : "Try again.");
      } finally {
        setSavingMove(false);
      }
    },
    [domainId, id, savingMove],
  );

  return (
    <>
    <Screen>
      <BackBar
        onBack={nav.pop}
        right={
          <Pressable
            onPress={openMove}
            style={{
              maxWidth: 188,
              height: 34,
              borderRadius: 9999,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              backgroundColor: t.colors.accS,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: t.colors.accD, flexShrink: 1 }} numberOfLines={1}>
              {domainName ?? "Choose topic"}
            </Text>
            <View style={{ transform: [{ rotate: "90deg" }] }}>
              <Icon name="chev" s={11} w={2.4} c={t.colors.accD} />
            </View>
          </Pressable>
        }
      />
      <Stagger>
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 30, lineHeight: 33, color: t.colors.ink }}>{storyTitle}</Serif>
      </View>
      {summaryReady || storyPromptFor(storyTitle) ? (
        <StoryDescription storyId={id} title={storyTitle} savedSummary={summary} onSaved={setSummary} />
      ) : (
        <View style={{ minHeight: 28 }} />
      )}

      <Sect title="Versions" action="+ New version" onAction={() => setVersionSheet(true)} />
      {messages === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : !messages || messages.length === 0 ? (
        <Pressable
          onPress={() => setVersionSheet(true)}
          style={{
            marginTop: 8,
            minHeight: 108,
            borderRadius: 22,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: t.colors.ink3,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 18,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink3, textAlign: "center" }}>Start a version</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>
            A 30-second take, an interview take, a version for a friend.
          </Text>
        </Pressable>
      ) : (
        messages.map((m) => (
          <Card key={m.id} onPress={() => nav.push("message", { id: m.id, label: m.label, storyId: id, storyTitle })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
              <Icon name="text" s={18} c={t.colors.accD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }}>{m.label}</Text>
              {m.targetSeconds ? <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>~{m.targetSeconds}s</Text> : null}
            </View>
            <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
          </Card>
        ))
      )}

      <Sect title="Useful phrases" style={{ marginTop: 6 }} />
      {phrases === null ? (
        <Loading />
      ) : phrases.length === 0 ? (
        <View style={{ minHeight: 84, borderRadius: 22, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.colors.ink3, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
          <Text style={{ fontSize: 13.5, color: t.colors.ink3, lineHeight: 20, textAlign: "center" }}>
            Phrases you catch while talking this story will land here.
          </Text>
        </View>
      ) : (
        phrases.map((p) => (
          <Card key={p.id} style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>{p.text}</Text>
              {p.translation ? <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }} numberOfLines={1}>{p.translation}</Text> : null}
            </View>
            <RowIconButton
              label={phraseSpeech.speakingId === p.id ? "Stop voice" : "Play AI voice"}
              icon={phraseSpeech.speakingId === p.id ? "pause" : "speaker"}
              active={phraseSpeech.speakingId === p.id}
              loading={phraseSpeech.loadingId === p.id}
              onPress={() => phraseSpeech.toggle(p.id, p.text)}
            />
            <RowIconButton
              label="Practice this phrase"
              icon="mic"
              // Quick Rehearsal only reads id/text/translation, so the story's
              // slim phrase row is enough.
              onPress={() => {
                phraseSpeech.stop();
                nav.push("rehearsal", { item: p as PhraseItem });
              }}
            />
          </Card>
        ))
      )}

      <Sect title="Sessions" style={{ marginTop: 6 }} />
      {sessions === null ? (
        <Loading />
      ) : sessions.length === 0 ? (
        <View style={{ minHeight: 84, borderRadius: 22, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.colors.ink3, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
          <Text style={{ fontSize: 13.5, color: t.colors.ink3, lineHeight: 20, textAlign: "center" }}>
            No sessions yet. Open a version and talk.
          </Text>
        </View>
      ) : (
        sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            showStory={false}
            onOpen={() => nav.push("session", { session: s })}
            onConfirmDelete={() => removeSession(s.id)}
          />
        ))
      )}

      <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: storyTitle, from: "topics", storyId: id })} style={{ marginTop: 10 }}>
        Talk this story
      </Pill>
      <Text style={{ textAlign: "center", fontSize: 13, color: t.colors.ink3, marginTop: -4 }}>Rambling is welcome.</Text>
      </Stagger>
    </Screen>
    <NewVersionSheet
      open={versionSheet}
      storyId={id}
      storyTitle={storyTitle}
      onClose={() => setVersionSheet(false)}
      onCreated={(vid, vlabel) => {
        void load();
        nav.push("message", { id: vid, label: vlabel, storyId: id, storyTitle });
      }}
    />
    <Modal visible={moveOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { if (!savingMove) setMoveOpen(false); }}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.28)", justifyContent: "flex-end" }} onPress={() => { if (!savingMove) setMoveOpen(false); }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{ backgroundColor: t.colors.bg, borderTopLeftRadius: 38, borderTopRightRadius: 38, paddingHorizontal: 22, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 18) + 8 }}
        >
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 18 }} />
          <Serif style={{ fontSize: 22, color: t.colors.ink, textAlign: "center", marginBottom: 14 }}>Move story</Serif>
          {domains === null && !moveError ? (
            <View style={{ paddingVertical: 28, alignItems: "center" }}>
              <ActivityIndicator color={t.colors.acc} />
            </View>
          ) : moveError ? (
            <ErrorCard msg={moveError} onRetry={openMove} />
          ) : (
            (domains ?? []).map((d, i) => (
              <Pressable
                key={d.id}
                onPress={() => void pickTopic(d)}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 4,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: t.colors.sep,
                  backgroundColor: pressed ? t.colors.soft : "transparent",
                  opacity: savingMove ? 0.6 : 1,
                })}
              >
                <Text style={{ flex: 1, fontSize: 16, fontWeight: d.id === domainId ? "700" : "600", color: t.colors.ink }}>{d.name}</Text>
                {d.id === domainId ? <Icon name="check" s={18} w={2.4} c={t.colors.accD} /> : null}
              </Pressable>
            ))
          )}
          <Pill tone="ghost" onPress={savingMove ? undefined : () => setMoveOpen(false)} style={{ alignSelf: "center", marginTop: 16 }}>
            Cancel
          </Pill>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

export function MessageScreen({ id, label, storyId, storyTitle, nav }: { id?: string; label?: string; storyId?: string; storyTitle?: string; nav: Nav }) {
  const t = useTheme();
  const [beats, setBeats] = useState<Beat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [busy, setBusy] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const heights = useRef<number[]>([]);
  const beatsRef = useRef<Beat[] | null>(null);
  beatsRef.current = beats;

  const load = useCallback(async () => {
    if (!id) {
      setBeats([]);
      return;
    }
    setError(null);
    try {
      setBeats(await fetchBeats(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load this outline.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const editLocal = useCallback((beatId: string, text: string) => {
    setBeats((bs) => (bs ?? []).map((b) => (b.id === beatId ? { ...b, text } : b)));
  }, []);

  const commitBeat = useCallback(
    (beatId: string, text: string) => {
      updateBeat(beatId, text).catch(() => load());
    },
    [load],
  );

  const addBeat = async () => {
    if (!id || !newText.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createBeat(id, newText, (beats ?? []).length);
      setNewText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add that.");
    } finally {
      setBusy(false);
    }
  };

  const removeBeat = useCallback(
    async (beatId: string) => {
      setBeats((bs) => (bs ?? []).filter((b) => b.id !== beatId));
      try {
        await deleteBeat(beatId);
      } catch {
        await load();
      }
    },
    [load],
  );

  const reorder = useCallback(
    async (from: number, dy: number) => {
      const bs = beatsRef.current ?? [];
      const to = targetBeatIndex(from, dy, heights.current, bs.length);
      if (to === from || to < 0 || to >= bs.length) return;
      const next = [...bs];
      const [item] = next.splice(from, 1);
      if (!item) return;
      next.splice(to, 0, item);
      const positioned = next.map((b, i) => ({ ...b, position: i }));
      setBeats(positioned);
      try {
        await setBeatPositions(positioned.map((b) => ({ id: b.id, position: b.position })));
      } catch {
        await load();
      }
    },
    [load],
  );

  const onLayoutHeight = useCallback((index: number, height: number) => {
    heights.current[index] = height;
  }, []);

  const list = beats ?? [];

  return (
    <Screen scrollEnabled={!scrollLocked}>
      <BackBar title={label ?? "Version"} onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 4 }}>
        <Serif style={{ fontSize: 22, color: t.colors.ink }}>Your outline</Serif>
        <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>The points you want to hit. Tap to edit, then talk it.</Text>
      </View>

      {beats === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : list.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <Serif style={{ fontSize: 20, color: t.colors.ink }}>No outline yet</Serif>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>Add the key points below.</Text>
        </Card>
      ) : (
        <Card style={{ paddingVertical: 2, overflow: "visible" }}>
          {list.map((b, i) => (
            <SwipeRow
              key={b.id}
              onDelete={() =>
                confirmDelete({
                  title: "Delete this point?",
                  deleteLabel: "Delete",
                  onConfirm: () => removeBeat(b.id),
                })
              }
            >
              <BeatRow
                beat={b}
                index={i}
                last={i === list.length - 1}
                onChangeText={editLocal}
                onCommit={commitBeat}
                onReorder={reorder}
                onLockScroll={setScrollLocked}
                onLayoutHeight={onLayoutHeight}
              />
            </SwipeRow>
          ))}
        </Card>
      )}

      {id ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[{ flex: 1, backgroundColor: t.colors.card, borderRadius: t.r, paddingHorizontal: 14 }, t.shadowCard]}>
            <TextInput
              value={newText}
              onChangeText={setNewText}
              placeholder="Add a point…"
              placeholderTextColor={t.colors.ink3}
              onSubmitEditing={addBeat}
              returnKeyType="done"
              style={{ fontSize: 15, color: t.colors.ink, paddingVertical: 13 }}
            />
          </View>
          <Pill icon="plus" onPress={addBeat} style={{ opacity: newText.trim() && !busy ? 1 : 0.45, width: 52, height: 52, paddingHorizontal: 0 }} />
        </View>
      ) : null}

      <Pill
        full
        icon="mic"
        onPress={() => nav.startTalk({
          ctx: storyTitle ?? "This story",
          sub: label,
          beats: list.length ? list.map((beat) => beat.text) : null,
          from: "topics",
          storyId: storyId ?? null,
          messageId: id ?? null,
        })}
        style={{ marginTop: 4 }}
      >
        Talk this version
      </Pill>
    </Screen>
  );
}

export function MessageCreate({ storyId, storyTitle, nav }: { storyId?: string; storyTitle?: string; nav: Nav }) {
  const t = useTheme();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (label: string, seconds?: number) => {
    if (!storyId || saving) return;
    setSaving(label);
    setError(null);
    try {
      const id = await createMessage(storyId, label, seconds);
      if (!id) throw new Error("Couldn’t create the version.");
      nav.pop();
      nav.push("message", { id, label, storyId, storyTitle });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the version.");
      setSaving(null);
    }
  };

  return (
    <Screen>
      <BackBar title="New version" onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 28, lineHeight: 32, color: t.colors.ink }}>How you’ll tell{"\n"}this story</Serif>
        {storyTitle ? <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 8 }}>in “{storyTitle}”</Text> : null}
      </View>
      <View style={{ gap: 8, marginTop: 8 }}>
        {VERSION_PRESETS.map((preset) => (
          <Pressable
            key={preset.label}
            onPress={() => void pick(preset.label, preset.seconds)}
            style={({ pressed }) => ({
              minHeight: 52,
              borderRadius: 16,
              paddingHorizontal: 16,
              backgroundColor: pressed ? t.colors.soft : t.colors.card,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: saving && saving !== preset.label ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }}>{preset.label}</Text>
            {saving === preset.label ? <ActivityIndicator color={t.colors.acc} /> : <Text style={{ fontSize: 13, color: t.colors.ink3 }}>~{preset.seconds}s</Text>}
          </Pressable>
        ))}
      </View>
      {error ? <Text style={{ fontSize: 13, color: "#E5484D", paddingHorizontal: 4, marginTop: 10 }}>{error}</Text> : null}
    </Screen>
  );
}

export function RecsScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <Stagger>
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 30, letterSpacing: -0.3, color: t.colors.ink }}>Recommendations</Serif>
        <Text style={{ fontSize: 14.5, color: t.colors.ink2, marginTop: 7 }}>Ideas to grow your speaking world</Text>
      </View>
      <Card style={{ alignItems: "center", paddingVertical: 30 }}>
        <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" s={20} c={t.colors.accD} />
        </View>
        <Serif style={{ fontSize: 20, color: t.colors.ink, marginTop: 14, textAlign: "center" }}>Coming soon</Serif>
        <Text style={{ fontSize: 13.5, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 20, paddingHorizontal: 10 }}>
          Once you’ve talked through a few stories, AI will spot the empty areas of your world and suggest stories worth adding.
        </Text>
      </Card>
      </Stagger>
    </Screen>
  );
}
