// MVP mirror: preserve the camera and controls; save transcript + time, without coaching.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Text } from "@/design/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { MirrorPreview } from "@/components/mirror-preview";
import { useSpeechSession } from "@/hooks/use-speech-session";
import { useTheme } from "@/design/theme";
import { BackBar, Card, Icon, Pill, Screen, Serif, Wave } from "@/design/ui";
import {
  prepareSpeakerPlayback,
  registerPlaybackStopper,
} from "@/lib/audio-session";
import { saveTalkSessionAudio, talkAudioUri } from "@/lib/talk-audio";
import {
  saveMirrorSession,
  todayReadyPhrases,
  durationLabel,
  tickCountsAsSpeaking,
  type MvpPhrase,
} from "@/lib/mvp";
import type { Nav, TalkCtx } from "./nav";
const FROST = "rgba(20,22,28,0.65)";
const CAMERA_ACC = "#6E8DD5";
const CAMERA_ON_ACC = "#0D1A3B";
const fmt2 = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
export function TalkScreen({ nav, talkCtx }: { nav: Nav; talkCtx?: TalkCtx }) {
  const t = useTheme(),
    insets = useSafeAreaInsets(),
    p0 = talkCtx ?? {},
    speech = useSpeechSession();
  const [phase, setPhase] = useState<"live" | "done">("live"),
    [sec, setSec] = useState(0),
    [ctx, setCtx] = useState(p0.ctx || "Free talk"),
    [dd, setDd] = useState(false),
    [hintOpen, setHintOpen] = useState(Boolean(p0.noteId));
  const [todayPhrases, setTodayPhrases] = useState<MvpPhrase[]>([]),
    [transcript, setTranscript] = useState(""),
    [micDenied, setMicDenied] = useState(false),
    [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
      "idle",
    ),
    [saveErr, setSaveErr] = useState<string | null>(null);
  const started = useRef(false),
    sessionId = useRef<string | null>(null),
    finishing = useRef(false),
    saving = useRef(false);
  const [savedId, setSavedId] = useState<string | null>(null),
    [movedUri, setMovedUri] = useState<string | null>(null);
  const player = useAudioPlayer(movedUri ?? speech.audioUri, {
      keepAudioSessionActive: true,
    }),
    playStatus = useAudioPlayerStatus(player);
  useEffect(
    () =>
      registerPlaybackStopper(() => {
        try {
          player.pause();
        } catch {}
      }),
    [player],
  );
  useEffect(() => {
    void todayReadyPhrases()
      .then(setTodayPhrases)
      .catch(() => setTodayPhrases([]));
  }, []);
  // Speaking time, not screen time. The timer used to tick for as long as the
  // recognizer ran, so a mirror left open in silence banked whole minutes
  // (59-minute sessions with no transcript). Now a tick only counts while new
  // words are still arriving, within SPEECH_IDLE_GRACE_MS of the last ones.
  const heardAt = useRef(0);
  useEffect(() => {
    // Every new word (interim results included) refreshes the window.
    heardAt.current = Date.now();
  }, [speech.transcript]);
  useEffect(() => {
    if (phase !== "live" || !speech.recognizing) return;
    heardAt.current = Date.now();
    const timer = setInterval(() => {
      if (tickCountsAsSpeaking(Date.now(), heardAt.current))
        setSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, speech.recognizing]);
  useEffect(() => {
    if (phase !== "live" || started.current) return;
    started.current = true;
    void speech.start({ onDevice: true }).then((ok) => setMicDenied(!ok));
  }, [phase, speech]);
  useEffect(() => {
    if (!savedId || !speech.audioUri) return;
    let active = true;
    void saveTalkSessionAudio(savedId, speech.audioUri)
      .then((key) => {
        if (active) setMovedUri(talkAudioUri(key));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [savedId, speech.audioUri]);
  const persist = async (text: string) => {
    if (saving.current) return;
    saving.current = true;
    setSaveState("saving");
    setSaveErr(null);
    try {
      if (!sessionId.current) sessionId.current = globalThis.expo.uuidv4();
      const id = await saveMirrorSession({
        id: sessionId.current,
        noteId: p0.noteId,
        transcript: text,
        seconds: sec,
      });
      setSavedId(id);
      setSaveState("saved");
      nav.invalidateSpeakingData();
    } catch (e) {
      setSaveState("error");
      setSaveErr(
        e instanceof Error
          ? e.message
          : "Couldn’t save. Your transcript is still here.",
      );
    } finally {
      saving.current = false;
    }
  };
  const retryMic = () =>
    void speech.start({ onDevice: true }).then((ok) => setMicDenied(!ok));
  const micBlockedAlert = () =>
    Alert.alert(
      "Microphone is unavailable",
      "Allow microphone and speech access in Settings, then try again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Try again", onPress: retryMic },
        { text: "Settings", onPress: () => void Linking.openSettings() },
      ],
    );
  const finish = () => {
    if (finishing.current) return;
    if (micDenied || (!speech.recognizing && sec === 0)) {
      micBlockedAlert();
      return;
    }
    finishing.current = true;
    const text = speech.stop();
    setTranscript(text);
    setPhase("done");
    void persist(text);
  };
  const exit = useCallback(() => {
    if (p0.returnTo) nav.restore(p0.returnTo);
    else nav.go(p0.from ?? "phrases");
  }, [nav, p0.returnTo, p0.from]);
  const leave = () =>
    Alert.alert(
      "Finish your mirror session?",
      "Save your words and speaking time before leaving.",
      [
        { text: "Keep speaking", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            speech.stop();
            exit();
          },
        },
        { text: "Finish & save", onPress: finish },
      ],
    );
  const restart = () => {
    if (saveState !== "saved") return;
    nav.startTalk({ ...p0 });
  };
  if (phase === "done")
    return (
      <Screen>
        <BackBar
          title="Mirror"
          onBack={() => {
            if (saveState === "saved") exit();
            else
              Alert.alert(
                "Keep this session open",
                "Retry saving before leaving so you don’t lose your transcript.",
              );
          }}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1,
            color: t.colors.ink3,
          }}
        >
          {saveState === "saved"
            ? "SESSION SAVED"
            : saveState === "saving"
              ? "SAVING YOUR SESSION…"
              : "SESSION NOT SAVED"}
        </Text>
        <Serif style={{ fontSize: 44 }}>
          {durationLabel(sec)}\nof speaking.
        </Serif>
        <Text style={{ color: t.colors.ink2, fontSize: 15, lineHeight: 23 }}>
          A little more English, in your own voice.
        </Text>
        {saveErr ? (
          <Card>
            <Text style={{ color: t.colors.warn }}>{saveErr}</Text>
            <Pill onPress={() => void persist(transcript)}>Retry save</Pill>
          </Card>
        ) : null}
        <Card style={{ gap: 16 }}>
          <Text
            style={{
              color: t.colors.ink3,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          >
            TRANSCRIPT{p0.noteId ? ` · ${p0.ctx || "YOUR NOTE"}` : ""}
          </Text>
          <Text
            selectable
            style={{ fontSize: 17, lineHeight: 28, color: t.colors.ink }}
          >
            {transcript ||
              "The microphone didn’t capture any words. Your speaking time is still recorded."}
          </Text>
        </Card>
        {movedUri || speech.audioUri ? (
          <Pill
            tone="soft"
            icon={playStatus.playing ? "pause" : "play"}
            onPress={() => {
              if (playStatus.playing) player.pause();
              else
                void prepareSpeakerPlayback().then(() => {
                  if (playStatus.didJustFinish) void player.seekTo(0);
                  player.play();
                });
            }}
          >
            {playStatus.playing ? "Pause recording" : "Listen to yourself"}
          </Pill>
        ) : null}
        {saveState === "saved" ? (
          <>
            <Pill full icon="mic" onPress={restart}>
              Speak again
            </Pill>
            <Pill full tone="card" onPress={exit}>
              {p0.noteId ? "Back to note" : "Back to Phrases"}
            </Pill>
          </>
        ) : null}
      </Screen>
    );
  // ── mirror: live ──
  const live = phase === "live";
  const subPill = p0.sub || (ctx !== "Free talk" ? ctx : null);
  return (
    <View style={{ position: "absolute", inset: 0 }}>
      <MirrorPreview />

      {/* top bar — "Free talk" heading + topic pill, timer on the right */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 6,
          left: 14,
          right: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          zIndex: 20,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave mirror"
          onPress={leave}
          style={{
            backgroundColor: FROST,
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="back" s={17} w={2.2} c="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Pressable
            onPress={() => setDd(!dd)}
            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "700",
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {ctx}
            </Text>
            <Icon name="chev" s={12} w={2.6} c="rgba(255,255,255,0.85)" />
          </Pressable>
          {subPill ? (
            <View
              style={{
                backgroundColor: FROST,
                borderRadius: 999,
                paddingVertical: 5,
                paddingHorizontal: 12,
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 13,
                  fontWeight: "600",
                }}
                numberOfLines={1}
              >
                {subPill}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{
            fontSize: 14.5,
            fontWeight: "600",
            color: "#fff",
            width: 44,
            textAlign: "right",
          }}
        >
          {live ? fmt2(sec) : "00:00"}
        </Text>
      </View>

      {dd ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + 56,
            alignSelf: "center",
            zIndex: 30,
            backgroundColor: FROST,
            borderRadius: 20,
            padding: 8,
            minWidth: 200,
          }}
        >
          {[p0.ctx || "Free talk"].map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                setCtx(name);
                setDd(false);
              }}
              style={{
                backgroundColor:
                  ctx === name ? "rgba(255,255,255,0.14)" : "transparent",
                borderRadius: 13,
                paddingVertical: 11,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              {ctx === name ? (
                <Icon name="check" s={14} w={2.4} c="#fff" />
              ) : null}
              <Text
                style={{
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: ctx === name ? "700" : "500",
                }}
              >
                {name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {live ? (
        <>
          {/* Recording status pill */}
          <View
            style={{
              position: "absolute",
              top: insets.top + (subPill ? 84 : 56),
              left: 0,
              right: 0,
              alignItems: "center",
              zIndex: 12,
            }}
          >
            {micDenied ? (
              <Pressable
                onPress={micBlockedAlert}
                style={{
                  backgroundColor: "rgba(20,22,28,0.7)",
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 15,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#F0453A",
                  }}
                />
                <Text
                  style={{ fontSize: 14, color: "#FFC9C9", fontWeight: "600" }}
                >
                  Mic is off · nothing is being recorded · tap to fix
                </Text>
              </Pressable>
            ) : speech.error ? (
              speech.startupInterrupted ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry listening"
                  onPress={retryMic}
                  style={{
                    backgroundColor: "rgba(20,22,28,0.7)",
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 15,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Icon name="mic" s={13} w={2.4} c="#FFC9C9" />
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#FFC9C9",
                      fontWeight: "600",
                    }}
                  >
                    {speech.error} · tap to retry
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={{
                    backgroundColor: "rgba(20,22,28,0.7)",
                    borderRadius: 999,
                    paddingVertical: 8,
                    paddingHorizontal: 15,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#FFC9C9",
                      fontWeight: "600",
                    }}
                  >
                    {speech.error}
                  </Text>
                </View>
              )
            ) : (
              <View
                style={{
                  backgroundColor: "rgba(20,22,28,0.7)",
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 15,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#F0453A",
                  }}
                />
                <Text
                  style={{ fontSize: 14, color: "#fff", fontWeight: "600" }}
                >
                  {speech.recognizing
                    ? "Listening · keep talking"
                    : "Getting the mic ready…"}
                </Text>
              </View>
            )}
          </View>

          {/* Live on-device caption — words appear as you speak. */}
          {speech.transcript ? (
            <View
              style={{
                position: "absolute",
                top: insets.top + (subPill ? 132 : 104),
                left: 22,
                right: 22,
                alignItems: "center",
                zIndex: 11,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  lineHeight: 25,
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "500",
                }}
                numberOfLines={4}
                ellipsizeMode="head"
              >
                {speech.transcript}
              </Text>
            </View>
          ) : null}

          {hintOpen ? (
            <View
              style={{
                position: "absolute",
                left: 14,
                right: 14,
                bottom: insets.bottom + 132,
                maxHeight: 310,
                zIndex: 15,
                backgroundColor: FROST,
                borderRadius: 24,
                padding: 20,
              }}
            >
              <ScrollView contentContainerStyle={{ gap: 14 }}>
                <Text
                  style={{
                    color: "#BCC9DF",
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1,
                  }}
                >
                  TODAY’S PHRASES
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {todayPhrases.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.15)",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 18,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        {p.text}
                      </Text>
                    </View>
                  ))}
                </View>
                {!todayPhrases.length ? (
                  <Text style={{ color: "#fff", lineHeight: 22 }}>
                    Ready phrases will appear here. For now, speak freely.
                  </Text>
                ) : null}
                {p0.beats?.length ? (
                  <>
                    <Text
                      style={{
                        color: "#BCC9DF",
                        fontSize: 11,
                        fontWeight: "700",
                        letterSpacing: 1,
                      }}
                    >
                      {p0.ctx || "YOUR NOTE"}
                    </Text>
                    <Text
                      style={{ color: "#fff", fontSize: 16, lineHeight: 25 }}
                    >
                      {p0.beats.join("\n")}
                    </Text>
                  </>
                ) : null}
              </ScrollView>
            </View>
          ) : null}

          {/* bottom controls — Hint · record indicator · Finish */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: insets.bottom + 24,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "flex-end",
              gap: 40,
              zIndex: 15,
            }}
          >
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show phrases and note"
                onPress={() => setHintOpen((open) => !open)}
                style={{
                  backgroundColor: hintOpen
                    ? CAMERA_ACC
                    : "rgba(28,30,36,0.66)",
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Open state is the same accent-on-camera case as the record disc:
                    light-mode acc was 1.40:1 against this button's own closed fill,
                    so "open" and "closed" looked identical. Icon follows the fill. */}
                <Icon
                  name="bulb"
                  s={24}
                  w={1.9}
                  c={hintOpen ? CAMERA_ON_ACC : "#fff"}
                />
              </Pressable>
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: "600",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {hintOpen ? "Hide" : "Hint"}
              </Text>
            </View>
            <View style={{ alignItems: "center", gap: 8, paddingBottom: 22 }}>
              <View
                style={[
                  {
                    width: 84,
                    height: 84,
                    borderRadius: 42,
                    backgroundColor: CAMERA_ACC,
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  t.shadowLg,
                ]}
              >
                <Wave n={5} h={30} active color={CAMERA_ON_ACC} />
              </View>
            </View>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finish recording"
                onPress={finish}
                style={{
                  backgroundColor: "rgba(28,30,36,0.66)",
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 4,
                    backgroundColor: "#fff",
                  }}
                />
              </Pressable>
              <Text
                style={{
                  fontSize: 12.5,
                  fontWeight: "600",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Finish
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
