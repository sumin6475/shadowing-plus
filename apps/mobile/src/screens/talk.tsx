// MVP mirror: preserve the camera and controls; save transcript + time, without coaching.
// Hint cards (./talk-hints) check a phrase off when the live transcript says it.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Linking,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";
import { Text } from "@/design/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import { MirrorPreview } from "@/components/mirror-preview";
import { useSpeechSession } from "@/hooks/use-speech-session";
import { useTheme } from "@/design/theme";
import { BackBar, Card, Icon, Pill, Screen, Serif, Wave } from "@/design/ui";
import {
  prepareSpeakerPlayback,
  registerPlaybackStopper,
} from "@/lib/audio-session";
import { phrasesPerDay } from "@/lib/daily-phrases";
import { saveTalkSessionAudio, talkAudioUri } from "@/lib/talk-audio";
import {
  loadHintPhrases,
  outlinePoints,
  saveMirrorSession,
  tickCountsAsSpeaking,
  type HintPhrase,
} from "@/lib/mvp";
import { phraseIndex, spokenWords } from "@/lib/phrase-use";
import type { Nav, TalkCtx } from "./nav";
import { PhraseChipsCard, SessionStatsCard, TranscriptCard } from "./session-stats";
import { FROST, HintDeck, USED, UsedToast } from "./talk-hints";
const CAMERA_ACC = "#6E8DD5";
const CAMERA_ON_ACC = "#0D1A3B";
const fmt2 = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
export function TalkScreen({ nav, talkCtx }: { nav: Nav; talkCtx?: TalkCtx }) {
  const t = useTheme(),
    insets = useSafeAreaInsets(),
    { height: windowHeight } = useWindowDimensions(),
    p0 = talkCtx ?? {},
    speech = useSpeechSession();
  // A note's outline is the deck's first card; with one, the deck starts open.
  const note = useMemo(() => {
    const points = outlinePoints(p0.beats ?? []);
    return points.length ? { title: p0.ctx || "Your note", points } : null;
  }, [p0.beats, p0.ctx]);
  const [phase, setPhase] = useState<"live" | "done">("live"),
    [sec, setSec] = useState(0),
    [ctx, setCtx] = useState(p0.ctx || "Free talk"),
    [dd, setDd] = useState(false),
    [hintOpen, setHintOpen] = useState(note !== null),
    // Whether the cards were on screen at all — the result only reports on
    // phrases the learner could see (or used anyway).
    [hintSeen, setHintSeen] = useState(note !== null);
  const [cards, setCards] = useState<HintPhrase[]>([]),
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
  // Cards load once; they open the deck unless the learner already chose.
  const hintTouched = useRef(false);
  useEffect(() => {
    let active = true;
    void loadHintPhrases(phrasesPerDay(), p0.phraseId)
      .then((next) => {
        if (!active) return;
        setCards(next);
        if (next.length && !hintTouched.current) {
          setHintOpen(true);
          setHintSeen(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [p0.phraseId]);
  // Which cards were said, and where: derived from the transcript, never
  // stored, so the result screen reports exactly what the saved words show.
  const spoken = phase === "live" ? speech.transcript : transcript;
  const usage = useMemo(() => {
    if (!cards.length || !spoken) return cards.map(() => -1);
    const words = spokenWords(spoken);
    return cards.map((card) => phraseIndex(words, card.text));
  }, [cards, spoken]);
  const usedIds = useMemo(
    () => new Set(cards.filter((_, i) => usage[i] >= 0).map((card) => card.id)),
    [cards, usage],
  );
  // The most recently used card is the one said furthest into the talk.
  const latest = cards.reduce<HintPhrase | null>(
    (best, card, i) =>
      usage[i] >= 0 && (!best || usage[i] > usage[cards.indexOf(best)]) ? card : best,
    null,
  );
  const latestId = latest?.id ?? null,
    latestText = latest?.text ?? "";
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== "live" || !latestId || announced.current === latestId) return;
    announced.current = latestId;
    // iOS mutes haptics while the mic records unless the audio session opts
    // in; the card's check and the toast carry the moment either way.
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AccessibilityInfo.announceForAccessibility(`Used ${latestText}`);
  }, [phase, latestId, latestText]);
  // Speaking time, not screen time. The timer used to tick for as long as the
  // recognizer ran, so a mirror left open in silence banked whole minutes
  // (59-minute sessions with no transcript). Now a tick only counts while new
  // words are still arriving, within SPEECH_IDLE_GRACE_MS of the last ones —
  // and nothing counts before the first words: heardAt 0 means "never heard",
  // so finishing in silence is 0 seconds, not the start-up grace.
  const heardAt = useRef(0);
  useEffect(() => {
    // Every new word (interim results included) refreshes the window.
    if (speech.transcript) heardAt.current = Date.now();
  }, [speech.transcript]);
  useEffect(() => {
    if (phase !== "live" || !speech.recognizing) return;
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
        // Words were heard, so some speaking happened even if the talk ended
        // before the first one-second tick.
        seconds: Math.max(1, sec),
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
    // Nothing heard, nothing saved: an empty session is only noise in the
    // learner's records. The recording can still be played on the result.
    if (text.trim()) void persist(text);
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
    if (saveState !== "saved" && transcript.trim()) return;
    nav.startTalk({ ...p0 });
  };
  if (phase === "done") {
    const empty = !transcript.trim();
    const showPhrases = !empty && cards.length > 0 && (usedIds.size > 0 || hintSeen);
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <Screen bottomPad={12}>
          <BackBar
            title="Mirror"
            onBack={() => {
              if (empty || saveState === "saved") exit();
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
            {empty
              ? "NOTHING SAVED"
              : saveState === "saved"
                ? "SESSION SAVED"
                : saveState === "saving"
                  ? "SAVING YOUR SESSION…"
                  : "SESSION NOT SAVED"}
          </Text>
          {empty ? (
            <>
              <Serif style={{ fontSize: 44, lineHeight: 50 }}>No words caught.</Serif>
              <Text style={{ color: t.colors.ink2, fontSize: 15, lineHeight: 23 }}>
                The mic didn’t pick up any speech, so this session wasn’t saved.
                Check that you aren’t muted, then try again.
              </Text>
            </>
          ) : (
            <>
              {saveErr ? (
                <Card>
                  <Text style={{ color: t.colors.warn }}>{saveErr}</Text>
                  <Pill onPress={() => void persist(transcript)}>Retry save</Pill>
                </Card>
              ) : null}
              <SessionStatsCard
                transcript={transcript}
                seconds={Math.max(1, sec)}
                phrases={showPhrases ? { used: usedIds.size, total: cards.length } : null}
              />
              {showPhrases ? (
                <PhraseChipsCard
                  phrases={cards.map((card) => ({
                    id: card.id,
                    text: card.text,
                    used: usedIds.has(card.id),
                  }))}
                  onOpen={(id) => nav.push("mvpPhrase", { id })}
                />
              ) : null}
              {/* Capped, not grown: a long session scrolls inside the card
                  instead of pushing the rest a screen or two down. */}
              <TranscriptCard
                transcript={transcript}
                label={`TRANSCRIPT${p0.noteId ? ` · ${(p0.ctx || "your note").toUpperCase()}` : ""}`}
                maxHeight={Math.round(windowHeight * 0.32)}
                onCopied={() => nav.notify("Transcript copied")}
              />
            </>
          )}
        </Screen>
        {/* Pinned, so the actions sit in the same place however long the
            transcript is. */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: insets.bottom + 10,
            backgroundColor: t.colors.bg,
          }}
        >
          {movedUri || speech.audioUri ? (
            <Pill
              full
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
              {playStatus.playing ? "Pause" : "Listen back"}
            </Pill>
          ) : null}
          {empty || saveState === "saved" ? (
            <Pill full icon="mic" onPress={restart}>
              {empty ? "Try again" : "Speak again"}
            </Pill>
          ) : null}
        </View>
      </View>
    );
  }
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
            <HintDeck
              cards={cards}
              usedIds={usedIds}
              latestId={latestId}
              note={note}
              bottom={insets.bottom + 132}
            />
          ) : (
            <UsedToast phrase={latest} bottom={insets.bottom + 140} />
          )}

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
                accessibilityLabel={hintOpen ? "Hide phrase cards" : "Show phrase cards"}
                onPress={() => {
                  hintTouched.current = true;
                  setHintSeen(true);
                  setHintOpen((open) => !open);
                }}
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
                {usedIds.size ? (
                  <View
                    accessibilityElementsHidden
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      minWidth: 22,
                      height: 22,
                      paddingHorizontal: 6,
                      borderRadius: 11,
                      backgroundColor: USED,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                      {usedIds.size}
                    </Text>
                  </View>
                ) : null}
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
