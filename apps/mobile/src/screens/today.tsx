// today.tsx — Today tab. Hero, this-week phrase saves, leftover review queue.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { useTheme } from "@/design/theme";
import { Avatar, Card, Hero, Icon, Pill, Screen, Serif, Stagger } from "@/design/ui";
import { reviewedOnLocalDay, todaysPhrases } from "@/lib/daily-phrases";
import { fetchPhrases, weeklyCounts, type PhraseItem } from "@/lib/phrases";
import { useAuth } from "@/lib/auth";
import { fetchRecentTalkedStory, type RecentTalkedStory } from "@/lib/speaking-world";
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

// Hero line: rotates daily (deterministic — day number, no flicker across
// renders) so the invitation stays fresh. The story rotates daily too, across
// the distinct stories in recent Talk sessions (fetchRecentTalkedStory).
function heroCopy(storyTitle: string | null): string {
  const day = Math.floor(Date.now() / 86_400_000);
  if (storyTitle) {
    const variants = [
      `Your “${storyTitle}” story is waiting`,
      `Make “${storyTitle}” smoother today`,
      `One more take of “${storyTitle}”?`,
    ];
    return variants[day % variants.length];
  }
  const variants = [
    "What’s on your mind today?",
    "Speak for a few minutes",
    "Say anything out loud",
  ];
  return variants[day % variants.length];
}

function unfinishedToday(phrases: PhraseItem[]): PhraseItem[] {
  return phrases.filter((phrase) => !reviewedOnLocalDay(phrase.lastReviewedAt));
}

function reviewQueue(all: PhraseItem[]): PhraseItem[] {
  return unfinishedToday(all);
}

export function TodayScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const { session } = useAuth();
  const [items, setItems] = useState<PhraseItem[] | null>(null);
  const [reviewToday, setReviewToday] = useState<PhraseItem[]>([]);
  const [recentStory, setRecentStory] = useState<RecentTalkedStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Replay the entrance cascade whenever the tab regains focus (native tabs
  // keep this screen mounted).
  const [enterKey, setEnterKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setEnterKey((k) => k + 1);
    }, []),
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [all, today] = await Promise.all([fetchPhrases(), todaysPhrases()]);
      setItems(all);
      setReviewToday(today);
    } catch {
      setError("Your saved phrases are still safe. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let active = true;
    fetchRecentTalkedStory()
      .then((story) => {
        if (active) setRecentStory(story);
      })
      .catch(() => {
        if (active) setRecentStory(null);
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      load(),
      fetchRecentTalkedStory()
        .then(setRecentStory)
        .catch(() => setRecentStory(null)),
    ]);
    setRefreshing(false);
  }, [load]);

  const all = items ?? [];
  const thisWeek = all.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 7 * 86_400_000).length;
  const lastWeek = all.filter((p) => {
    const age = Date.now() - new Date(p.createdAt).getTime();
    return age >= 7 * 86_400_000 && age < 14 * 86_400_000;
  }).length;
  const weekDelta = lastWeek > 0 && thisWeek !== lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const bars = weeklyCounts(all.map((p) => p.createdAt));
  const barMax = Math.max(1, ...bars.map((b) => b.count));
  const leftover = unfinishedToday(reviewToday);
  const finishedToday = reviewToday.length > 0 && leftover.length === 0;
  const metadata = session?.user.user_metadata as { full_name?: string; name?: string; display_name?: string } | undefined;
  const displayName = metadata?.display_name?.split(" ")[0] || metadata?.full_name?.split(" ")[0] || metadata?.name?.split(" ")[0] || null;

  const startSpeaking = () => {
    if (recentStory) {
      nav.startTalk({
        ctx: recentStory.storyTitle,
        storyId: recentStory.storyId,
        messageId: recentStory.messageId,
        prompt: recentStory.beats[0] ?? "Tell this story in your own words.",
        beats: recentStory.beats,
        from: "today",
      });
      return;
    }
    nav.go("speak");
  };

  const startReview = () => {
    const queue = reviewQueue(reviewToday);
    if (!queue.length) return;
    nav.push("review", { item: queue[0], queue });
  };

  const reviewCopy = () => {
    if (reviewToday.length === 0) return "Keep a phrase to start today’s list.";
    if (finishedToday) return "You’ve finished for today!";
    return `${leftover.length} / ${reviewToday.length} left for practice today!`;
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.acc} />}>
      <Stagger replayKey={enterKey}>
      <View style={{ paddingHorizontal: 2, paddingTop: 4, paddingBottom: 2 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>{todayLabel()}</Text>
          <Avatar onPress={() => nav.push("settings")} />
        </View>
        <Serif style={{ fontSize: 36, lineHeight: 40, color: t.colors.ink, marginTop: 10 }}>
          {greeting()}{displayName ? `, ${displayName}` : "."}
        </Serif>
      </View>

      <Hero style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: "rgba(255,255,255,0.78)" }}>
          Start the day with practice
        </Text>
        <Serif style={{ fontSize: 26, lineHeight: 33, color: "#fff", marginTop: 10 }}>
          {heroCopy(recentStory?.storyTitle ?? null)}
        </Serif>
        <Pill tone="white" full icon="mic" onPress={startSpeaking} textStyle={{ color: t.colors.accD }} style={{ shadowOpacity: 0, marginTop: 18 }}>
          Speaking
        </Pill>
      </Hero>
      </Stagger>

      {items === null && !error ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={t.colors.acc} />
        </View>
      ) : error ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>We couldn’t refresh your progress</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{error}</Text>
          <Pill tone="tint" small onPress={load} style={{ marginTop: 14, alignSelf: "center" }}>
            Retry
          </Pill>
        </Card>
      ) : (
        <Stagger replayKey={enterKey} startIndex={2}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>This week</Text>
                {weekDelta !== null ? (
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: t.colors.ink3, marginTop: 3 }}>
                    {weekDelta >= 200
                      ? `${Math.round(thisWeek / lastWeek)}× last week`
                      : `${Math.abs(weekDelta)}% ${weekDelta > 0 ? "more" : "less"} than last week`}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => nav.go("phrases")} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingTop: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.accD }}>See more</Text>
                <Icon name="chev" s={13} w={2.2} c={t.colors.accD} />
              </Pressable>
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
                : "Nothing new this week."}
            </Text>
          </Card>

          <Card onPress={leftover.length ? startReview : undefined}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Today</Text>
              {leftover.length ? <Icon name="chev" s={15} w={2.2} c={t.colors.ink3} /> : null}
            </View>
            {reviewToday.length > 0 && !finishedToday ? (
              <View style={{ alignItems: "center", paddingVertical: 18 }}>
                <Text style={{ fontSize: 46, fontWeight: "800", letterSpacing: -1.5, color: t.colors.ink, fontVariant: ["tabular-nums"] }}>
                  {leftover.length} / {reviewToday.length}
                </Text>
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: t.colors.ink2, marginTop: 6 }}>
                  left for practice today!
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 20, gap: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={finishedToday ? "check" : "bank"} s={19} c={t.colors.accD} />
                </View>
                <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink, textAlign: "center" }}>{reviewCopy()}</Text>
              </View>
            )}
          </Card>
        </Stagger>
      )}
    </Screen>
  );
}
