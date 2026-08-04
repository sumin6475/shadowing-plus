// phrases.tsx — Phrase Bank tab: list + chart, detail, review flow. Now backed
// by the real `bookmarks` table (see @/lib/phrases). The review-verdict write
// and per-phrase audio are still stubs (next steps).
import { Fragment, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Badge, Card, Chip, Header, Hero, Icon, Pill, Screen, Serif, StatTile, Wave } from "@/design/ui";
import { formatDuration } from "@/lib/library";
import { cumulativeSeries, dueHint, fetchBookmarks, phraseIsDue, relativeTime, type PhraseItem } from "@/lib/phrases";
import type { Nav } from "./nav";

const FILTERS = ["All", "Due now", "New", "Recognizing", "Practicing", "Ready to use", "Needs refresh"];

// Fallback for mock callers (e.g. the Today tab still pushes a phrase by id).
const SAMPLE_PHRASE: PhraseItem = {
  id: "sample",
  text: "take the plunge",
  translation: "망설이다가 큰맘 먹고 실행하다",
  status: "Practicing",
  source: "Sample clip",
  startSec: 53,
  videoId: null,
  memo: null,
  createdAt: "2026-07-25T00:00:00.000Z",
  dueAt: "2026-08-10T00:00:00.000Z",
  intervalDays: 3,
  lastReviewedAt: null,
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
  const [items, setItems] = useState<PhraseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [f, setF] = useState("All");
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchBookmarks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your phrases.");
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

  const all = items ?? [];
  const list = all.filter((p) => {
    const s = (p.text + (p.translation ?? "") + p.source + (p.memo ?? "")).toLowerCase();
    if (q && !s.includes(q.toLowerCase())) return false;
    if (f === "All") return true;
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
          <Pill tone="tint" small onPress={load} style={{ marginTop: 14 }}>
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
                {collected === 0 ? "Open a clip in your Library and tap Save phrase on a line." : "Try another word or filter."}
              </Text>
            </Card>
          ) : null}

          {list.map((p) => (
            <Card key={p.id} onPress={() => nav.push("phrase", { item: p })}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", letterSpacing: -0.1, color: t.colors.ink }}>{p.text}</Text>
                  {p.translation ? <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 3 }}>{p.translation}</Text> : null}
                </View>
                <Badge s={p.status} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: t.colors.ink3, flex: 1 }} numberOfLines={1}>
                  {p.source} · {relativeTime(p.createdAt)}
                </Text>
                <Pill tone="soft" small onPress={() => nav.push("review", { item: p })}>
                  Practice
                </Pill>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

// ── Phrase detail ───────────────────────────────────────────────────────────
export function PhraseDetail({ item, nav }: { item?: PhraseItem; nav: Nav }) {
  const t = useTheme();
  const p = item ?? SAMPLE_PHRASE;
  // Local self-rating only — persisting the verdict to the bookmark is a next step.
  const [use, setUse] = useState<string>(p.status);

  const opt = (label: string, desc: string, val: string) => (
    <Pressable
      onPress={() => setUse(val)}
      style={{ flexDirection: "row", gap: 11, alignItems: "flex-start", backgroundColor: use === val ? t.colors.accS : t.colors.soft, borderRadius: 16, padding: 12 }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, marginTop: 1, backgroundColor: use === val ? t.colors.acc : t.colors.card, alignItems: "center", justifyContent: "center" }}>
        {use === val ? <Icon name="check" s={11} w={3} c="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: use === val ? t.colors.accD : t.colors.ink }}>{label}</Text>
        <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 2, lineHeight: 18 }}>{desc}</Text>
      </View>
    </Pressable>
  );

  return (
    <Screen>
      <BackBar title="Phrase" onBack={nav.pop} right={<Pill tone="tint" small icon="dots" />} />
      <Card lg>
        <Serif style={{ fontSize: 26, lineHeight: 34, color: t.colors.ink }}>{p.text}</Serif>
        {p.translation ? <Text style={{ fontSize: 15, color: t.colors.ink2, marginTop: 8 }}>{p.translation}</Text> : null}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
          <Badge s={p.status} />
        </View>
      </Card>

      <Card onPress={p.videoId ? () => nav.push("libItem", { id: p.videoId, title: p.source }) : undefined}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>WHERE YOU FOUND IT</Text>
            <Text style={{ fontSize: 15, color: t.colors.ink, marginTop: 8 }}>
              {p.source} · {formatDuration(p.startSec)}
            </Text>
          </View>
          {p.videoId ? <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} /> : null}
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>YOUR NOTE</Text>
        <Text style={{ fontSize: 15, lineHeight: 24, marginTop: 8, color: p.memo ? t.colors.ink : t.colors.ink3 }}>
          {p.memo ?? "No note yet — add one to remind future-you why this matters."}
        </Text>
      </Card>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", marginBottom: 10, color: t.colors.ink }}>Can you use it right now?</Text>
        <View style={{ gap: 8 }}>
          {opt("I only recognized it", "I knew the meaning, but couldn’t say it on my own.", "Recognizing")}
          {opt("I used it with help", "With a hint or example, I could use it.", "Practicing")}
          {opt("I used it on my own", "No hints — it showed up in my answer.", "Ready to use")}
        </View>
      </Card>

      <Pill full icon="mic" onPress={() => nav.push("review", { item: p })}>
        Practice in context
      </Pill>
      <Text style={{ fontSize: 13, color: t.colors.ink3, textAlign: "center", paddingVertical: 4 }}>Next review: {dueHint(p.dueAt)}</Text>
    </Screen>
  );
}

// ── Review flow ─────────────────────────────────────────────────────────────
export function ReviewFlow({ item, nav }: { item?: PhraseItem; nav: Nav }) {
  const t = useTheme();
  const p = item ?? SAMPLE_PHRASE;
  const [st, setSt] = useState(0); // 0 listen 1 recall 2 say 3 done
  const [reveal, setReveal] = useState(false);
  const [rec, setRec] = useState(false);
  const steps = ["Listen", "Recall", "Say it"];

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
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>next review {dueHint(p.dueAt)}</Text>
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
