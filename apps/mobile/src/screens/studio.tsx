// studio.tsx — "Your speaking world" dashboard. Time, lived-in topics/stories,
// and phrase insights. The Topics studio collection is one tap away.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/design/theme";
import { Avatar, BackBar, Card, EnterStagger, Icon, Pill, Screen, Serif, StatTile } from "@/design/ui";
import { useAuth } from "@/lib/auth";
import { dailySpeakingGoalMinutes } from "@/lib/practice-length";
import { fetchPhrases, phraseIsDue, type PhraseItem } from "@/lib/phrases";
import {
  fetchStudioSnapshot,
  formatSpeakingTime,
  type StudioSnapshot,
} from "@/lib/speaking-world";
import type { Nav } from "./nav";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const TOPIC_TONES = ["#3B6EE1", "#7BA7F6", "#C5D4A0", "#E8C37A", "#E7B8B4", "#A9C7FF"];

function stageCounts(phrases: PhraseItem[]) {
  return {
    recognize: phrases.filter((p) => p.learningStatus === "recognizing" || p.learningStatus === "new").length,
    help: phrases.filter((p) => p.learningStatus === "practicing").length,
    own: phrases.filter((p) => p.learningStatus === "ready").length,
    due: phrases.filter(phraseIsDue).length,
  };
}

function Donut({
  segments,
  track,
  size = 168,
  stroke = 18,
}: {
  segments: { color: string; value: number }[];
  track: string;
  size?: number;
  stroke?: number;
}) {
  const cx = size / 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {total > 0
        ? segments.map((seg, index) => {
            const len = (seg.value / total) * c;
            const node = (
              <Circle
                key={`${seg.color}-${index}`}
                cx={cx}
                cy={cx}
                r={r}
                stroke={seg.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${len} ${Math.max(0, c - len)}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cx})`}
              />
            );
            offset += len;
            return node;
          })
        : null}
    </Svg>
  );
}

function WeekRings({
  days,
  goalMinutes,
  accent,
  track,
  ink,
  ink3,
}: {
  days: { date: string; seconds: number }[];
  goalMinutes: number;
  accent: string;
  track: string;
  ink: string;
  ink3: string;
}) {
  const today = days[days.length - 1]?.date;
  const goal = goalMinutes * 60;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10 }}>
      {days.map((day) => {
        const date = new Date(`${day.date}T12:00:00`);
        const label = WEEKDAYS[date.getDay()];
        // Visual arc caps at 100% but the accessibility label keeps real time.
        const progress = Math.min(1, goal > 0 ? day.seconds / goal : 0);
        const minutes = Math.round(day.seconds / 60);
        const r = 14;
        const c = 2 * Math.PI * r;
        const filled = progress * c;
        const isToday = day.date === today;
        return (
          <View
            key={day.date}
            accessible
            accessibilityLabel={`${label}, ${minutes} of ${goalMinutes} minutes spoken`}
            style={{ alignItems: "center", gap: 6 }}
          >
            <Svg width={36} height={36}>
              {isToday ? (
                // Today is marked by an accent outline, never a false solid fill.
                <Circle cx={18} cy={18} r={r + 2.5} stroke={accent} strokeWidth={1.5} fill="none" />
              ) : null}
              <Circle cx={18} cy={18} r={r} stroke={track} strokeWidth={3.5} fill="none" />
              {progress > 0 ? (
                <Circle
                  cx={18}
                  cy={18}
                  r={r}
                  stroke={accent}
                  strokeWidth={3.5}
                  fill="none"
                  strokeDasharray={`${filled} ${c - filled}`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              ) : null}
            </Svg>
            <Text style={{ fontSize: 11, fontWeight: isToday ? "800" : "600", color: isToday ? accent : ink3 }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function SpeakingStudioScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { session } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as { display_name?: string };
  const name = meta.display_name?.trim() || session?.user?.email?.split("@")[0] || "You";
  const goalMinutes = dailySpeakingGoalMinutes(session?.user?.user_metadata);
  const [studio, setStudio] = useState<StudioSnapshot | null>(null);
  const [phrases, setPhrases] = useState<PhraseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [snap, bank] = await Promise.all([fetchStudioSnapshot(), fetchPhrases()]);
      setError(null);
      setStudio(snap);
      setPhrases(bank);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t load your studio.");
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

  const stages = useMemo(() => stageCounts(phrases ?? []), [phrases]);
  const bank = phrases?.length ?? 0;
  const stageBar = [
    { key: "recognize", label: "Recognize", value: stages.recognize, color: t.colors.blush },
    { key: "help", label: "Use with help", value: stages.help, color: t.colors.butter },
    { key: "own", label: "Use on my own", value: stages.own, color: t.colors.sage },
  ];
  const stageMax = Math.max(1, ...stageBar.map((row) => row.value));
  const donutSegments = (studio?.topicTime ?? []).map((item, index) => ({
    color: TOPIC_TONES[index % TOPIC_TONES.length],
    value: item.seconds,
  }));
  const weekSeconds = (studio?.lastSevenDays ?? []).reduce((sum, day) => sum + day.seconds, 0);
  const weekMinutes = Math.round(weekSeconds / 60);
  const plannedMinutes = goalMinutes * 7;

  return (
    <Screen
      bottomPad={40}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.acc} />}
    >
      <BackBar title="Your speaking world" onBack={nav.pop} right={<Avatar onPress={() => nav.push("editProfile")} />} />

      <EnterStagger i={0}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 2, paddingBottom: 4 }}>
          <Avatar s={56} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: t.colors.accD }}>STUDIO</Text>
            <Serif style={{ fontSize: 28, lineHeight: 32, color: t.colors.ink, marginTop: 4 }}>{name}</Serif>
          </View>
        </View>
      </EnterStagger>

      {studio === null && phrases === null && !error ? (
        <View style={{ paddingVertical: 48, alignItems: "center" }}>
          <ActivityIndicator color={t.colors.acc} />
        </View>
      ) : error ? (
        <Card style={{ alignItems: "center", paddingVertical: 26 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Couldn’t load your studio</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{error}</Text>
          <Pill tone="tint" small onPress={() => void load()} style={{ marginTop: 14, alignSelf: "center" }}>
            Retry
          </Pill>
        </Card>
      ) : (
        <>
          <EnterStagger i={1}>
          <Card lg>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.7, color: t.colors.accD }}>TOTAL SPEAKING TIME</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Serif style={{ fontSize: 44, lineHeight: 48, color: t.colors.ink }}>
                  {formatSpeakingTime(studio?.totalSeconds ?? 0)}
                </Serif>
                <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 8 }}>
                  {studio?.sessionCount ?? 0} session{(studio?.sessionCount ?? 0) === 1 ? "" : "s"} recorded
                </Text>
              </View>
              <View style={{ width: 132, height: 132, alignItems: "center", justifyContent: "center" }}>
                <Donut segments={donutSegments} track={t.colors.soft} size={132} stroke={14} />
              </View>
            </View>
            {(studio?.topicTime.length ?? 0) > 0 ? (
              <View style={{ gap: 8, marginTop: 16 }}>
                {studio!.topicTime.slice(0, 4).map((item, index) => (
                  <View key={item.name} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TOPIC_TONES[index % TOPIC_TONES.length] }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: t.colors.ink }}>{item.name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: t.colors.ink2 }}>{formatSpeakingTime(item.seconds)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 14, lineHeight: 19 }}>
                Talk in a session and your time will land here.
              </Text>
            )}
          </Card>
          </EnterStagger>

          <EnterStagger i={2}>
          <View style={{ flexDirection: "row", gap: t.gap }}>
            <StatTile
              chevron={false}
              tone="sky"
              label="Active topics"
              value={String(studio?.activeTopics ?? 0)}
              unit="topics"
              foot="With stories you can speak"
            />
            <StatTile
              chevron={false}
              tone="sage"
              label="Active stories"
              value={String(studio?.activeStories ?? 0)}
              unit="stories"
              foot="With talks or versions"
            />
          </View>
          </EnterStagger>

          <EnterStagger i={3}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Last 7 days</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.ink3 }}>Daily goal · {goalMinutes} min</Text>
            </View>
            <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 4 }}>
              {weekMinutes} min spoken · {plannedMinutes} min planned
            </Text>
            <WeekRings
              days={studio?.lastSevenDays ?? []}
              goalMinutes={goalMinutes}
              accent={t.colors.acc}
              track={t.colors.soft}
              ink={t.colors.ink}
              ink3={t.colors.ink3}
            />
          </Card>
          </EnterStagger>

          <EnterStagger i={4}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Phrase insights</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>{bank} IN BANK</Text>
            </View>
            <View style={{ gap: t.gap, marginTop: 14 }}>
              <View style={{ flexDirection: "row", gap: t.gap }}>
                {[
                  { label: "Recognize", value: stages.recognize, tone: t.colors.blush },
                  { label: "Use with help", value: stages.help, tone: t.colors.butter },
                ].map((cell) => (
                  <View key={cell.label} style={{ flex: 1, borderRadius: 16, backgroundColor: cell.tone, paddingVertical: 14, paddingHorizontal: 14 }}>
                    <Text style={{ fontSize: 28, fontWeight: "800", color: t.colors.onB, fontVariant: ["tabular-nums"] }}>{cell.value}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.onB2, marginTop: 4 }}>{cell.label}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: t.gap }}>
                {[
                  { label: "Use on my own", value: stages.own, tone: t.colors.sage },
                  { label: "Need refresh", value: stages.due, tone: t.colors.sky },
                ].map((cell) => (
                  <View key={cell.label} style={{ flex: 1, borderRadius: 16, backgroundColor: cell.tone, paddingVertical: 14, paddingHorizontal: 14 }}>
                    <Text style={{ fontSize: 28, fontWeight: "800", color: t.colors.onB, fontVariant: ["tabular-nums"] }}>{cell.value}</Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.onB2, marginTop: 4 }}>{cell.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ gap: 10, marginTop: 18 }}>
              {stageBar.map((row) => (
                <View key={row.key}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink }}>{row.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: t.colors.ink2 }}>{row.value}</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 999, backgroundColor: t.colors.soft, overflow: "hidden" }}>
                    <View style={{ width: `${Math.round((row.value / stageMax) * 100)}%`, height: "100%", borderRadius: 999, backgroundColor: t.colors.acc }} />
                  </View>
                </View>
              ))}
            </View>
          </Card>
          </EnterStagger>

          <EnterStagger i={5}>
          <Card onPress={() => nav.go("topics")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
              <Icon name="map" s={20} c={t.colors.accD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }}>Your studio</Text>
              <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 3 }}>Open your speaking folio</Text>
            </View>
            <Icon name="chev" s={16} c={t.colors.ink3} />
          </Card>
          </EnterStagger>
        </>
      )}
    </Screen>
  );
}
