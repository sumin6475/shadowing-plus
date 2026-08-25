// practice.tsx — the phrase Practice hub and Quick Rehearsal.
// Hub: quick solo rehearsal, or jump into a Talk with a linked story.
// Rehearsal: mirror-style mini session — see the target phrase, record takes,
// on-device STT checks whether the phrase actually came out.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/design/theme";
import { BackBar, Badge, Card, Icon, Pill, Screen, Sect, Serif, Stagger, Wave } from "@/design/ui";
import {
  fetchPhraseStories,
  linkPhraseToStory,
  recordPhraseEvent,
  type PhraseItem,
  type PhraseStoryRef,
} from "@/lib/phrases";
import { fetchAllStories, type StoryChoice } from "@/lib/speaking-world";
import { useSpeechSession } from "@/hooks/use-speech-session";
import type { Nav } from "./nav";

const KIND_LABEL: Record<string, string> = {
  phrase: "Expression",
  phrasal_verb: "Phrasal verb",
  pattern: "Pattern",
  idiom: "Idiom",
  word: "Word",
};

function PhraseSummaryCard({ p }: { p: PhraseItem }) {
  const t = useTheme();
  return (
    <Card lg style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
      <Serif style={{ fontSize: 26, lineHeight: 33, color: t.colors.ink }}>{p.text}</Serif>
      {p.translation ? (
        <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 8 }}>{p.translation}</Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 14 }}>
        <View style={{ minHeight: 28, borderRadius: 999, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.accS }}>
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.colors.accD }}>{KIND_LABEL[p.kind] ?? "Expression"}</Text>
        </View>
        <Badge s={p.status} />
      </View>
    </Card>
  );
}

// ── Practice hub ────────────────────────────────────────────────────────────
export function PracticeHubScreen({ nav, item }: { nav: Nav; item?: PhraseItem }) {
  const t = useTheme();
  const [stories, setStories] = useState<PhraseStoryRef[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const p = item;

  const load = useCallback(async () => {
    if (!p || p.id === "sample") {
      setStories([]);
      return;
    }
    try {
      setStories(await fetchPhraseStories(p.id));
    } catch {
      setStories([]);
    }
  }, [p]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!p) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <Card style={{ alignItems: "center", paddingVertical: 26 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>This phrase couldn’t be opened.</Text>
        </Card>
      </Screen>
    );
  }

  const talkWithStory = (story: PhraseStoryRef) => {
    nav.startTalk({
      ctx: story.title,
      storyId: story.id,
      prompt: `Try to use “${p.text}” while telling this story.`,
      from: "phrases",
    });
  };

  return (
    <>
      <Screen bottomPad={54}>
        <BackBar title="Practice" onBack={nav.pop} />
        <Stagger>
          <PhraseSummaryCard p={p} />

          <Pressable
            accessibilityRole="button"
            onPress={() => nav.push("rehearsal", { item: p })}
            style={({ pressed }) => [
              {
                minHeight: 58,
                borderRadius: 20,
                backgroundColor: t.colors.accS,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 9,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="mic" s={18} w={2.1} c={t.colors.accD} />
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.accD }}>Quick Practice</Text>
          </Pressable>

          <Sect title="Related stories" action="+ Add story" onAction={() => setPickerOpen(true)} />

          {stories === null ? (
            <View style={{ paddingVertical: 28, alignItems: "center" }}>
              <ActivityIndicator color={t.colors.acc} />
            </View>
          ) : stories.length === 0 ? (
            <Card style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ fontSize: 14.5, fontWeight: "700", color: t.colors.ink }}>No stories linked yet</Text>
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>
                Link a story and practice this phrase inside it.
              </Text>
            </Card>
          ) : (
            <>
              {stories.map((story) => (
                <Card key={story.id} style={{ paddingVertical: 13, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="sparkle" s={17} c={t.colors.accD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>{story.title}</Text>
                    <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 2 }}>
                      {story.versionCount} version{story.versionCount === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Talk “${story.title}” using this phrase`}
                    onPress={() => talkWithStory(story)}
                    style={({ pressed }) => ({
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: t.colors.acc,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Icon name="mic" s={17} c="#fff" />
                  </Pressable>
                </Card>
              ))}
              <Text style={{ textAlign: "center", fontSize: 12.5, color: t.colors.ink3 }}>
                Start talking practice using the phrase
              </Text>
            </>
          )}
        </Stagger>
      </Screen>
      <AddStorySheet
        open={pickerOpen}
        phrase={p}
        linked={stories ?? []}
        onClose={() => setPickerOpen(false)}
        onLinked={() => {
          setPickerOpen(false);
          nav.notify("Story linked");
          void load();
        }}
      />
    </>
  );
}

// Bottom sheet: search all stories, tap to link one to this phrase.
function AddStorySheet({
  open,
  phrase,
  linked,
  onClose,
  onLinked,
}: {
  open: boolean;
  phrase: PhraseItem;
  linked: PhraseStoryRef[];
  onClose: () => void;
  onLinked: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<StoryChoice[] | null>(null);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    fetchAllStories()
      .then(setAll)
      .catch(() => setAll([]));
  }, [open]);

  const linkedIds = useMemo(() => new Set(linked.map((s) => s.id)), [linked]);
  const choices = (all ?? []).filter(
    (s) => !linkedIds.has(s.id) && (!q.trim() || s.title.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const pick = async (story: StoryChoice) => {
    if (savingId) return;
    setSavingId(story.id);
    try {
      await linkPhraseToStory(phrase.id, story.id, "learner");
      onLinked();
    } catch (e) {
      Alert.alert("Couldn’t link", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.28)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{ maxHeight: "78%", backgroundColor: t.colors.bg, borderTopLeftRadius: 38, borderTopRightRadius: 38, paddingHorizontal: 22, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 18) + 8 }}
        >
          <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.soft, alignSelf: "center", marginBottom: 16 }} />
          <Serif style={{ fontSize: 22, color: t.colors.ink, textAlign: "center" }}>Add to a story</Serif>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: t.colors.card, borderRadius: 999, height: 42, paddingHorizontal: 15, marginTop: 14, borderWidth: 0.5, borderColor: t.ring }}>
            <Icon name="search" s={16} c={t.colors.ink3} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Find in stories"
              placeholderTextColor={t.colors.ink3}
              autoCorrect={false}
              autoCapitalize="none"
              style={{ flex: 1, minWidth: 0, paddingVertical: 0, fontSize: 15, color: t.colors.ink }}
            />
          </View>
          <View style={{ marginTop: 8 }}>
            {all === null ? (
              <View style={{ paddingVertical: 28, alignItems: "center" }}>
                <ActivityIndicator color={t.colors.acc} />
              </View>
            ) : choices.length === 0 ? (
              <Text style={{ fontSize: 13.5, color: t.colors.ink3, textAlign: "center", paddingVertical: 24, lineHeight: 20 }}>
                {q.trim() ? "No story matches that." : "Every story is already linked."}
              </Text>
            ) : (
              (() => {
                // fetchAllStories is newest-first, so the top slice is "Recents".
                const sectioned = !q.trim() && choices.length > 3;
                const row = (story: StoryChoice, first: boolean) => (
                  <Pressable
                    key={story.id}
                    onPress={() => void pick(story)}
                    style={({ pressed }) => ({
                      minHeight: 52,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 4,
                      borderTopWidth: first ? 0 : 1,
                      borderTopColor: t.colors.sep,
                      backgroundColor: pressed ? t.colors.soft : "transparent",
                      opacity: savingId && savingId !== story.id ? 0.5 : 1,
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.ink }} numberOfLines={1}>{story.title}</Text>
                      {story.domainName ? <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 2 }}>{story.domainName}</Text> : null}
                    </View>
                    {savingId === story.id ? <ActivityIndicator color={t.colors.acc} /> : <Icon name="plus" s={16} w={2.2} c={t.colors.accD} />}
                  </Pressable>
                );
                const header = (label: string) => (
                  <Text key={label} style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, marginTop: 12, marginBottom: 4 }}>
                    {label}
                  </Text>
                );
                if (!sectioned) return choices.slice(0, 10).map((story, i) => row(story, i === 0));
                return [
                  header("RECENTS"),
                  ...choices.slice(0, 3).map((story, i) => row(story, i === 0)),
                  header("ALL STORIES"),
                  ...choices.slice(3, 10).map((story, i) => row(story, i === 0)),
                ];
              })()
            )}
          </View>
          <Pill tone="ghost" onPress={onClose} style={{ alignSelf: "center", marginTop: 14 }}>
            Cancel
          </Pill>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Quick Rehearsal ─────────────────────────────────────────────────────────
const COACH_LINES = [
  "Picture yourself using this, then say it out loud twice.",
  "Mumble it until it comes out without looking.",
  "Say it slow once, then at full speed.",
];

/** Loose containment: did the phrase come out in the take? */
function usedPhrase(transcript: string, phrase: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  const tr = norm(transcript);
  const ph = norm(phrase);
  return ph.length > 0 && tr.includes(ph);
}

export function QuickRehearsalScreen({
  nav,
  item,
  onDone,
}: {
  nav: Nav;
  item?: PhraseItem;
  /** Embedded use (e.g. inside the review sheet): called instead of nav.pop. */
  onDone?: () => void;
}) {
  const t = useTheme();
  const speech = useSpeechSession();
  const [takes, setTakes] = useState(0);
  const [lastTake, setLastTake] = useState<string | null>(null);
  const [hit, setHit] = useState(false);
  const p = item;

  const toggleRecord = async () => {
    if (!p) return;
    if (speech.recognizing) {
      const text = speech.stop();
      setTakes((n) => n + 1);
      setLastTake(text || "");
      if (usedPhrase(text, p.text)) setHit(true);
      return;
    }
    setLastTake(null);
    await speech.start();
  };

  const done = () => {
    speech.stop();
    if (p && p.id !== "sample" && takes > 0) {
      void recordPhraseEvent({
        phraseItemId: p.id,
        event: hit ? "used" : "retrieved",
        evidence: { source: "quick_rehearsal", takes },
      }).catch(() => {});
    }
    if (onDone) onDone();
    else nav.pop();
    if (takes > 0) nav.notify(hit ? "It came out!" : "Rehearsal done");
  };

  if (!p) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <Card style={{ alignItems: "center", paddingVertical: 26 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>This phrase couldn’t be opened.</Text>
        </Card>
      </Screen>
    );
  }

  const coach = COACH_LINES[takes % COACH_LINES.length];

  return (
    <Screen bottomPad={54} scrollEnabled={false} style={{ flexGrow: 1 }}>
      <BackBar title="Quick Rehearsal" onBack={done} />

      <Card style={{ paddingVertical: 15, paddingHorizontal: 18 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.7, color: t.colors.accD }}>TARGET PHRASE</Text>
        <Serif style={{ fontSize: 22, lineHeight: 28, color: t.colors.ink, marginTop: 6 }}>{p.text}</Serif>
        {p.translation ? <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 4 }}>{p.translation}</Text> : null}
      </Card>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 22 }}>
        <View
          style={[
            {
              width: 250,
              height: 250,
              borderRadius: 125,
              backgroundColor: speech.recognizing ? t.colors.accS : t.colors.soft,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            },
            speech.recognizing ? t.shadowLg : null,
          ]}
        >
          {speech.recognizing ? (
            <Wave n={18} active h={40} />
          ) : (
            <>
              <Icon name="mic" s={30} w={1.8} c={t.colors.ink3} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.ink3 }}>Mirror</Text>
            </>
          )}
        </View>
        <View style={{ minHeight: 64, paddingHorizontal: 26, justifyContent: "center" }}>
          {speech.recognizing ? (
            <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2, textAlign: "center" }}>
              {speech.transcript || "Listening…"}
            </Text>
          ) : lastTake !== null ? (
            <View style={{ alignItems: "center", gap: 6 }}>
              {hit ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Icon name="check" s={14} w={2.6} c={t.colors.accD} />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: t.colors.accD }}>The phrase came out!</Text>
                </View>
              ) : null}
              <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink3, textAlign: "center", fontStyle: lastTake ? "normal" : "italic" }}>
                {lastTake || "No words were captured. Try once more."}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2, textAlign: "center" }}>“{coach}”</Text>
          )}
          {speech.error ? (
            <Text style={{ fontSize: 12.5, color: "#E5484D", textAlign: "center", marginTop: 6 }}>{speech.error}</Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 6 }}>
        <Pill tone="white" onPress={() => void toggleRecord()} style={{ minWidth: 132, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: speech.recognizing ? 3 : 7,
                backgroundColor: "#E5484D",
              }}
            />
            <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }}>{speech.recognizing ? "Stop" : "Record"}</Text>
          </View>
        </Pill>
        <Pill onPress={done} style={{ minWidth: 132, justifyContent: "center" }}>
          Done
        </Pill>
      </View>
    </Screen>
  );
}
