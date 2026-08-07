// world.tsx — Topics tab (Speaking World): map + Domain, Story, Message,
// Recommendations. Backed by the real tree (migration 020, @/lib/speaking-world).
// Recording + AI recs are later phases; "Talk" opens the (still-mock) mirror.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { deleteTalkSessionAudio, talkAudioUri } from "@/lib/talk-audio";
import { useTheme, type Theme } from "@/design/theme";
import { Avatar, BackBar, Card, Chip as InputChip, Header, Icon, Pill, Screen, Sect, Serif, SwipeRow, confirmDelete, toneColor } from "@/design/ui";
import {
  archiveStory,
  createBeat,
  createMessage,
  deleteBeat,
  deleteTalkSession,
  fetchBeats,
  fetchDomains,
  fetchMessages,
  fetchStories,
  fetchTalkSessions,
  setBeatPositions,
  updateBeat,
  type Beat,
  type Domain,
  type Story,
  type StoryMessage,
  type TalkSession,
} from "@/lib/speaking-world";
import type { Nav } from "./nav";

// Map slots (size + position) cycled across the user's domains.
const MAP_SLOTS = [
  { size: 116, x: 14, y: 36 },
  { size: 152, x: 198, y: 8 },
  { size: 108, x: 6, y: 210 },
  { size: 124, x: 214, y: 200 },
  { size: 112, x: 76, y: 348 },
  { size: 124, x: 208, y: 344 },
];
const TONES = ["sage", "sky", "blush", "butter"];

function statusChip(t: Theme, status: string): { label: string; bg: string; fg: string; dashed?: boolean } {
  switch (status) {
    case "ready":
      return { label: "Ready", bg: t.colors.sage, fg: t.colors.onB };
    case "shaping":
      return { label: "Shaping", bg: t.colors.butter, fg: t.colors.onB };
    default:
      return { label: "Draft", bg: "transparent", fg: t.colors.ink3, dashed: true };
  }
}
function Chip({ label, bg, fg, dashed, style }: { label: string; bg: string; fg: string; dashed?: boolean; style?: object }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: 999, paddingHorizontal: dashed ? 9 : 10, paddingVertical: dashed ? 3 : 4, borderWidth: dashed ? 1.5 : 0, borderColor: t.colors.ink3, borderStyle: dashed ? "dashed" : "solid" },
        style,
      ]}
    >
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}
function Tile({ tone = "sky", glyph = "text", s = 40 }: { tone?: string; glyph?: import("@/design/icon").IconName; s?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: s, height: s, borderRadius: s * 0.36, backgroundColor: toneColor(t, tone), alignItems: "center", justifyContent: "center" }}>
      <Icon name={glyph} s={s * 0.45} c={t.colors.onB} />
    </View>
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

export function SpeakingWorldScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [domains, setDomains] = useState<Domain[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDomains(await fetchDomains());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your Speaking World.");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Header
        eyebrow="Topics"
        title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Your{"\n"}Speaking World</Serif>}
        sub="It grows every time you talk."
        right={<Avatar onPress={() => nav.push("settings")} />}
      />

      {domains === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : (
        <View style={{ height: 486, marginTop: 2 }}>
          <Svg viewBox="0 0 357 486" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <Path d="M128 94 L200 84 M74 152 L74 210 M262 160 L272 200 M112 268 L128 350 M258 320 L184 372 M130 130 L226 208" fill="none" stroke={t.colors.sep} strokeWidth={2} strokeDasharray="1 8" strokeLinecap="round" />
            <Circle cx={164} cy={89} r={3} fill={t.colors.acc} opacity={0.45} />
            <Circle cx={196} cy={176} r={3} fill={t.colors.acc} opacity={0.35} />
            <Circle cx={120} cy={308} r={3} fill={t.colors.acc} opacity={0.35} />
          </Svg>
          {(domains ?? []).slice(0, 6).map((d, i) => {
            const slot = MAP_SLOTS[i % MAP_SLOTS.length];
            const tone = d.color ?? TONES[i % TONES.length];
            return (
              <Card
                key={d.id}
                onPress={() => nav.push("domain", { id: d.id, name: d.name })}
                style={{ position: "absolute", left: slot.x, top: slot.y, width: slot.size, height: slot.size, borderRadius: slot.size / 2, padding: 10, backgroundColor: toneColor(t, tone), alignItems: "center", justifyContent: "center", gap: 3 }}
              >
                <Text style={{ fontSize: slot.size > 130 ? 16 : 14.5, fontWeight: "800", color: t.colors.onB, textAlign: "center" }}>{d.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: t.colors.onB2 }}>
                  {d.storyCount} {d.storyCount === 1 ? "story" : "stories"}
                </Text>
              </Card>
            );
          })}
          <Pill icon="plus" onPress={() => nav.push("newIsland")} style={{ position: "absolute", right: 6, bottom: 26, width: 54, height: 54, paddingHorizontal: 0 }} />
        </View>
      )}

      <Card onPress={() => nav.push("recs")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" s={18} c={t.colors.accD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Recommendations</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 1 }}>Ideas to grow your speaking world</Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>

      <Card onPress={() => nav.push("sessions")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 16, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
          <Icon name="mic" s={18} c={t.colors.accD} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Your sessions</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 1 }}>Every time you talked — across all topics</Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>
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

export function SessionsScreen({ nav }: { nav: Nav }) {
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
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 30, lineHeight: 33, color: t.colors.ink }}>Your sessions</Serif>
        <Text style={{ fontSize: 14, color: t.colors.ink2, marginTop: 7 }}>
          {total > 0 ? `${total} time${total === 1 ? "" : "s"} you sat down and talked.` : "Every self-talk session lands here."}
        </Text>
      </View>

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
          <Pill icon="mic" onPress={() => nav.startTalk({ ctx: "Free talk", from: "topics" })} style={{ marginTop: 16 }}>
            Start a session
          </Pill>
        </Card>
      ) : (
        (sessions ?? []).map((s) => (
          <SwipeRow
            key={s.id}
            onDelete={() =>
              confirmDelete({
                title: "Delete this session?",
                message: "This self-talk session and its transcript will be removed.",
                deleteLabel: "Delete",
                onConfirm: () => removeSession(s.id),
              })
            }
          >
            <Card onPress={() => nav.push("session", { session: s })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ alignItems: "center", gap: 3, width: 44 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="mic" s={17} c={t.colors.accD} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: t.colors.accD }}>{fmtDur(s.durationSeconds)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>
                    {s.storyTitle ?? "Free talk"}
                  </Text>
                  <Text style={{ fontSize: 12, color: t.colors.ink3 }}>{relTime(s.createdAt)}</Text>
                </View>
                <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3, lineHeight: 18 }} numberOfLines={2}>
                  {s.transcript?.trim() || "No words were captured."}
                </Text>
              </View>
              <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
            </Card>
          </SwipeRow>
        ))
      )}
    </Screen>
  );
}

export function SessionDetail({ session, nav }: { session?: TalkSession; nav: Nav }) {
  const t = useTheme();
  // Hooks run unconditionally (before any early return). The recording, if any,
  // is a local file resolved from the session's audio_key.
  const [deleted, setDeleted] = useState(false);
  const audioUri = session && !deleted ? talkAudioUri(session.audioKey) : null;
  const player = useAudioPlayer(audioUri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // Only ensure playback is audible even with the ringer/silent switch on. We
    // deliberately do NOT set category/routing here: iOS shares one process-wide
    // AVAudioSession with the speech recognizer, and toggling allowsRecording /
    // routing from this screen degraded the next recording's input gain. Playback
    // routes wherever iOS defaults; dedicated speaker routing is deferred (see
    // docs/pre-submission-roadmap).
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  if (!session) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <ErrorCard msg="This session couldn’t be opened." onRetry={nav.pop} />
      </Screen>
    );
  }

  const togglePlay = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration) player.seekTo(0);
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
        {session.transcript?.trim() ? (
          <Text style={{ fontSize: 16, lineHeight: 25, color: t.colors.ink }}>{session.transcript}</Text>
        ) : (
          <Text style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink3, fontStyle: "italic" }}>No words were captured this time.</Text>
        )}
      </Card>
      <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: session.storyTitle ?? "Free talk", storyId: session.storyId, from: "topics" })} style={{ marginTop: 4 }}>
        Talk again
      </Pill>
    </Screen>
  );
}

export function DomainScreen({ id, name, nav }: { id: string; name?: string; nav: Nav }) {
  const t = useTheme();
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Swipe-delete archives the story (soft): it leaves the list but its messages,
  // beats, and sessions survive. Optimistic, with rollback on failure.
  const removeStory = useCallback(async (storyId: string) => {
    let prev: Story[] | null = null;
    setStories((xs) => {
      prev = xs;
      return (xs ?? []).filter((s) => s.id !== storyId);
    });
    try {
      await archiveStory(storyId);
    } catch (e) {
      setStories(prev);
      Alert.alert("Couldn’t remove", e instanceof Error ? e.message : "Try again.");
    }
  }, []);

  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 4 }}>
        <Serif style={{ fontSize: 32, lineHeight: 35, color: t.colors.ink }}>{name ?? "Domain"}</Serif>
        <Text style={{ fontSize: 14.5, color: t.colors.ink2, marginTop: 8, lineHeight: 21 }}>The stories you want to be able to tell in this part of your life.</Text>
      </View>
      <Sect title="Stories" action="+ New story" onAction={() => nav.push("newIsland", { domainId: id, domainName: name })} />
      {stories === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : !stories || stories.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 28 }}>
          <Serif style={{ fontSize: 20, color: t.colors.ink }}>No stories yet</Serif>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>Add a story you want to be able to tell here.</Text>
        </Card>
      ) : (
        stories.map((s, i) => {
          const chip = statusChip(t, s.status);
          return (
            <SwipeRow
              key={s.id}
              onDelete={() =>
                confirmDelete({
                  title: "Remove this story?",
                  message: "It leaves this list. Its messages and any sessions are kept.",
                  deleteLabel: "Remove",
                  onConfirm: () => removeStory(s.id),
                })
              }
            >
              <Card onPress={() => nav.push("story", { id: s.id, title: s.title })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Tile tone={TONES[i % TONES.length]} glyph="sparkle" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }}>{s.title}</Text>
                    <Chip {...chip} />
                  </View>
                  <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>
                    {s.messageCount} {s.messageCount === 1 ? "message" : "messages"}
                  </Text>
                </View>
                <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
              </Card>
            </SwipeRow>
          );
        })
      )}
    </Screen>
  );
}

export function StoryScreen({ id, title, nav }: { id: string; title?: string; nav: Nav }) {
  const t = useTheme();
  const [messages, setMessages] = useState<StoryMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMessages(await fetchMessages(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load messages.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 30, lineHeight: 33, color: t.colors.ink }}>{title ?? "Story"}</Serif>
        <Text style={{ fontSize: 14, color: t.colors.ink2, marginTop: 8 }}>Your story is getting clearer.</Text>
      </View>
      <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: title ?? "This story", from: "topics" })} style={{ marginTop: 6 }}>
        Talk about this story
      </Pill>
      <Text style={{ textAlign: "center", fontSize: 13, color: t.colors.ink3, marginTop: -4 }}>Start a self-talk session</Text>

      <Sect title="Messages" action="+ New message" onAction={() => nav.push("newMessage", { storyId: id, storyTitle: title })} />
      {messages === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : !messages || messages.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 26 }}>
          <Serif style={{ fontSize: 20, color: t.colors.ink }}>No messages yet</Serif>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>A message is one way to tell this story — a 30-second version, a version for a friend…</Text>
          <Pill icon="plus" onPress={() => nav.push("newMessage", { storyId: id, storyTitle: title })} style={{ marginTop: 16 }}>
            New message
          </Pill>
        </Card>
      ) : (
        messages.map((m) => (
          <Card key={m.id} onPress={() => nav.push("message", { id: m.id, label: m.label, storyId: id, storyTitle: title })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
    </Screen>
  );
}

export function MessageScreen({ id, label, storyTitle, nav }: { id?: string; label?: string; storyTitle?: string; nav: Nav }) {
  const t = useTheme();
  const [beats, setBeats] = useState<Beat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setBeats([]);
      return;
    }
    setError(null);
    try {
      setBeats(await fetchBeats(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load beats.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const editLocal = (beatId: string, text: string) =>
    setBeats((bs) => (bs ?? []).map((b) => (b.id === beatId ? { ...b, text } : b)));

  const addBeat = async () => {
    if (!id || !newText.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createBeat(id, newText, (beats ?? []).length);
      setNewText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add that beat.");
    } finally {
      setBusy(false);
    }
  };

  const removeBeat = async (beatId: string) => {
    setBeats((bs) => (bs ?? []).filter((b) => b.id !== beatId));
    try {
      await deleteBeat(beatId);
    } catch {
      await load();
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const bs = beats ?? [];
    const j = index + dir;
    if (j < 0 || j >= bs.length) return;
    const a = bs[index];
    const b = bs[j];
    const next = [...bs];
    next[index] = b;
    next[j] = a;
    setBeats(next);
    try {
      await setBeatPositions([
        { id: a.id, position: b.position },
        { id: b.id, position: a.position },
      ]);
      await load();
    } catch {
      await load();
    }
  };

  const list = beats ?? [];

  return (
    <Screen>
      <BackBar title={label ?? "Message"} onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 4 }}>
        <Serif style={{ fontSize: 22, color: t.colors.ink }}>Your message</Serif>
        <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3 }}>The key points you want to communicate — your beats. Tap to edit.</Text>
      </View>

      {beats === null && !error ? (
        <Loading />
      ) : error ? (
        <ErrorCard msg={error} onRetry={load} />
      ) : list.length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 24 }}>
          <Serif style={{ fontSize: 20, color: t.colors.ink }}>No beats yet</Serif>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>Add the key points below — one beat per idea. (AI structuring from your sessions comes next.)</Text>
        </Card>
      ) : (
        <Card style={{ paddingVertical: 2 }}>
          {list.map((b, i) => (
            <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, borderBottomWidth: i < list.length - 1 ? 1 : 0, borderBottomColor: t.colors.sep }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.colors.accD }}>{i + 1}</Text>
              </View>
              <TextInput
                value={b.text}
                onChangeText={(v) => editLocal(b.id, v)}
                onEndEditing={(e) => updateBeat(b.id, e.nativeEvent.text).catch(() => load())}
                placeholder="Beat…"
                placeholderTextColor={t.colors.ink3}
                multiline
                style={{ flex: 1, fontSize: 15, fontWeight: "600", color: t.colors.ink, paddingVertical: 8 }}
              />
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <Pressable onPress={() => move(i, -1)} disabled={i === 0} hitSlop={6} style={{ paddingHorizontal: 4, opacity: i === 0 ? 0.25 : 1 }}>
                  <Text style={{ fontSize: 15, color: t.colors.ink2 }}>↑</Text>
                </Pressable>
                <Pressable onPress={() => move(i, 1)} disabled={i === list.length - 1} hitSlop={6} style={{ paddingHorizontal: 4, opacity: i === list.length - 1 ? 0.25 : 1 }}>
                  <Text style={{ fontSize: 15, color: t.colors.ink2 }}>↓</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => removeBeat(b.id)} hitSlop={6} style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" }}>
                <Icon name="x" s={13} w={2.2} c={t.colors.ink3} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {/* Add a beat */}
      {id ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={[{ flex: 1, backgroundColor: t.colors.card, borderRadius: t.r, paddingHorizontal: 14 }, t.shadowCard]}>
            <TextInput
              value={newText}
              onChangeText={setNewText}
              placeholder="Add a beat…"
              placeholderTextColor={t.colors.ink3}
              onSubmitEditing={addBeat}
              returnKeyType="done"
              style={{ fontSize: 15, color: t.colors.ink, paddingVertical: 13 }}
            />
          </View>
          <Pill icon="plus" onPress={addBeat} style={{ opacity: newText.trim() && !busy ? 1 : 0.45, width: 52, height: 52, paddingHorizontal: 0 }} />
        </View>
      ) : null}

      <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: storyTitle ?? "This story", sub: label, from: "topics" })} style={{ marginTop: 4 }}>
        Talk with this message
      </Pill>
    </Screen>
  );
}

export function MessageCreate({ storyId, storyTitle, nav }: { storyId?: string; storyTitle?: string; nav: Nav }) {
  const t = useTheme();
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ideas = ["The 30-second version", "For a friend", "In an interview", "The short version"];

  const canSave = !!label.trim() && !!storyId && !saving;
  const save = async () => {
    if (!canSave || !storyId) return;
    setSaving(true);
    setError(null);
    try {
      await createMessage(storyId, label);
      nav.pop();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the message.");
      setSaving(false);
    }
  };

  return (
    <Screen>
      <BackBar title="New message" onBack={nav.pop} />
      <View style={{ paddingHorizontal: 2, paddingTop: 2 }}>
        <Serif style={{ fontSize: 28, lineHeight: 32, color: t.colors.ink }}>One way to tell{"\n"}this story</Serif>
        {storyTitle ? <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 8 }}>in “{storyTitle}”</Text> : null}
      </View>
      <Card lg style={{ padding: 8 }}>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. The 30-second version"
          placeholderTextColor={t.colors.ink3}
          style={{ fontSize: 17, fontWeight: "600", padding: 12, color: t.colors.ink }}
        />
      </Card>
      <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>
        {ideas.map((x) => (
          <InputChip key={x} active={label === x} onPress={() => setLabel(x)}>
            {x}
          </InputChip>
        ))}
      </View>
      {error ? <Text style={{ fontSize: 13, color: "#E5484D", paddingHorizontal: 4 }}>{error}</Text> : null}
      <Pill full icon="plus" onPress={save} style={{ opacity: canSave ? 1 : 0.45, marginTop: 4 }}>
        {saving ? <ActivityIndicator color="#fff" /> : "Create message"}
      </Pill>
    </Screen>
  );
}

export function RecsScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  return (
    <Screen>
      <BackBar onBack={nav.pop} />
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
    </Screen>
  );
}
