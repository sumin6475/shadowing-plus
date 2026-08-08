// phrases.tsx — Phrase Bank tab: list + chart, detail, review flow. Backed by
// the canonical `phrase_items` collection; transcript bookmarks are separate.
import { Fragment, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Badge, Card, Chip, Header, Hero, Icon, Pill, Screen, Serif, StatTile, SwipeRow, confirmDelete, Wave } from "@/design/ui";
import { formatDuration } from "@/lib/library";
import { cumulativeSeries, deletePhrase, dueHint, fetchPhrases, phraseIsDue, relativeTime, setPhraseFavorite, submitVerdict, updatePhraseDetails, updatePhraseNote, type PhraseItem, type PhraseKind, type SrsVerdict } from "@/lib/phrases";
import { usePhraseSpeech } from "@/hooks/use-phrase-speech";
import { useSegmentPlayer } from "@/hooks/use-segment-player";
import type { Nav } from "./nav";

const FILTERS = ["All", "Favorites", "Due now", "New", "Recognizing", "Practicing", "Ready to use", "Needs refresh"];
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
  memo: null,
  createdAt: "2026-07-25T00:00:00.000Z",
  dueAt: "2026-08-10T00:00:00.000Z",
  intervalDays: 3,
  easeFactor: 2.5,
  lapses: 0,
  lastReviewedAt: null,
  favorite: false,
};

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
        <Path d={`${line}L${X(n - 1)},${H - 8}L${X(0)},${H - 8}Z`} fill={t.colors.accS} opacity={0.55} />
        <Path d={line} fill="none" stroke={t.colors.acc} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={X(n - 1)} cy={Y(pts[pts.length - 1])} r={4.5} fill={t.colors.acc} stroke={t.colors.bg} strokeWidth={2.5} />
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
  const [f, setF] = useState("All");
  const [searching, setSearching] = useState(false);

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
    const s = (p.text + (p.translation ?? "") + p.source + (p.memo ?? "")).toLowerCase();
    if (q && !s.includes(q.toLowerCase())) return false;
    if (f === "All") return true;
    if (f === "Favorites") return p.favorite;
    if (f === "Due now") return phraseIsDue(p);
    return p.status === f;
  });

  const collected = all.length;
  const dueNow = all.filter(phraseIsDue).length;
  const ready = all.filter((p) => p.status === "Ready to use").length;
  const practiced = all.filter((p) => p.lastReviewedAt).length;
  const thisWeek = all.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 7 * 86_400_000).length;
  const chart = cumulativeSeries(all.map((p) => p.createdAt));

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.acc} />}>
      <Header
        eyebrow="Your Phrase Bank"
        title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>English you chose{"\n"}to keep.</Serif>}
        right={<Avatar onPress={() => nav.push("settings")} />}
      />

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
        <>
          <BankChart points={chart.points} max={chart.max} />

          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 2 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Summary</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>ALL TIME</Text>
          </View>
          <View style={{ gap: t.gap }}>
            <View style={{ flexDirection: "row", gap: t.gap }}>
              <StatTile tone="sky" label="Collected" value={String(collected)} unit="phrases" foot={`+${thisWeek} this week`} />
              <StatTile tone="butter" label="Practiced" value={String(practiced)} unit="phrases" foot="reviewed once+" />
            </View>
            <View style={{ flexDirection: "row", gap: t.gap }}>
              <StatTile tone="sage" label="Ready to use" value={String(ready)} unit="phrases" foot="Your active English" />
              <StatTile tone="blush" label="Due now" value={String(dueNow)} unit="phrases" foot="Quick refresh today" onPress={() => setF("Due now")} />
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 2, paddingTop: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>History</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>{list.length} PHRASES</Text>
          </View>

          {searching ? (
            <View
              style={[
                { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.colors.card, borderRadius: 9999, minHeight: 44, paddingHorizontal: 16, borderWidth: 0.5, borderColor: t.ring },
                t.shadowCard,
              ]}
            >
              <Icon name="search" s={17} c={t.colors.ink3} />
              <TextInput
                autoFocus
                value={q}
                onChangeText={setQ}
                placeholder="Search your English — meaning, source…"
                placeholderTextColor={t.colors.ink3}
                style={{ flex: 1, fontSize: 15, color: t.colors.ink }}
              />
              <Pressable
                onPress={() => {
                  setQ("");
                  setSearching(false);
                }}
                style={{ backgroundColor: t.colors.soft, borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="x" s={11} w={2.5} c={t.colors.ink3} />
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <Pressable
                onPress={() => setSearching(true)}
                style={[{ backgroundColor: t.colors.card, borderRadius: 22, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: t.ring }, t.shadowCard]}
              >
                <Icon name="search" s={18} w={2} c={t.colors.ink2} />
              </Pressable>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 18 }}>
                {FILTERS.map((x) => (
                  <Chip key={x} active={f === x} onPress={() => setF(x)}>
                    {x}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          )}

          {list.length === 0 ? (
            <Card style={{ alignItems: "center", paddingVertical: 34 }}>
              <Serif style={{ fontSize: 20, color: t.colors.ink }}>{collected === 0 ? "No phrases yet" : "Nothing here"}</Serif>
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>
                {collected === 0 ? "Tap + to keep an expression from anywhere." : "Try another word or filter."}
              </Text>
            </Card>
          ) : null}

          {list.map((p) => (
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
              <Card onPress={() => nav.push("phrase", { item: p })}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", letterSpacing: -0.1, color: t.colors.ink }}>{p.text}</Text>
                    {p.translation ? <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 3 }}>{p.translation}</Text> : null}
                  </View>
                  {p.favorite ? <Icon name="star" s={15} c={t.colors.acc} /> : null}
                  <Badge s={p.status} />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 }}>
                  <Text style={{ fontSize: 12, color: t.colors.ink3, flex: 1 }} numberOfLines={1}>
                    {p.source} · {relativeTime(p.createdAt)}
                  </Text>
                  <Pill
                    tone="tint"
                    small
                    icon={speech.speakingId === p.id ? "pause" : "speaker"}
                    onPress={() => speech.toggle(p.id, p.text)}
                  >
                    {speech.loadingId === p.id ? "…" : speech.speakingId === p.id ? "Stop" : speech.fallbackId === p.id ? "Device voice" : "AI voice"}
                  </Pill>
                  <Pill tone="soft" small onPress={() => nav.push("review", { item: p })}>
                    Practice
                  </Pill>
                </View>
              </Card>
            </SwipeRow>
          ))}
        </>
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
  const [editNote, setEditNote] = useState(p.memo ?? "");
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
    setEditNote(p.memo ?? "");
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
      const nextNote = editNote.trim() || null;
      setPhrase((current) => ({ ...current, text: nextText, kind: editKind, translation: nextMeaning, memo: nextNote }));
      setMemo(nextNote ?? "");
      setSavedMemo(nextNote ?? "");
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
            <View
              style={{
                borderRadius: t.r,
                padding: 19,
                backgroundColor: t.colors.accS,
                borderWidth: 1,
                borderColor: t.ring,
              }}
            >
              {p.context ? <Serif style={{ fontSize: 18, lineHeight: 26, color: t.colors.ink }}>“{p.context}”</Serif> : null}
              {p.contextTranslation ? (
                <>
                  <View style={{ height: 1, backgroundColor: t.colors.sep, marginVertical: 16 }} />
                  <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2 }}>{p.contextTranslation}</Text>
                </>
              ) : null}
              <Pressable
                accessibilityRole={p.videoId ? "button" : undefined}
                disabled={!p.videoId}
                onPress={p.videoId ? () => nav.push("libItem", { id: p.videoId, title: p.source }) : undefined}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 17, opacity: pressed ? 0.7 : 1 })}
              >
                <Icon name={sourceIcon} s={17} c={t.colors.ink3} />
                <Text style={{ flex: 1, fontSize: 13.5, color: t.colors.ink3 }}>{sourceCopy}</Text>
                {p.videoId ? <Icon name="chev" s={12} c={t.colors.ink3} w={2.2} /> : null}
              </Pressable>
              {p.videoId ? (
                <Pill
                  tone="tint"
                  small
                  icon={player.currentId === `context-${p.id}` ? "pause" : "speaker"}
                  onPress={() => {
                    speech.stop();
                    player.toggle({ id: `context-${p.id}`, videoId: p.videoId!, start: p.startSec, end: p.endSec });
                  }}
                  style={{ marginTop: 12, alignSelf: "flex-start" }}
                >
                  {player.loadingId === `context-${p.id}` ? "Loading…" : player.currentId === `context-${p.id}` ? "Stop context" : "Hear in context"}
                </Pill>
              ) : null}
            </View>
          </>
        ) : null}

        <View style={{ paddingHorizontal: 5, paddingVertical: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Your note</Text>
            {canEdit ? (
              <Pressable onPress={() => { setEditingMemo(true); setMemoErr(false); }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>{memo ? "Edit" : "Add"}</Text>
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
                placeholder="Why this matters, or when you’d use it…"
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
            <Text style={{ fontSize: 15, lineHeight: 22, color: memo ? t.colors.ink : t.colors.ink3, marginTop: 10 }}>
              {memo || "Add why this phrase matters or when you want to use it."}
            </Text>
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
                onPress={() => setUse(stage.value)}
                style={({ pressed }) => ({ flexDirection: "row", minHeight: 78, opacity: pressed ? 0.76 : 1 })}
              >
                <View style={{ width: 50, alignItems: "center", paddingTop: 13 }}>
                  {index < stages.length - 1 ? (
                    <View style={{ position: "absolute", top: 52, bottom: -26, width: 2, backgroundColor: index < currentStage ? t.colors.acc : t.colors.sep }} />
                  ) : null}
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      borderWidth: selected ? 0 : 1.5,
                      borderColor: completed ? t.colors.acc : t.colors.sep,
                    backgroundColor: selected ? t.colors.acc : "transparent",
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
            nav.push("review", { item: p });
          }}
          style={{ width: "100%", alignSelf: "stretch" }}
        >
          Practice in context
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
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD, marginTop: 19 }}>USAGE NOTE</Text>
              <TextInput value={editNote} onChangeText={setEditNote} multiline placeholder="Usage note" placeholderTextColor={t.colors.ink3} style={{ minHeight: 62, fontSize: 15, lineHeight: 22, color: t.colors.ink, marginTop: 8, padding: 0 }} />
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
export function ReviewFlow({ item, nav }: { item?: PhraseItem; nav: Nav }) {
  const t = useTheme();
  const p = item ?? SAMPLE_PHRASE;
  const [st, setSt] = useState(0); // 0 listen 1 recall 2 say 3 grade 4 done
  const [reveal, setReveal] = useState(false);
  const [rec, setRec] = useState(false);
  const [grading, setGrading] = useState(false);
  const [newDue, setNewDue] = useState<string | null>(null);
  const [gradeErr, setGradeErr] = useState<string | null>(null);
  const steps = ["Listen", "Recall", "Say it"];

  const grade = async (verdict: SrsVerdict) => {
    setGrading(true);
    setGradeErr(null);
    try {
      const state = await submitVerdict(p.id, verdict, p);
      setNewDue(state?.due_at ?? null);
      setSt(4);
    } catch (e) {
      setGradeErr(e instanceof Error ? e.message : "Couldn’t save your review.");
    } finally {
      setGrading(false);
    }
  };

  return (
    <Screen>
      <BackBar title="Bring it back" onBack={nav.pop} right={<Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3 }}>{Math.min(st + 1, 3)} / 3</Text>} />
      <View style={{ flexDirection: "row", gap: 5 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 9999, backgroundColor: st >= i ? t.colors.acc : t.colors.soft }} />
        ))}
      </View>
      <Text style={{ fontSize: 13, color: t.colors.ink2, paddingHorizontal: 2, lineHeight: 20 }}>
        You saved this because it fit something you wanted to say.
      </Text>

      {st === 0 && (
        <>
          <Card lg style={{ alignItems: "center", paddingVertical: 32 }}>
            <Serif style={{ fontSize: 24, lineHeight: 33, color: t.colors.ink, textAlign: "center" }}>{p.text}</Serif>
            <View style={{ marginTop: 16 }}>
              <Wave n={20} h={22} />
            </View>
          </Card>
          <Pill full onPress={() => setSt(1)}>
            I read it
          </Pill>
        </>
      )}

      {st === 1 && (
        <>
          <Card lg style={{ alignItems: "center", paddingVertical: 30 }}>
            <Serif style={{ fontSize: 22, lineHeight: 30, color: t.colors.ink, textAlign: "center" }}>{p.text}</Serif>
            <Text style={{ fontSize: 15, color: t.colors.ink2, marginTop: 12, textAlign: "center" }}>
              {reveal ? (p.translation ?? "—") : "What does it mean? When would you use it?"}
            </Text>
          </Card>
          {!reveal ? (
            <Pill tone="tint" full onPress={() => setReveal(true)}>
              Show meaning
            </Pill>
          ) : (
            <Pill
              full
              onPress={() => {
                setReveal(false);
                setSt(2);
              }}
            >
              I remembered
            </Pill>
          )}
        </>
      )}

      {st === 2 && (
        <>
          <Card lg>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>MAKE IT YOURS</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", lineHeight: 24, marginTop: 8, color: t.colors.ink }}>
              Say one sentence about your life using this.
            </Text>
            {rec ? (
              <View style={{ marginTop: 14 }}>
                <Wave active n={24} h={24} />
              </View>
            ) : null}
          </Card>
          <View style={{ alignItems: "center", paddingVertical: 6 }}>
            <Pressable
              onPress={() => (rec ? setSt(3) : setRec(true))}
              style={[{ width: 74, height: 74, borderRadius: 37, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }, t.shadowCard]}
            >
              {rec ? <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: "#fff" }} /> : <Icon name="mic" s={30} c="#fff" />}
            </Pressable>
          </View>
          <Text style={{ fontSize: 13, color: t.colors.ink3, textAlign: "center" }}>{rec ? "Tap to finish" : "Tap to speak"}</Text>
        </>
      )}

      {st === 3 && (
        <>
          <Card lg style={{ alignItems: "center", paddingVertical: 26 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>HOW DID THAT FEEL?</Text>
            <Serif style={{ fontSize: 22, lineHeight: 30, color: t.colors.ink, textAlign: "center", marginTop: 10 }}>{p.text}</Serif>
            <Text style={{ fontSize: 14, color: t.colors.ink2, marginTop: 10, textAlign: "center" }}>Your answer sets the next review.</Text>
          </Card>
          {gradeErr ? <Text style={{ fontSize: 13, color: "#E5484D", textAlign: "center" }}>{gradeErr}</Text> : null}
          <View style={{ gap: t.gap, opacity: grading ? 0.6 : 1 }}>
            <Pill full tone="tint" onPress={() => grade("again")}>
              Again — I struggled
            </Pill>
            <Pill full tone="soft" onPress={() => grade("good")}>
              Good — I got it
            </Pill>
            <Pill full onPress={() => grade("easy")}>
              Easy — no hesitation
            </Pill>
          </View>
          {grading ? (
            <View style={{ alignItems: "center", paddingTop: 4 }}>
              <ActivityIndicator color={t.colors.acc} />
            </View>
          ) : null}
        </>
      )}

      {st === 4 && (
        <>
          <Hero style={{ alignItems: "center", paddingVertical: 30 }}>
            <Serif style={{ fontSize: 22, lineHeight: 29, color: "#fff", textAlign: "center" }}>
              Nice. You brought one phrase closer to your active English.
            </Serif>
          </Hero>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>
                {p.text}
              </Text>
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>next review {dueHint(newDue ?? p.dueAt)}</Text>
            </View>
            <Badge s={p.status} />
          </Card>
          <Pill full onPress={nav.pop}>
            Done
          </Pill>
        </>
      )}
    </Screen>
  );
}
