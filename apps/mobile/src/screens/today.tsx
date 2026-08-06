// today.tsx — Today tab. Stats are real (derived from the bookmarks table):
// due-for-review, ready-to-use, collected, and saves-per-day this week. The
// Hero "speaking moment" is a static CTA (Speak isn't data-backed yet).
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";

import { useTheme } from "@/design/theme";
import { Avatar, Badge, Card, Header, Hero, Icon, Pill, Screen, Sect, Serif, StatTile } from "@/design/ui";
import { fetchBookmarks, phraseIsDue, weeklyCounts, type PhraseItem } from "@/lib/phrases";
import type { Nav } from "./nav";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function TodayScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [items, setItems] = useState<PhraseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchBookmarks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your progress.");
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
  const due = all.filter(phraseIsDue);
  const ready = all.filter((p) => p.status === "Ready to use").length;
  const collected = all.length;
  const thisWeek = all.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 7 * 86_400_000).length;
  const bars = weeklyCounts(all.map((p) => p.createdAt));
  const barMax = Math.max(1, ...bars.map((b) => b.count));
  const bringBack = due.slice(0, 2);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.acc} />}>
      <Header
        eyebrow={todayLabel()}
        title={
          <Serif style={{ fontSize: 36, lineHeight: 40, color: t.colors.ink }}>
            {greeting()},{"\n"}Sumin.
          </Serif>
        }
        sub="Ready to make one phrase usable?"
        right={<Avatar onPress={() => nav.push("settings")} />}
      />

      <Hero style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.8, color: "rgba(255,255,255,0.75)" }}>TODAY’S SPEAKING MOMENT</Text>
        <Serif style={{ fontSize: 27, lineHeight: 34, color: "#fff", marginTop: 14, marginBottom: 10 }}>Explain what you do in 30 seconds.</Serif>
        <Text style={{ fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.85)" }}>
          You’ve said it before — let’s make it automatic.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 22, alignItems: "center" }}>
          <Pill tone="white" onPress={() => nav.go("speak")} textStyle={{ color: t.colors.accD }} style={{ shadowOpacity: 0 }}>
            Start speaking
          </Pill>
          <Pill tone="ghost" onPress={() => nav.go("speak")} textStyle={{ color: "rgba(255,255,255,0.9)" }}>
            Warm up first
          </Pill>
        </View>
      </Hero>

      {items === null && !error ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={t.colors.acc} />
        </View>
      ) : error ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Couldn’t load your progress</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{error}</Text>
          <Pill tone="tint" small onPress={load} style={{ marginTop: 14 }}>
            Retry
          </Pill>
        </Card>
      ) : (
        <>
          <View style={{ gap: t.gap }}>
            <View style={{ flexDirection: "row", gap: t.gap }}>
              <StatTile
                tone="sky"
                label="Ready to refresh"
                value={String(due.length)}
                unit={`/ ${collected} phrases`}
                foot={due.length ? "Tap to bring one back" : "You’re all caught up"}
                onPress={() => (bringBack[0] ? nav.push("review", { item: bringBack[0] }) : nav.go("phrases"))}
              />
              <StatTile tone="sage" label="Ready to use" value={String(ready)} unit="phrases" foot="Your active English" onPress={() => nav.go("phrases")} />
            </View>
            <StatTile
              tone="blush"
              span
              label="Saved this week"
              value={String(thisWeek)}
              unit={`of ${collected} in your bank`}
              foot="Every phrase you keep is future English"
              onPress={() => nav.go("phrases")}
            />
          </View>

          <Sect title="Bring these back" action="See all" onAction={() => nav.go("phrases")} />
          {bringBack.length > 0 ? (
            bringBack.map((p) => (
              <Card key={p.id} onPress={() => nav.push("phrase", { item: p })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>
                  {p.text}
                </Text>
                <Badge s={p.status} />
              </Card>
            ))
          ) : (
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                <Icon name="check" s={20} w={2.4} c={t.colors.accD} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: t.colors.ink2 }}>Nothing due right now — your English is fresh.</Text>
            </Card>
          )}

          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Phrases you kept</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.accD }}>this week</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20, alignItems: "flex-end", height: 130 }}>
              {bars.map((b, i) => (
                <View key={i} style={{ flex: 1, alignItems: "center", gap: 4, justifyContent: "flex-end", height: "100%" }}>
                  <View
                    style={{
                      width: "100%",
                      height: b.count === 0 ? 8 : Math.max(20, Math.round((b.count / barMax) * 112)),
                      borderRadius: 9999,
                      backgroundColor: b.count > 0 ? t.colors.acc : t.colors.soft,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: t.colors.ink3, fontWeight: "600" }}>{b.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 12, lineHeight: 20 }}>
              {thisWeek > 0
                ? `${thisWeek} phrase${thisWeek === 1 ? "" : "s"} saved this week.`
                : "Nothing new this week — save one from a clip."}
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}
