// phrases.tsx — Phrase Bank tab: list + chart, detail, review flow. Backed by
// the canonical `phrase_items` collection; transcript bookmarks are separate.
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Reanimated, { Easing as REasing, FadeInLeft, FadeInRight, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { usePostHog } from "posthog-react-native";

import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Badge, Card, Chip, Header, Icon, Pill, Screen, Serif, Stagger, StatTile, SwipeRow, confirmDelete, type IconName } from "@/design/ui";
import { formatDuration } from "@/lib/library";
import { cumulativeSeries, deletePhrase, fetchPhrases, matchesStageFilter, nextReviewInterval, PHRASE_STAGE_FILTERS, phraseIsDue, setPhraseFavorite, setPhraseStage, submitVerdict, updatePhraseDetails, updatePhraseNote, type LearningStatus, type PhraseItem, type PhraseKind, type PhraseStageFilterId, type SrsVerdict } from "@/lib/phrases";
import { promptPhraseStage, shouldPromptStage } from "@/lib/daily-phrases";
import { usePhraseSpeech } from "@/hooks/use-phrase-speech";
import { useSegmentPlayer } from "@/hooks/use-segment-player";
import { QuickRehearsalScreen } from "./practice";
import { LibraryClipRow } from "./library";
import type { Nav } from "./nav";

const PHRASE_KINDS: { value: PhraseKind; label: string }[] = [
  { value: "phrase", label: "Expression" },
  { value: "phrasal_verb", label: "Phrasal verb" },
  { value: "pattern", label: "Pattern" },
  { value: "idiom", label: "Idiom" },
  { value: "word", label: "Word" },
];

// Fallback for mock callers (e.g. the Today tab still pushes a phrase by id).
const SAMPLE_PHRASE: PhraseItem = {
  id: "sample",
  text: "take the plunge",
  translation: "망설이다가 큰맘 먹고 실행하다",
  kind: "phrase",
  status: "Practicing",
  source: "Sample clip",
  context: "I’ll take the plunge and buy a nice pair of sunglasses.",
  contextTranslation: null,
  startSec: 53,
  endSec: 56,
  videoId: null,
  segmentId: null,
  usageNote: "Say this when you finally decide after hesitating.",
  memo: null,
  createdAt: "2026-07-25T00:00:00.000Z",
  dueAt: "2026-08-10T00:00:00.000Z",
  intervalDays: 3,
  easeFactor: 2.5,
  lapses: 0,
  lastReviewedAt: null,
  lastPracticedAt: null,
  learningStatus: "practicing",
  reviewPinUntil: null,
  reviewsSinceStage: 0,
  tags: [],
  favorite: false,
};

// Small round icon action for one-line list rows (AI voice / practice).
// Shared with the story folio's Useful-phrases rows.
export function RowIconButton({
  icon,
  label,
  onPress,
  active,
  loading,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: active ? t.colors.accS : t.colors.soft,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={t.colors.accD} />
      ) : (
        <Icon name={icon} s={15} w={2} c={active ? t.colors.accD : t.colors.ink2} />
      )}
    </Pressable>
  );
}

const AnimatedChartPath = Reanimated.createAnimatedComponent(Path);
const AnimatedChartDot = Reanimated.createAnimatedComponent(Circle);

function BankChart({ points, max }: { points: number[]; max: number }) {
  const t = useTheme();
  const W = 320;
  const H = 96;
  const mx = 6;
  const pts = points.length >= 2 ? points : [0, 0];
  const n = pts.length;
  const X = (i: number) => mx + (i * (W - 2 * mx)) / (n - 1);
  const Y = (v: number) => H - 8 - (v / Math.max(1, max)) * (H - 22);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  // Exact polyline length, so the dash-offset draw tracks the real path.
  const pathLen = pts.reduce((sum, v, i) => {
    if (i === 0) return 0;
    const dx = X(i) - X(i - 1);
    const dy = Y(v) - Y(pts[i - 1]);
    return sum + Math.hypot(dx, dy);
  }, 0);
  // The line draws itself from the left start point to the last point; the
  // area fill fades in underneath; the end dot pops once the line arrives.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(150, withTiming(1, { duration: 950, easing: REasing.out(REasing.cubic) }));
  }, [line, progress]);
  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLen * (1 - progress.value),
  }));
  const fillProps = useAnimatedProps(() => ({
    opacity: 0.55 * Math.min(1, progress.value * 1.4),
  }));
  const dotProps = useAnimatedProps(() => ({
    opacity: Math.min(1, Math.max(0, (progress.value - 0.85) / 0.15)),
  }));
  const ticks = Array.from(new Set([max, Math.round(max / 2), 0]));
  return (
    <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
      <Svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" height={130}>
        {ticks.map((v) => (
          <Fragment key={v}>
            <Line x1={mx} x2={W - mx} y1={Y(v)} y2={Y(v)} stroke={t.colors.sep} strokeWidth={1} strokeDasharray="2 4" />
            <SvgText x={W - mx} y={Y(v) - 4} textAnchor="end" fontSize={9} fontWeight="650" fill={t.colors.ink3}>
              {v || ""}
            </SvgText>
          </Fragment>
        ))}
        <AnimatedChartPath d={`${line}L${X(n - 1)},${H - 8}L${X(0)},${H - 8}Z`} fill={t.colors.accS} animatedProps={fillProps} />
        <AnimatedChartPath
          d={line}
          fill="none"
          stroke={t.colors.acc}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${pathLen} ${pathLen}`}
          animatedProps={lineProps}
        />
        <AnimatedChartDot cx={X(n - 1)} cy={Y(pts[pts.length - 1])} r={4.5} fill={t.colors.acc} stroke={t.colors.bg} strokeWidth={2.5} animatedProps={dotProps} />
        <SvgText x={mx} y={H + 10} textAnchor="start" fontSize={9.5} fontWeight="600" fill={t.colors.ink3}>
          earlier
        </SvgText>
        <SvgText x={W - mx} y={H + 10} textAnchor="end" fontSize={9.5} fontWeight="750" fill={t.colors.accD}>
          now
        </SvgText>
      </Svg>
    </View>
  );
}

export function PhrasesScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const speech = usePhraseSpeech();
  const [items, setItems] = useState<PhraseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [f, setF] = useState<PhraseStageFilterId>("all");
  const [searching, setSearching] = useState(false);
  // Incremental list: 10 rows first, more as the scroll nears the end. Filter
  // and search changes reset it at their call sites (not in an effect).
  const [visibleCount, setVisibleCount] = useState(10);
  const changeQuery = useCallback((value: string) => {
    setQ(value);
    setVisibleCount(10);
  }, []);
  const changeFilter = useCallback((value: PhraseStageFilterId) => {
    setF(value);
    setVisibleCount(10);
  }, []);
  // Replay the entrance cascade on tab focus (native tabs keep this mounted).
  const [enterKey, setEnterKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterKey((k) => k + 1);
    }, []),
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchPhrases());
    } catch {
      setError("Your saved phrases are still safe. Check your connection and try again.");
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

  // Optimistically drop the row, then delete; restore it if the delete fails.
  const removePhrase = useCallback(async (id: string) => {
    let prev: PhraseItem[] | null = null;
    setItems((xs) => {
      prev = xs;
      return (xs ?? []).filter((p) => p.id !== id);
    });
    try {
      await deletePhrase(id);
    } catch (e) {
      setItems(prev);
      Alert.alert("Couldn’t delete", e instanceof Error ? e.message : "Try again.");
    }
  }, []);

  // Left-swipe toggles the star. Optimistic, with rollback on failure.
  const toggleFav = useCallback(async (id: string, next: boolean) => {
    setItems((xs) => (xs ?? []).map((p) => (p.id === id ? { ...p, favorite: next } : p)));
    try {
      await setPhraseFavorite(id, next);
    } catch (e) {
      setItems((xs) => (xs ?? []).map((p) => (p.id === id ? { ...p, favorite: !next } : p)));
      Alert.alert("Couldn’t update", e instanceof Error ? e.message : "Try again.");
    }
  }, []);

  const all = items ?? [];
  const list = all.filter((p) => {
    const s = (p.text + (p.translation ?? "") + p.source + (p.usageNote ?? "") + (p.memo ?? "")).toLowerCase();
    if (q && !s.includes(q.toLowerCase())) return false;
    return matchesStageFilter(p, f);
  });

  const listLength = list.length;
  const handleScroll = useCallback(
    (event: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y > contentSize.height - 400) {
        setVisibleCount((count) => (count < listLength ? count + 10 : count));
      }
    },
    [listLength],
  );

  const collected = all.length;
  const dueNow = all.filter(phraseIsDue).length;
  const ready = all.filter((p) => p.learningStatus === "ready").length;
  const practiced = all.filter((p) => p.lastReviewedAt).length;
  const thisWeek = all.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 7 * 86_400_000).length;
  const chart = cumulativeSeries(all.map((p) => p.createdAt));

  const rows = (
    <View style={{ gap: 15 }}>
      {list.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 34 }}>
          <Serif style={{ fontSize: 20, color: t.colors.ink }}>{collected === 0 ? "No phrases yet" : "Nothing here"}</Serif>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>
            {collected === 0
              ? "Tap + to keep an expression from anywhere."
              : f === "starred"
                ? "Swipe a phrase right to star it."
                : "Try another word or filter."}
          </Text>
        </Card>
      ) : null}
      {list.slice(0, visibleCount).map((p) => (
        <SwipeRow
          key={p.id}
          favorited={p.favorite}
          onFavorite={() => toggleFav(p.id, !p.favorite)}
          onDelete={() =>
            confirmDelete({
              title: "Delete this phrase?",
              message: "It’ll be removed from your Phrase Bank.",
              deleteLabel: "Delete",
              onConfirm: () => removePhrase(p.id),
            })
          }
        >
          {/* One-line row: expression + icon actions. Meaning, source and stage
              live in the detail screen (tap the row). */}
          <Card
            onPress={() => nav.push("phrase", { item: p })}
            style={{ paddingVertical: 11, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", letterSpacing: -0.1, color: t.colors.ink }} numberOfLines={1}>
              {p.text}
            </Text>
            {p.favorite ? <Icon name="star" s={14} c={t.colors.acc} /> : null}
            <RowIconButton
              label={speech.speakingId === p.id ? "Stop voice" : "Play AI voice"}
              icon={speech.speakingId === p.id ? "pause" : "speaker"}
              active={speech.speakingId === p.id}
              loading={speech.loadingId === p.id}
              onPress={() => speech.toggle(p.id, p.text)}
            />
            <RowIconButton label="Practice this phrase" icon="mic" onPress={() => nav.push("review", { item: p })} />
          </Card>
        </SwipeRow>
      ))}
    </View>
  );

  return (
    <Screen
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.acc} />}
      onScroll={handleScroll}
    >
      <Stagger replayKey={enterKey}>
        <Header
          eyebrow="Your Phrase Bank"
          title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>English you chose{"\n"}to keep.</Serif>}
          right={<Avatar onPress={() => nav.push("settings")} />}
        />
      </Stagger>

      {items === null && !error ? (
        <View style={{ paddingVertical: 48, alignItems: "center" }}>
          <ActivityIndicator color={t.colors.acc} />
        </View>
      ) : error ? (
        <Card style={{ alignItems: "center", paddingVertical: 28 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Couldn’t load your phrases</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{error}</Text>
          <Pill tone="tint" small onPress={load} style={{ marginTop: 14, alignSelf: "center" }}>
            Retry
          </Pill>
        </Card>
      ) : (
        <Stagger replayKey={enterKey} startIndex={1}>
          <BankChart points={chart.points} max={chart.max} />

          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 2 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Summary</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>ALL TIME</Text>
          </View>
          <View style={{ gap: t.gap }}>
            <View style={{ flexDirection: "row", gap: t.gap }}>
              <StatTile chevron={false} tone="sky" label="Collected" value={String(collected)} unit="phrases" foot={`+${thisWeek} this week`} />
              <StatTile chevron={false} tone="butter" label="Practiced" value={String(practiced)} unit="phrases" foot="reviewed once+" />
            </View>
            <View style={{ flexDirection: "row", gap: t.gap }}>
              <StatTile chevron={false} tone="sage" label="Use on my own" value={String(ready)} unit="phrases" foot="Your active English" />
              <StatTile chevron={false} tone="blush" label="Need refresh" value={String(dueNow)} unit="phrases" foot="Quick refresh today" onPress={() => changeFilter("due")} />
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>History</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>{list.length} PHRASES</Text>
          </View>

          {/* Search expands in place, pushing the filter chips out; X collapses
              back without remounting the page. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44 }}>
            {searching ? (
              <Reanimated.View
                entering={FadeInLeft.duration(220)}
                style={[
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: t.colors.card,
                    borderRadius: 9999,
                    height: 44,
                    paddingHorizontal: 16,
                    borderWidth: 0.5,
                    borderColor: t.ring,
                  },
                  t.shadowCard,
                ]}
              >
                <Icon name="search" s={17} c={t.colors.ink3} />
                <TextInput
                  autoFocus
                  value={q}
                  onChangeText={changeQuery}
                  placeholder="Search"
                  placeholderTextColor={t.colors.ink3}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={{ flex: 1, minWidth: 0, margin: 0, paddingVertical: 0, fontSize: 15, lineHeight: 20, color: t.colors.ink }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                  onPress={() => {
                    changeQuery("");
                    setSearching(false);
                  }}
                  hitSlop={8}
                  style={{ backgroundColor: t.colors.soft, borderRadius: 12, width: 24, height: 24, flexShrink: 0, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name="x" s={11} w={2.5} c={t.colors.ink3} />
                </Pressable>
              </Reanimated.View>
            ) : (
              <Reanimated.View entering={FadeInRight.duration(220)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Search phrases"
                  onPress={() => setSearching(true)}
                  style={[{ backgroundColor: t.colors.card, borderRadius: 22, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
                >
                  <Icon name="search" s={18} w={2} c={t.colors.ink2} />
                </Pressable>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginVertical: -20 }}
                  contentContainerStyle={{ gap: 7, paddingRight: 18, paddingVertical: 20 }}
                >
                  {PHRASE_STAGE_FILTERS.map((x) => (
                    <Chip
                      key={x.id}
                      active={f === x.id}
                      icon={x.id === "starred" ? "star" : undefined}
                      accessibilityLabel={x.label}
                      onPress={() => changeFilter(x.id)}
                    >
                      {x.id === "starred" ? undefined : x.label}
                    </Chip>
                  ))}
                </ScrollView>
              </Reanimated.View>
            )}
          </View>

          {rows}
        </Stagger>
      )}
    </Screen>
  );
}

// ── Phrase detail ───────────────────────────────────────────────────────────
export function PhraseDetail({ item, nav }: { item?: PhraseItem; nav: Nav }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [p, setPhrase] = useState(item ?? SAMPLE_PHRASE);
  const player = useSegmentPlayer();
  const speech = usePhraseSpeech();
  const [use, setUse] = useState<string>(p.status === "New" ? "Recognizing" : p.status);
  const [memo, setMemo] = useState(p.memo ?? "");
  const [savedMemo, setSavedMemo] = useState(p.memo ?? "");
  const [editingMemo, setEditingMemo] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoErr, setMemoErr] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(p.text);
  const [editKind, setEditKind] = useState<PhraseKind>(p.kind);
  const [editMeaning, setEditMeaning] = useState(p.translation ?? "");
  const [editNote, setEditNote] = useState(p.usageNote ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const memoDirty = memo !== savedMemo;
  const canEdit = p.id !== "sample";
  const kindLabel = PHRASE_KINDS.find((entry) => entry.value === p.kind)?.label ?? "Expression";
  const sourceIcon: "clip" | "camera" | "mic" | "text" | "pen" = p.videoId
    ? "clip"
    : p.source === "Saved from photo"
      ? "camera"
      : p.source === "Saved while talking"
        ? "mic"
        : p.source === "Pasted text"
          ? "text"
          : "pen";
  const sourceCopy = p.videoId
    ? `${p.source} · ${formatDuration(p.startSec)}`
    : p.source === "Saved from photo"
      ? "From a photo"
      : p.source === "Saved while talking"
        ? "From your talk"
        : p.source === "Pasted text"
          ? "From pasted text"
          : "Added manually";

  useEffect(() => {
    if (canEdit) void speech.prepare(p.id);
  }, [canEdit, p.id, speech.prepare]);

  const saveMemo = async () => {
    if (!canEdit || !memoDirty) return;
    setSavingMemo(true);
    setMemoErr(false);
    try {
      await updatePhraseNote(p.id, memo);
      setSavedMemo(memo);
      setPhrase((current) => ({ ...current, memo: memo.trim() || null }));
      setEditingMemo(false);
    } catch {
      setMemoErr(true);
    } finally {
      setSavingMemo(false);
    }
  };

  const openEdit = () => {
    setMenuOpen(false);
    setEditText(p.text);
    setEditKind(p.kind);
    setEditMeaning(p.translation ?? "");
    setEditNote(p.usageNote ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!canEdit || !editText.trim()) {
      setEditError("Enter a phrase to save.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await updatePhraseDetails(p.id, { text: editText, kind: editKind, meaning: editMeaning, usageNote: editNote });
      const nextText = editText.replace(/\s+/g, " ").trim();
      const nextMeaning = editMeaning.trim() || null;
      const nextUsage = editNote.trim() || null;
      setPhrase((current) => ({ ...current, text: nextText, kind: editKind, translation: nextMeaning, usageNote: nextUsage }));
      setEditOpen(false);
      nav.notify("Phrase updated");
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "Couldn’t update this phrase.");
    } finally {
      setSavingEdit(false);
    }
  };

  const removeCurrentPhrase = () => {
    setMenuOpen(false);
    confirmDelete({
      title: "Delete this phrase?",
      message: "It will be removed from your Phrase Bank and linked stories.",
      deleteLabel: "Delete phrase",
      onConfirm: () => {
        void (async () => {
          try {
            await deletePhrase(p.id);
            nav.pop();
            nav.notify("Phrase deleted");
          } catch (caught) {
            Alert.alert("Couldn’t delete", caught instanceof Error ? caught.message : "Try again.");
          }
        })();
      },
    });
  };

  const stages = [
    { value: "Recognizing", label: "Recognize", desc: "I understand it when I see it." },
    { value: "Practicing", label: "Use with help", desc: "I can use it with a hint or example." },
    { value: "Ready to use", label: "Use on my own", desc: "I can bring it into my own speaking." },
  ];
  const currentStage = Math.max(0, stages.findIndex((stage) => stage.value === use));

  return (
    <>
      <Screen bottomPad={54}>
        <BackBar
          title="Phrase"
          onBack={nav.pop}
          right={canEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phrase options"
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => [
                {
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: t.colors.card,
                  borderWidth: 1,
                  borderColor: t.ring,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.78 : 1,
                },
                t.shadowCard,
              ]}
            >
              <Icon name="dots" s={20} c={t.colors.ink} />
            </Pressable>
          ) : undefined}
        />

        <Card lg style={{ minHeight: 200, paddingHorizontal: 22, paddingVertical: 22, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Serif style={{ fontSize: 34, lineHeight: 42, color: t.colors.ink }}>{p.text}</Serif>
              {p.translation ? <Text style={{ fontSize: 16, lineHeight: 22, color: t.colors.ink2, marginTop: 11 }}>{p.translation}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={speech.speakingId === p.id ? "Stop reading phrase" : "Read phrase aloud"}
              onPress={() => {
                player.stop();
                speech.toggle(p.id, p.text);
              }}
              style={({ pressed }) => ({
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: t.colors.acc,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.82 : 1,
              })}
            >
              {speech.loadingId === p.id ? <ActivityIndicator color="#fff" /> : <Icon name={speech.speakingId === p.id ? "pause" : "speaker"} s={23} c="#fff" />}
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 18 }}>
            <View style={{ minHeight: 30, borderRadius: 999, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.accS }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: t.colors.accD }}>{kindLabel}</Text>
            </View>
            <Badge s={p.status} />
            {p.favorite ? <Icon name="star" s={16} c={t.colors.acc} /> : null}
            <Text style={{ marginLeft: "auto", fontSize: 11.5, color: t.colors.ink3 }}>
              {speech.fallbackId === p.id ? "Device voice fallback" : "AI-generated voice"}
            </Text>
          </View>
        </Card>

        {p.context || p.videoId ? (
          <>
            <Serif style={{ fontSize: 27, lineHeight: 32, color: t.colors.ink, marginTop: 6, paddingHorizontal: 4 }}>In context</Serif>
            {p.context ? (
              <View
                style={{
                  borderRadius: t.r,
                  padding: 19,
                  backgroundColor: t.colors.accS,
                  borderWidth: 1,
                  borderColor: t.ring,
                }}
              >
                <Serif style={{ fontSize: 18, lineHeight: 26, color: t.colors.ink }}>“{p.context}”</Serif>
                {p.contextTranslation ? (
                  <>
                    <View style={{ height: 1, backgroundColor: t.colors.sep, marginVertical: 16 }} />
                    <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2 }}>{p.contextTranslation}</Text>
                  </>
                ) : null}
                {!p.videoId ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 17 }}>
                    <Icon name={sourceIcon} s={17} c={t.colors.ink3} />
                    <Text style={{ flex: 1, fontSize: 13.5, color: t.colors.ink3 }}>{sourceCopy}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            {p.videoId ? (
              // Library beta: the clip row IS the source — tap to open the clip
              // and listen there. Removing the Library feature removes this row
              // (LibraryClipRow lives in library.tsx) in one cut.
              <LibraryClipRow
                title={p.source}
                meta={`${formatDuration(p.startSec)} · clip`}
                onPress={() => {
                  speech.stop();
                  player.stop();
                  nav.push("libItem", { id: p.videoId, title: p.source });
                }}
              />
            ) : null}
          </>
        ) : null}

        {/* Usage + personal note live together on one tinted card, on the same
            tint as the In-context card so the page stays one color family. */}
        <View style={{ borderRadius: t.r, padding: 19, backgroundColor: t.colors.accS, borderWidth: 1, borderColor: t.ring }}>
          {p.usageNote ? (
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>HOW IT’S USED</Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8 }}>{p.usageNote}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>YOUR NOTE</Text>
            {canEdit ? (
              <Pressable onPress={() => { setEditingMemo(true); setMemoErr(false); }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.accD }}>{memo ? "Edit" : "Add"}</Text>
              </Pressable>
            ) : null}
          </View>
          {editingMemo ? (
            <>
              <TextInput
                value={memo}
                onChangeText={setMemo}
                multiline
                autoFocus
                editable={!savingMemo}
                placeholder="Add your note"
                placeholderTextColor={t.colors.ink3}
                style={{ fontSize: 15, lineHeight: 22, marginTop: 10, color: t.colors.ink, minHeight: 70, padding: 13, borderRadius: 15, backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.ring }}
              />
              {memoErr ? <Text style={{ fontSize: 12, color: "#E5484D", marginTop: 6 }}>Couldn’t save. Try again.</Text> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 }}>
                <Pill tone="soft" small onPress={memoDirty && !savingMemo ? () => void saveMemo() : undefined} style={{ opacity: memoDirty && !savingMemo ? 1 : 0.5 }}>
                  {savingMemo ? <ActivityIndicator color={t.colors.accD} /> : "Save note"}
                </Pill>
                <Pill tone="ghost" small onPress={() => { setMemo(savedMemo); setEditingMemo(false); }}>Cancel</Pill>
              </View>
            </>
          ) : (
            <Pressable
              disabled={!canEdit}
              onPress={() => { setEditingMemo(true); setMemoErr(false); }}
              style={{ marginTop: 10, minHeight: 52, borderRadius: 15, backgroundColor: memo ? "transparent" : t.colors.card, paddingHorizontal: memo ? 0 : 13, justifyContent: "center" }}
            >
              <Text style={{ fontSize: 15, lineHeight: 22, color: memo ? t.colors.ink : t.colors.ink3 }}>
                {memo || "Add your note"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <Serif style={{ fontSize: 27, lineHeight: 32, color: t.colors.ink }}>Make it usable</Serif>
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 5 }}>How available is this phrase when you speak?</Text>
        </View>

        <Card lg style={{ padding: 15 }}>
          <View>
          {stages.map((stage, index) => {
            const selected = index === currentStage;
            const completed = index < currentStage;
            return (
              <Pressable
                key={stage.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setUse(stage.value);
                  if (!canEdit) return;
                  const nextStatus = stage.value as "Recognizing" | "Practicing" | "Ready to use";
                  const learning: LearningStatus = nextStatus === "Practicing" ? "practicing" : nextStatus === "Ready to use" ? "ready" : "recognizing";
                  void setPhraseStage(p.id, learning, p)
                    .then(() => setPhrase((current) => ({ ...current, status: nextStatus, learningStatus: learning, reviewsSinceStage: 0 })))
                    .catch((caught) => Alert.alert("Couldn’t update", caught instanceof Error ? caught.message : "Try again."));
                }}
                style={({ pressed }) => ({ flexDirection: "row", minHeight: 78, opacity: pressed ? 0.76 : 1 })}
              >
                <View style={{ width: 50, alignItems: "center", paddingTop: 13 }}>
                  {index < stages.length - 1 ? (
                    // Node connector: starts just below this circle and stops
                    // just above the next one (circle top = next row's 13pt
                    // padding), so the line never runs into the numbers.
                    <View style={{ position: "absolute", top: 59, bottom: -9, width: 2, backgroundColor: index < currentStage ? t.colors.acc : t.colors.sep }} />
                  ) : null}
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      borderWidth: selected ? 0 : 1.5,
                      borderColor: completed ? t.colors.acc : t.colors.sep,
                      backgroundColor: selected ? t.colors.acc : t.colors.card,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "700", color: selected ? "#fff" : t.colors.ink }}>{index + 1}</Text>
                  </View>
                  {completed ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 1,
                        width: 19,
                        height: 19,
                        borderRadius: 10,
                        backgroundColor: t.colors.accS,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="check" s={11} w={2.8} c={t.colors.acc} />
                    </View>
                  ) : null}
                </View>
                <View
                  style={{
                    flex: 1,
                    alignSelf: "stretch",
                    justifyContent: "center",
                    marginLeft: 10,
                    marginVertical: 4,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: selected ? 1.5 : 0,
                    borderColor: selected ? t.colors.acc : "transparent",
                    backgroundColor: selected ? t.colors.accS : "transparent",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{stage.label}</Text>
                    {selected ? (
                      <View style={{ borderRadius: 999, backgroundColor: t.colors.accS, paddingHorizontal: 9, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: t.colors.accD }}>CURRENT</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: t.colors.ink2, marginTop: 3 }}>{stage.desc}</Text>
                </View>
              </Pressable>
            );
          })}
          </View>
        </Card>

        <Pill
          icon="mic"
          onPress={() => {
            speech.stop();
            player.stop();
            nav.push("practiceHub", { item: p });
          }}
          style={{ width: "100%", alignSelf: "stretch" }}
        >
          Practice
        </Pill>
      </Screen>

      <Modal visible={menuOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.08)" }} onPress={() => setMenuOpen(false)}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[
              {
                position: "absolute",
                top: insets.top + 58,
                right: 18,
                width: 210,
                overflow: "hidden",
                borderRadius: 22,
                backgroundColor: t.colors.card,
                borderWidth: 1,
                borderColor: t.ring,
              },
              t.shadowLg,
            ]}
          >
            <Pressable onPress={openEdit} style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? t.colors.soft : "transparent" })}>
              <Icon name="pen" s={18} c={t.colors.ink} />
              <Text style={{ fontSize: 15.5, fontWeight: "600", color: t.colors.ink }}>Edit phrase</Text>
            </Pressable>
            <View style={{ height: 1, backgroundColor: t.colors.sep }} />
            <Pressable onPress={removeCurrentPhrase} style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? t.colors.soft : "transparent" })}>
              <Icon name="x" s={18} c="#D63C42" />
              <Text style={{ fontSize: 15.5, fontWeight: "600", color: "#D63C42" }}>Delete phrase</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => { if (!savingEdit) setEditOpen(false); }}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.28)", justifyContent: "flex-end" }} onPress={() => { if (!savingEdit) setEditOpen(false); }}>
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ maxHeight: "84%", backgroundColor: t.colors.bg, borderTopLeftRadius: 38, borderTopRightRadius: 38, paddingHorizontal: 22, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 18) + 12 }}
          >
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 18 }} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: t.colors.accD }}>EDIT PHRASE</Text>
              <TextInput
                value={editText}
                onChangeText={setEditText}
                autoFocus
                placeholder="Phrase"
                placeholderTextColor={t.colors.ink3}
                style={{ fontSize: 29, lineHeight: 36, fontFamily: "Newsreader", color: t.colors.ink, marginTop: 10, padding: 0 }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingTop: 15 }}>
                {PHRASE_KINDS.map((entry) => <Chip key={entry.value} active={editKind === entry.value} onPress={() => setEditKind(entry.value)}>{entry.label}</Chip>)}
              </ScrollView>
              <View style={{ height: 1, backgroundColor: t.colors.sep, marginVertical: 18 }} />
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>MEANING</Text>
              <TextInput value={editMeaning} onChangeText={setEditMeaning} placeholder="Meaning" placeholderTextColor={t.colors.ink3} style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8, padding: 0 }} />
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 19 }}>HOW IT’S USED</Text>
              <TextInput value={editNote} onChangeText={setEditNote} multiline placeholder="How this phrase is used" placeholderTextColor={t.colors.ink3} style={{ minHeight: 62, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8, padding: 0 }} />
              {editError ? <Text style={{ fontSize: 13, color: "#E5484D", textAlign: "center", marginTop: 12 }}>{editError}</Text> : null}
              <Pill onPress={savingEdit ? undefined : () => void saveEdit()} style={{ width: "100%", alignSelf: "stretch", marginTop: 22, opacity: savingEdit ? 0.6 : 1 }}>
                {savingEdit ? <ActivityIndicator color="#fff" /> : "Save changes"}
              </Pill>
              <Pill tone="ghost" onPress={savingEdit ? undefined : () => setEditOpen(false)} style={{ alignSelf: "center", marginTop: 4 }}>Cancel</Pill>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Review flow ─────────────────────────────────────────────────────────────
export function ReviewFlow({ item, queue, nav }: { item?: PhraseItem; queue?: PhraseItem[]; nav: Nav }) {
  const t = useTheme();
  const posthog = usePostHog();
  const speech = usePhraseSpeech();
  const phrases = queue && queue.length > 0 ? queue : [item ?? SAMPLE_PHRASE];
  const [idx, setIdx] = useState(() => {
    if (!item || !queue?.length) return 0;
    const found = queue.findIndex((phrase) => phrase.id === item.id);
    return found >= 0 ? found : 0;
  });
  const p = phrases[Math.min(idx, phrases.length - 1)] ?? SAMPLE_PHRASE;
  const total = phrases.length;
  const isLast = idx >= total - 1;
  // front → (Hint) hint → tap card → answer. Hint use downgrades the silent
  // SRS verdict from "good" to "again"; there are no visible grade buttons.
  const [phase, setPhase] = useState<"front" | "hint" | "answer">("front");
  const [mode, setMode] = useState<"card" | "rehearsal">("card");
  const [visible, setVisible] = useState(true);
  const hintUsed = useRef(false);
  const reviewed = useRef(new Set<string>());

  useEffect(() => {
    setPhase("front");
    setMode("card");
    hintUsed.current = false;
  }, [p.id]);

  // Fire-and-forget: each finished card is saved as it happens, so leaving
  // early keeps everything done so far (the X-confirm copy promises this).
  const saveCurrent = () => {
    if (p.id === "sample" || reviewed.current.has(p.id)) return;
    reviewed.current.add(p.id);
    const verdict: SrsVerdict = hintUsed.current ? "again" : "good";
    void submitVerdict(p.id, verdict, p)
      .then((state) => {
        posthog?.capture("phrase_review_submitted", { verdict, phrase_status: p.status });
        const nextInterval = nextReviewInterval(p.intervalDays, verdict);
        if (
          shouldPromptStage({
            reason: "review",
            learningStatus: p.learningStatus,
            reviewsSinceStage: p.reviewsSinceStage + 1,
            nextIntervalDays: nextInterval,
          })
        ) {
          promptPhraseStage({
            text: p.text,
            onChoose: (stage) => {
              void setPhraseStage(p.id, stage, { ...p, reviewsSinceStage: p.reviewsSinceStage + 1, tags: state.tags }).catch(() => undefined);
            },
          });
        }
      })
      .catch(() => undefined);
  };

  const closeSheet = () => {
    speech.stop();
    setVisible(false);
  };

  const attemptClose = () => {
    if (mode === "rehearsal") {
      setMode("card");
      return;
    }
    Alert.alert("Stop reviewing?", "What you’ve done so far is saved.", [
      { text: "Keep going", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: closeSheet },
    ]);
  };

  const next = () => {
    speech.stop();
    saveCurrent();
    if (isLast) {
      closeSheet();
      if (total > 1) nav.notify("Review done!");
      return;
    }
    setIdx((current) => current + 1);
  };

  const hint = p.usageNote ?? (p.context ? `“${p.context}”` : null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={attemptClose}
      onDismiss={nav.pop}
    >
      {mode === "rehearsal" ? (
        <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
          <QuickRehearsalScreen nav={nav} item={p} onDone={() => setMode("card")} />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: t.colors.ink3, fontVariant: ["tabular-nums"] }}>
              {total > 1 ? `${idx + 1} / ${total}` : " "}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop reviewing"
              onPress={attemptClose}
              hitSlop={8}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.soft, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
            >
              <Icon name="x" s={15} w={2.4} c={t.colors.ink2} />
            </Pressable>
          </View>

          <View style={{ flex: 1, justifyContent: "center", paddingVertical: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={phase === "answer" ? "Phrase card" : "Tap to see the answer"}
              onPress={phase === "answer" ? undefined : () => setPhase("answer")}
              style={({ pressed }) => [
                {
                  minHeight: 400,
                  borderRadius: 30,
                  padding: 26,
                  backgroundColor: phase === "answer" ? t.colors.acc : t.colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed && phase !== "answer" ? 0.92 : 1,
                },
                t.shadowLg,
              ]}
            >
              {phase !== "answer" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Show a hint"
                  onPress={() => {
                    hintUsed.current = true;
                    setPhase("hint");
                  }}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    position: "absolute",
                    top: 16,
                    right: 16,
                    minHeight: 30,
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: t.colors.acc,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Hint</Text>
                </Pressable>
              ) : null}

              {phase === "answer" ? (
                <View style={{ alignItems: "center", gap: 14 }}>
                  <Serif style={{ fontSize: 27, lineHeight: 34, color: "#fff", textAlign: "center" }}>{p.text}</Serif>
                  {p.translation ? (
                    <Text style={{ fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.88)", textAlign: "center" }}>{p.translation}</Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={speech.speakingId === p.id ? "Stop the voice" : "Play the AI voice"}
                    onPress={() => speech.toggle(p.id, p.text)}
                    style={({ pressed }) => ({
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 8,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {speech.loadingId === p.id ? (
                      <ActivityIndicator color={t.colors.acc} />
                    ) : (
                      <Icon name={speech.speakingId === p.id ? "pause" : "speaker"} s={23} c={t.colors.acc} />
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={{ alignItems: "center", gap: 16, paddingHorizontal: 6 }}>
                  <Text style={{ fontSize: 25, fontWeight: "800", letterSpacing: -0.3, color: t.colors.ink, textAlign: "center" }}>{p.text}</Text>
                  {phase === "hint" ? (
                    <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, textAlign: "center" }}>
                      {hint ? (
                        <>
                          <Text style={{ fontWeight: "700", color: t.colors.ink }}>How it’s used: </Text>
                          {hint}
                        </>
                      ) : (
                        "No hint for this one."
                      )}
                    </Text>
                  ) : null}
                </View>
              )}
            </Pressable>
          </View>

          <View style={{ minHeight: 54, justifyContent: "center" }}>
            {phase === "answer" ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pill
                  tone="white"
                  full
                  onPress={() => {
                    speech.stop();
                    setMode("rehearsal");
                  }}
                >
                  Practice
                </Pill>
                <Pill tone="tint" full onPress={next}>
                  {isLast ? "Done" : "Next"}
                </Pill>
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: t.colors.ink3, textAlign: "center" }}>Tap the card to see the answer</Text>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}
