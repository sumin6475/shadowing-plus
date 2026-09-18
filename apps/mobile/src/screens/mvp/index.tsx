import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Avatar, BackBar, Card, Icon, Pill, Screen, Serif } from "@/design/ui";
import { useTheme } from "@/design/theme";
import { usePhraseSpeech } from "@/hooks/use-phrase-speech";
import { createPhrase, deletePhrase } from "@/lib/phrases";
import {
  addSentence,
  completedSteps,
  createNote,
  deleteNote,
  deleteSentence,
  durationLabel,
  loadMirrorSessions,
  loadNote,
  loadNotes,
  loadPhraseBank,
  loadSentences,
  phraseStage,
  readyAt,
  saveNote,
  setStep,
  STEPS,
  type MirrorSession,
  type MvpPhrase,
  type Note,
  type Sentence,
} from "@/lib/mvp";
import { useAuth } from "@/lib/auth";
import type { Nav } from "../nav";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.1,
        color: t.colors.ink3,
      }}
    >
      {children}
    </Text>
  );
}
function Copy({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink2 }}>
      {children}
    </Text>
  );
}
function Field(props: React.ComponentProps<typeof TextInput>) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.colors.ink3}
      {...props}
      style={[
        {
          backgroundColor: t.colors.soft,
          color: t.colors.ink,
          borderRadius: 14,
          padding: 15,
          fontSize: 16,
          minHeight: 50,
        },
        props.style,
      ]}
    />
  );
}
function ErrorCard({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) {
  if (!error) return null;
  return (
    <Card>
      <Copy>{error}</Copy>
      <Pill tone="soft" onPress={retry}>
        Try again
      </Pill>
    </Card>
  );
}
function Header({
  nav,
  eyebrow,
  title,
  add,
}: {
  nav: Nav;
  eyebrow: string;
  title: string;
  add?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 14, paddingTop: 8, paddingBottom: 6 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Label>{eyebrow}</Label>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {add ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save a phrase"
              onPress={add}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: t.colors.card,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="plus" c={t.colors.ink} />
            </Pressable>
          ) : null}
          <Avatar onPress={() => nav.push("profile")} />
        </View>
      </View>
      <Serif style={{ fontSize: 36, lineHeight: 40 }}>{title}</Serif>
    </View>
  );
}
function useRefresh<T>(fetcher: () => Promise<T>, revision: number) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const key = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (key === generation.current) setData(result);
    } catch (e) {
      if (key === generation.current) setError(message(e));
    } finally {
      if (key === generation.current) setLoading(false);
    }
  }, [fetcher]);
  useFocusEffect(
    useCallback(() => {
      void revision;
      void refresh();
      return () => {
        generation.current++;
      };
    }, [refresh, revision]),
  );
  return { data, error, loading, refresh };
}
const loadHome = async () => {
  const [phrases, notes] = await Promise.all([loadPhraseBank(), loadNotes()]);
  return { phrases, notes };
};
export function PhraseBank({ nav }: { nav: Nav }) {
  const t = useTheme(),
    state = useRefresh(loadHome, nav.speakingDataRevision),
    voice = usePhraseSpeech();
  const [filter, setFilter] = useState("All"),
    [query, setQuery] = useState("");
  const phrases = state.data?.phrases ?? [],
    recent = state.data?.notes[0];
  const ready = phrases
    .filter((p) => readyAt(p) > 0)
    .sort((a, b) => readyAt(b) - readyAt(a))[0];
  const filtered = phrases
    .filter(
      (p) =>
        (filter === "All" || phraseStage(p) === filter) &&
        `${p.text} ${p.translation ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const groups = new Map<string, MvpPhrase[]>();
  for (const p of filtered) {
    const d = new Date(p.createdAt),
      today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const label =
      d >= today
        ? "Today"
        : d >= yesterday
          ? "Yesterday"
          : d.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            });
    groups.set(label, [...(groups.get(label) ?? []), p]);
  }
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={state.loading}
          onRefresh={() => void state.refresh()}
        />
      }
    >
      <Header
        nav={nav}
        eyebrow="YOUR PHRASE BANK"
        title={"English you\nchose to keep."}
        add={() => nav.push("quickCapture")}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 5 }}
      >
        <View
          style={{
            width: 258,
            minHeight: 208,
            borderRadius: 26,
            padding: 22,
            backgroundColor: "#16213E",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <Text style={{ color: "#BEC9E0", fontSize: 12 }}>
            A little practice, in your own words.
          </Text>
          <Serif numberOfLines={4} style={{ fontSize: 26, color: "#fff" }}>
            {recent
              ? `Your “${recent.title || "Untitled note"}” note is waiting.`
              : "Make a little room\nfor your voice."}
          </Serif>
          <Pill
            tone="white"
            full
            icon="mic"
            onPress={() =>
              nav.startTalk({
                ctx: recent?.title || "Free talk",
                noteId: recent?.id,
                beats: recent?.body.split("\n"),
                from: "phrases",
              })
            }
          >
            Speak
          </Pill>
        </View>
        <Card
          onPress={() =>
            ready
              ? nav.push("mvpPhrase", { id: ready.id })
              : phrases[0]
                ? nav.push("mvpPhrase", { id: phrases[0].id })
                : nav.push("quickCapture")
          }
          style={{
            width: 215,
            minHeight: 208,
            justifyContent: "space-between",
            padding: 22,
          }}
        >
          <Label>TODAY’S PHRASE</Label>
          <Serif style={{ fontSize: 29 }}>
            {ready?.text ?? "Your first\nready phrase."}
          </Serif>
          <Copy>
            {ready?.translation ?? "Complete three small steps. Make it yours."}
          </Copy>
          <Text
            style={{ color: t.colors.acc, fontSize: 12, fontWeight: "700" }}
          >
            {ready ? "Ready to say ↗" : "Start with one phrase →"}
          </Text>
        </Card>
      </ScrollView>
      <Field
        accessibilityLabel="Search phrases"
        placeholder="Search your phrases"
        value={query}
        onChangeText={setQuery}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7 }}
      >
        {["All", "Collected", "Learning", "Ready"].map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: f === filter }}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 12,
              borderRadius: 24,
              backgroundColor: f === filter ? t.colors.acc : t.colors.card,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: f === filter ? t.colors.onAcc : t.colors.ink2,
              }}
            >
              {f}{" "}
              {
                phrases.filter((p) => f === "All" || phraseStage(p) === f)
                  .length
              }
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ErrorCard error={state.error} retry={() => void state.refresh()} />
      {!state.loading && !state.error && filtered.length === 0 ? (
        <Card>
          <Serif style={{ fontSize: 26 }}>
            {phrases.length ? "Nothing here yet." : "Good words find you."}
          </Serif>
          <Copy>
            {phrases.length
              ? "Try another filter or search."
              : "Save an expression from a conversation, a video, or your day. Learn it when you have a moment."}
          </Copy>
          {!phrases.length ? (
            <Pill onPress={() => nav.push("quickCapture")}>
              Save your first phrase
            </Pill>
          ) : null}
        </Card>
      ) : null}
      {[...groups].map(([label, items]) => (
        <View key={label} style={{ gap: 9, marginTop: 8 }}>
          <Label>{label.toUpperCase()}</Label>
          <View
            style={{
              backgroundColor: t.colors.card,
              borderRadius: 22,
              overflow: "hidden",
            }}
          >
            {items.map((p, i) => (
              <View
                key={p.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingLeft: 9,
                  borderTopWidth: i ? 0.5 : 0,
                  borderColor: t.colors.sep,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${p.text}`}
                  onPress={() => void voice.toggle(p.id, p.text)}
                  style={{
                    width: 44,
                    height: 54,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {voice.loadingId === p.id ? (
                    <ActivityIndicator />
                  ) : (
                    <Icon
                      name={voice.speakingId === p.id ? "pause" : "speaker"}
                      s={17}
                      c={t.colors.acc}
                    />
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${p.text}, ${phraseStage(p)}, ${completedSteps(p)} of 3 complete`}
                  onPress={() => nav.push("mvpPhrase", { id: p.id })}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: 64,
                    paddingRight: 15,
                    gap: 12,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontWeight: "600",
                      fontSize: 16,
                      color: t.colors.ink,
                    }}
                  >
                    {p.text}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    {STEPS.map((step) => (
                      <View
                        key={step}
                        style={{
                          height: 5,
                          width: 5,
                          borderRadius: 3,
                          backgroundColor: p[step]
                            ? t.colors.acc
                            : t.colors.sep,
                        }}
                      />
                    ))}
                  </View>
                  <Icon name="chev" s={13} c={t.colors.ink3} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

export function QuickCapture({ nav }: { nav: Nav }) {
  const [text, setText] = useState(""),
    [meaning, setMeaning] = useState(""),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createPhrase({
        text: text.trim(),
        meaning,
        source: "manual",
        sourceLabel: source || undefined,
      });
      nav.invalidateSpeakingData();
      nav.pop();
      nav.notify("Saved to your Phrase Bank");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <BackBar title="Phrases" onBack={nav.pop} />
      <Serif style={{ fontSize: 36 }}>Save a phrase.</Serif>
      <Copy>No time now? Keep it and come back later.</Copy>
      <Label>PHRASE</Label>
      <Field
        accessibilityLabel="Phrase"
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder="Something worth keeping"
      />
      <Label>MEANING · OPTIONAL</Label>
      <Field
        accessibilityLabel="Meaning"
        value={meaning}
        onChangeText={setMeaning}
        placeholder="What it means to you"
      />
      <Label>WHERE DID YOU HEAR IT? · OPTIONAL</Label>
      <Field
        accessibilityLabel="Source"
        value={source}
        onChangeText={setSource}
        placeholder="A podcast, a friend, a moment…"
      />
      <ErrorCard error={error} retry={() => void save()} />
      <Pill
        full
        style={{ opacity: busy || !text.trim() ? 0.5 : 1 }}
        onPress={busy || !text.trim() ? undefined : () => void save()}
      >
        {busy ? "Saving…" : "Save to Collected"}
      </Pill>
    </Screen>
  );
}

export function PhraseChecklist({ nav, id }: { nav: Nav; id: string }) {
  const [rate, setRate] = useState(1),
    [repeat, setRepeat] = useState(1);
  const t = useTheme(),
    voice = usePhraseSpeech({ rate, repeat });
  const fetcher = useCallback(async () => {
    const [all, sentences] = await Promise.all([
      loadPhraseBank(),
      loadSentences(id),
    ]);
    const phrase = all.find((p) => p.id === id);
    if (!phrase) throw new Error("This phrase is no longer available.");
    return { phrase, sentences };
  }, [id]);
  const state = useRefresh(fetcher, nav.speakingDataRevision),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const p = state.data?.phrase;
  const mutate = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      nav.invalidateSpeakingData();
      await state.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <BackBar title="Phrases" onBack={nav.pop} />
      <ErrorCard error={state.error} retry={() => void state.refresh()} />
      {!p ? (
        state.loading ? (
          <ActivityIndicator />
        ) : null
      ) : (
        <>
          <Label>
            {phraseStage(p).toUpperCase()} · {completedSteps(p)} OF 3
          </Label>
          <Serif style={{ fontSize: 43 }}>{p.text}</Serif>
          <Copy>{p.translation || "An expression to make your own."}</Copy>
          <Label>
            {p.source} · {new Date(p.createdAt).toLocaleDateString()}
          </Label>
          <View style={{ flexDirection: "row", gap: 5, marginVertical: 10 }}>
            {STEPS.map((step) => (
              <View
                key={step}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: p[step] ? t.colors.acc : t.colors.sep,
                }}
              />
            ))}
          </View>
          {STEPS.map((step, index) => (
            <Card key={step} style={{ gap: 14 }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: !!p[step],
                  disabled:
                    busy || (index === 2 && !state.data?.sentences.length),
                }}
                onPress={() => {
                  if (
                    index === 2 &&
                    !p[step] &&
                    !state.data?.sentences.length
                  ) {
                    setError(
                      "Save at least one sentence before completing this step.",
                    );
                    return;
                  }
                  void mutate(() => setStep(id, step, !p[step]));
                }}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                  minHeight: 44,
                }}
              >
                <View
                  style={{
                    height: 26,
                    width: 26,
                    borderRadius: 13,
                    borderWidth: 1.5,
                    borderColor: p[step] ? t.colors.acc : t.colors.ink3,
                    backgroundColor: p[step] ? t.colors.acc : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {p[step] ? (
                    <Icon name="check" s={16} c={t.colors.onAcc} />
                  ) : null}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: t.colors.ink,
                    }}
                  >
                    {index + 1} ·{" "}
                    {
                      [
                        "Say it until it feels natural",
                        "Hear it in real sentences",
                        "Make your own sentence",
                      ][index]
                    }
                  </Text>
                  <Label>
                    {p[step]
                      ? `DONE · ${new Date(p[step]!).toLocaleDateString()}`
                      : [
                          "Listen, repeat, then check",
                          "Find a voice and a context",
                          "At least one saved sentence",
                        ][index]}
                  </Label>
                </View>
              </Pressable>
              {index === 0 ? (
                <>
                  <Pill
                    icon={voice.speakingId === id ? "pause" : "speaker"}
                    onPress={() => void voice.toggle(id, p.text)}
                  >
                    {voice.loadingId === id
                      ? "Loading voice…"
                      : voice.speakingId === id
                        ? "Stop"
                        : "Play pronunciation"}
                  </Pill>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pill
                      tone="tint"
                      small
                      onPress={() => {
                        void voice.stop();
                        setRate(rate === 1 ? 0.75 : 1);
                      }}
                    >
                      {rate}× speed
                    </Pill>
                    <Pill
                      tone="tint"
                      small
                      icon="repeat"
                      onPress={() => {
                        void voice.stop();
                        setRepeat(repeat === 1 ? 5 : 1);
                      }}
                    >
                      {repeat === 1 ? "Play once" : "Repeat 5×"}
                    </Pill>
                  </View>
                  <Copy>
                    {voice.fallbackId === id
                      ? "Playing device voice. Tap again to repeat."
                      : "Listen and repeat as often as you like."}
                  </Copy>
                </>
              ) : index === 1 ? (
                <Pill
                  tone="tint"
                  icon="link"
                  onPress={() =>
                    void Linking.openURL(
                      `https://youglish.com/pronounce/${encodeURIComponent(p.text)}/english`,
                    ).catch((e) => setError(message(e)))
                  }
                >
                  Open YouGlish
                </Pill>
              ) : (
                <>
                  {state.data?.sentences.map((s: Sentence) => (
                    <View
                      key={s.id}
                      style={{
                        backgroundColor: t.colors.soft,
                        borderRadius: 14,
                        padding: 13,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          lineHeight: 22,
                          color: t.colors.ink,
                        }}
                      >
                        {s.text}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete sentence"
                        style={{ padding: 10 }}
                        onPress={() =>
                          Alert.alert(
                            "Delete this sentence?",
                            "Removing the last sentence resets this step.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: () =>
                                  void mutate(() => deleteSentence(s.id)),
                              },
                            ],
                          )
                        }
                      >
                        <Icon name="x" s={14} c={t.colors.ink3} />
                      </Pressable>
                    </View>
                  ))}
                  <Field
                    accessibilityLabel="Your sentence"
                    multiline
                    placeholder={`Use “${p.text}” in your own sentence…`}
                    value={draft}
                    onChangeText={setDraft}
                  />
                  <Pill
                    tone="soft"
                    onPress={() =>
                      void mutate(async () => {
                        await addSentence(id, draft);
                        setDraft("");
                      })
                    }
                  >
                    {busy ? "Saving…" : "Save sentence"}
                  </Pill>
                </>
              )}
            </Card>
          ))}
          <ErrorCard error={error} retry={() => setError(null)} />
          {phraseStage(p) === "Ready" ? (
            <Pill
              full
              icon="mic"
              onPress={() => nav.startTalk({ from: "phrases" })}
            >
              Use it in the mirror
            </Pill>
          ) : null}
          <Pill
            tone="ghost"
            onPress={() =>
              Alert.alert(
                "Delete this phrase?",
                "Its saved sentences will also be removed.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () =>
                      void mutate(async () => {
                        await deletePhrase(id);
                        nav.pop();
                      }),
                  },
                ],
              )
            }
          >
            Delete phrase
          </Pill>
        </>
      )}
    </Screen>
  );
}

export function NotesStudio({ nav }: { nav: Nav }) {
  const t = useTheme();
  const state = useRefresh(loadNotes, nav.speakingDataRevision),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const note = await createNote();
      nav.invalidateSpeakingData();
      nav.push("mvpNote", { id: note.id });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const notes = (state.data ?? []).filter((n) =>
    `${n.title} ${n.body}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={state.loading}
          onRefresh={() => void state.refresh()}
        />
      }
    >
      <Header
        nav={nav}
        eyebrow="STUDIO"
        title={"Notes for what\nyou’ll say next."}
      />
      <Field
        accessibilityLabel="Search notes"
        value={query}
        onChangeText={setQuery}
        placeholder="Search notes"
      />
      <Pill full icon="plus" onPress={() => void create()}>
        {busy ? "Creating…" : "New note"}
      </Pill>
      <ErrorCard
        error={state.error || error}
        retry={() => {
          setError(null);
          void state.refresh();
        }}
      />
      <View style={{ marginTop: 14 }}>
        <Label>RECENT NOTES · {notes.length}</Label>
      </View>
      {!state.loading && !notes.length && !state.error ? (
        <Card>
          <Serif style={{ fontSize: 28 }}>
            {query ? "No matching notes." : "Start with a real moment."}
          </Serif>
          <Copy>
            {query
              ? "Try a different word."
              : "Tomorrow’s meeting. A catch-up with a friend. Something you want to explain. Give your thoughts a place to begin."}
          </Copy>
        </Card>
      ) : null}
      {notes.map((n) => (
        <Card
          key={n.id}
          onPress={() => nav.push("mvpNote", { id: n.id })}
          style={{ gap: 10, padding: 21 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: "600",
                color: t.colors.ink,
              }}
            >
              {n.title || "Untitled note"}
            </Text>
            <Label>
              {new Date(n.updated_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </Label>
          </View>
          <Copy>
            {n.body
              .replace(/Opening|Body|Closing/g, "")
              .split("\n")
              .map((l) => l.replace(/^[-•]\s*/, ""))
              .filter((l) => l.trim())
              .slice(0, 3)
              .join(" · ") || "A blank page for your next conversation."}
          </Copy>
          <Label>
            {n.body.split("\n").filter((l) => /^[-•]\s*\S/.test(l)).length}{" "}
            POINTS · OPEN NOTE ↗
          </Label>
        </Card>
      ))}
    </Screen>
  );
}

export function NoteEditor({ nav, id }: { nav: Nav; id: string }) {
  const { session } = useAuth();
  const draftKey = `saylo.note-draft.${session?.user.id}.${id}`;
  const t = useTheme(),
    [note, setNote] = useState<Note | null>(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [status, setStatus] = useState("Loading…"),
    [error, setError] = useState<string | null>(null);
  const current = useRef({ title: "", body: "" }),
    saved = useRef(""),
    queue = useRef(Promise.resolve()),
    loaded = useRef(false),
    alive = useRef(true);
  const load = useCallback(async () => {
    try {
      const n = await loadNote(id);
      const local = await AsyncStorage.getItem(draftKey);
      if (!alive.current) return;
      let restored: { title: string; body: string } | null = null;
      try {
        const parsed = local ? JSON.parse(local) : null;
        if (
          parsed &&
          typeof parsed.title === "string" &&
          typeof parsed.body === "string"
        )
          restored = parsed;
      } catch {}
      current.current = restored ?? { title: n.title, body: n.body };
      saved.current = JSON.stringify({ title: n.title, body: n.body });
      loaded.current = true;
      setNote(n);
      setTitle(current.current.title);
      setBody(current.current.body);
      setStatus(restored ? "Restored unsaved changes" : "All changes saved");
      setError(null);
    } catch (e) {
      if (alive.current) setError(message(e));
    }
  }, [id, draftKey]);
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(load);
    return () => {
      alive.current = false;
    };
  }, [load]);
  const flush = useCallback(() => {
    const snapshot = { ...current.current };
    const key = JSON.stringify(snapshot);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (key === saved.current) return;
        if (alive.current) setStatus("Saving…");
        await saveNote(id, snapshot.title, snapshot.body);
        saved.current = key;
        if (JSON.stringify(current.current) === key)
          await AsyncStorage.removeItem(draftKey);
        nav.invalidateSpeakingData();
        if (alive.current) {
          setStatus(
            JSON.stringify(current.current) === key
              ? "All changes saved"
              : "Unsaved changes",
          );
          setError(null);
        }
      });
    return queue.current;
  }, [id, nav, draftKey]);
  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(
      () =>
        void flush().catch((e) => {
          if (alive.current) {
            setError(message(e));
            setStatus("Not saved · retry");
          }
        }),
      650,
    );
    return () => clearTimeout(timer);
  }, [title, body, flush]);
  // Also flush on route teardown, so a gesture back cannot silently drop edits.
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(
    () => () => {
      if (loaded.current) void flushRef.current().catch(() => {});
    },
    [],
  );
  const leave = async (talk = false) => {
    try {
      await flush();
      if (talk)
        nav.startTalk({
          ctx: current.current.title || "Untitled note",
          noteId: id,
          beats: current.current.body.split("\n"),
          from: "topics",
          returnTo: {
            tab: "topics",
            stack: [{ name: "mvpNote", props: { id } }],
          },
        });
      else nav.pop();
    } catch (e) {
      setError(message(e));
    }
  };
  return (
    <Screen>
      <BackBar title="Studio" onBack={() => void leave()} />
      {error ? (
        <ErrorCard
          error={error}
          retry={() =>
            note ? void flush().catch((e) => setError(message(e))) : void load()
          }
        />
      ) : null}
      {note ? (
        <>
          <TextInput
            accessibilityLabel="Note title"
            maxLength={120}
            placeholder="Give this moment a title"
            placeholderTextColor={t.colors.ink3}
            value={title}
            onChangeText={(value) => {
              current.current.title = value;
              setTitle(value);
              setStatus("Unsaved changes");
              void AsyncStorage.setItem(
                draftKey,
                JSON.stringify(current.current),
              ).catch(() =>
                setError(
                  "Couldn’t keep a local draft. Keep this screen open until saved.",
                ),
              );
            }}
            style={{
              fontFamily: "Newsreader",
              fontSize: 36,
              lineHeight: 42,
              color: t.colors.ink,
            }}
          />
          <Label>{status}</Label>
          <TextInput
            accessibilityLabel="Note outline"
            multiline
            textAlignVertical="top"
            value={body}
            onChangeText={(value) => {
              current.current.body = value;
              setBody(value);
              setStatus("Unsaved changes");
              void AsyncStorage.setItem(
                draftKey,
                JSON.stringify(current.current),
              ).catch(() =>
                setError(
                  "Couldn’t keep a local draft. Keep this screen open until saved.",
                ),
              );
            }}
            style={{
              minHeight: 360,
              fontSize: 18,
              lineHeight: 29,
              color: t.colors.ink,
              paddingVertical: 20,
            }}
          />
          <Pill full icon="mic" onPress={() => void leave(true)}>
            Speak with this note
          </Pill>
          <Pill full tone="soft" onPress={() => void leave()}>
            Done
          </Pill>
          <Pill
            tone="ghost"
            onPress={() =>
              Alert.alert(
                "Delete this note?",
                "Your speaking sessions will stay in your profile.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      void queue.current
                        .catch(() => {})
                        .then(() => deleteNote(id))
                        .then(() => {
                          loaded.current = false;
                          void AsyncStorage.removeItem(draftKey);
                          nav.invalidateSpeakingData();
                          nav.pop();
                        })
                        .catch((e) => setError(message(e)));
                    },
                  },
                ],
              )
            }
          >
            Delete note
          </Pill>
        </>
      ) : !error ? (
        <ActivityIndicator />
      ) : null}
    </Screen>
  );
}

const loadProfile = async () => {
  const [sessions, phrases] = await Promise.all([
    loadMirrorSessions(),
    loadPhraseBank(),
  ]);
  return { sessions, phrases };
};
export function MvpProfile({ nav }: { nav: Nav }) {
  const { session } = useAuth();
  const displayName = session?.user.user_metadata?.display_name;
  const name =
    typeof displayName === "string" && displayName.trim()
      ? displayName.trim()
      : "Your practice";
  const t = useTheme(),
    state = useRefresh(loadProfile, nav.speakingDataRevision),
    sessions = state.data?.sessions ?? [];
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + i);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      date,
      seconds: sessions
        .filter(
          (s) =>
            new Date(s.created_at) >= date && new Date(s.created_at) < next,
        )
        .reduce((n, s) => n + s.seconds, 0),
    };
  });
  const max = Math.max(1, ...days.map((d) => d.seconds));
  return (
    <Screen>
      <BackBar title="Profile" onBack={nav.pop} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 15,
          paddingVertical: 12,
        }}
      >
        <Avatar s={58} />
        <View style={{ flex: 1 }}>
          <Serif style={{ fontSize: 32 }}>{name}</Serif>
          <Copy>Every minute is yours.</Copy>
        </View>
      </View>
      <ErrorCard error={state.error} retry={() => void state.refresh()} />
      <Pill tone="card" icon="gear" full onPress={() => nav.push("settings")}>
        Settings & account
      </Pill>
      {state.loading ? <ActivityIndicator /> : null}
      {state.data ? (
        <>
          <Card style={{ gap: 18 }}>
            <Label>SPEAKING TIME · LAST 7 DAYS</Label>
            <Serif style={{ fontSize: 39 }}>
              {durationLabel(days.reduce((n, d) => n + d.seconds, 0))}
            </Serif>
            <View
              style={{
                height: 100,
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              {days.map((d, i) => (
                <View
                  key={d.date.toISOString()}
                  style={{ flex: 1, alignItems: "center", gap: 9 }}
                >
                  <View
                    accessibilityLabel={`${d.date.toLocaleDateString()}: ${durationLabel(d.seconds)}`}
                    style={{
                      height: Math.max(3, (d.seconds / max) * 75),
                      width: "100%",
                      borderRadius: 5,
                      backgroundColor: i === 6 ? t.colors.acc : t.colors.accS,
                    }}
                  />
                  <Label>
                    {d.date.toLocaleDateString(undefined, {
                      weekday: "narrow",
                    })}
                  </Label>
                </View>
              ))}
            </View>
            <Copy>
              {durationLabel(sessions.reduce((n, s) => n + s.seconds, 0))}{" "}
              spoken in total · {sessions.length} sessions
            </Copy>
          </Card>
          <Card>
            <Label>YOUR PHRASES</Label>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 16,
              }}
            >
              {["Collected", "Learning", "Ready"].map((stage) => (
                <View key={stage} style={{ gap: 6 }}>
                  <Serif style={{ fontSize: 29 }}>
                    {
                      state.data!.phrases.filter(
                        (p) => phraseStage(p) === stage,
                      ).length
                    }
                  </Serif>
                  <Copy>{stage}</Copy>
                </View>
              ))}
            </View>
          </Card>
          <Label>RECENT SESSIONS</Label>
          {!sessions.length ? (
            <Card>
              <Copy>Your first conversation with yourself starts here.</Copy>
              <Pill
                icon="mic"
                onPress={() => nav.startTalk({ from: "phrases" })}
              >
                Open mirror
              </Pill>
            </Card>
          ) : (
            sessions.slice(0, 20).map((s) => (
              <Card
                key={s.id}
                onPress={() => nav.push("mirrorRecord", { session: s })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: t.colors.ink, fontWeight: "600" }}>
                    {durationLabel(s.seconds)} of speaking
                  </Text>
                  <Label>{new Date(s.created_at).toLocaleDateString()}</Label>
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    lineHeight: 21,
                    color: t.colors.ink2,
                  }}
                >
                  {s.transcript || "No transcript captured."}
                </Text>
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
export function MirrorRecord({
  nav,
  session,
}: {
  nav: Nav;
  session: MirrorSession;
}) {
  return (
    <Screen>
      <BackBar title="My records" onBack={nav.pop} />
      <Label>{new Date(session.created_at).toLocaleString()}</Label>
      <Serif style={{ fontSize: 40 }}>
        {durationLabel(session.seconds)} of speaking.
      </Serif>
      <Card>
        <Label>TRANSCRIPT</Label>
        <Copy>
          {session.transcript || "No transcript was captured for this session."}
        </Copy>
      </Card>
      {session.note_id ? (
        <Pill onPress={() => nav.push("mvpNote", { id: session.note_id })}>
          Open note
        </Pill>
      ) : null}
    </Screen>
  );
}
