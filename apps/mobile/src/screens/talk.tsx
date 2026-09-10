// talk.tsx — Speak tab default: the mirror self-talk session (sp-talk.jsx).
// Phases: live → done → moment → retry. The web original uses radial
// gradients + backdrop blur; RN stands those in with layered translucent fills.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";

import { MirrorPreview } from "@/components/mirror-preview";
import { TalkFeedbackDetail } from "@/components/talk-feedback-detail";
import { hairline, useTheme } from "@/design/theme";
import type { IconName } from "@/design/icon";
import { BackBar, Card, ExpandableCopy, Hero, Icon, Pill, Screen, Serif, Wave, promptFeedbackNote } from "@/design/ui";
import { useSpeechSession } from "@/hooks/use-speech-session";
import { createTalkSession } from "@/lib/speaking-world";
import { prepareSpeakerPlayback, registerPlaybackStopper } from "@/lib/audio-session";
import { saveTalkSessionAudio, talkAudioUri } from "@/lib/talk-audio";
import { recordPhraseEvent, setPhraseStage, type PhraseItem } from "@/lib/phrases";
import { diagnoseTalk, suggestTalkPhrase } from "@/lib/talk";
import { logTalkSuggestions, rateTalkSuggestion, suggestionKey, type SuggestionSlot, type SuggestionVerdict } from "@/lib/talk-feedback";
import { promptPhraseStage, todaysPhrases } from "@/lib/daily-phrases";
import { talkFocus, TALK_FOCUS_LABEL, type TalkFocus } from "@/lib/talk-focus";
import { confirmAttemptPhraseCandidate, saveAttemptPhraseCandidates } from "@/lib/studio-information";
import type { TalkMoment, TalkPhraseSuggestion, TalkPhraseUsedMatch } from "@/types/api";
import type { Nav, TalkCtx } from "./nav";

const TALK_SAMPLES = [
  { label: "Explaining the problem", said: "I wanted to… 좀 더 쉽게 해결하고 싶어…", want: "I wanted to solve it in a simpler way.", ex: "I started this because I wanted to solve it in a simpler way." },
  { label: "Why I started", said: "이 일을 시작한 이유는…", want: "The reason I started this is…", ex: "It started because I kept seeing the same problem." },
  { label: "Saying who it helps", said: "It helps people who… 자신감이 없는?", want: "people who don’t feel confident speaking yet", ex: "It helps people who don’t feel confident speaking yet." },
];
const TALK_BEATS = ["What I’m building", "Who it helps", "How it works", "Why it matters"];

const FROST = "rgba(20,22,28,0.55)";
const ANALYSIS_ERROR_COPY = "Couldn’t analyze this time. Try again.";
const SESSION_SAVE_ERROR_COPY = "Couldn’t save this session. Check your connection and try talking again.";

function RateRow({
  value,
  onChange,
}: {
  value?: SuggestionVerdict;
  onChange: (verdict: SuggestionVerdict) => void;
}) {
  const options: { verdict: SuggestionVerdict; label: string; icon: "check" | "x" | "help" }[] = [
    { verdict: "like", label: "Like", icon: "check" },
    { verdict: "dislike", label: "Dislike", icon: "x" },
    { verdict: "unsure", label: "Not sure", icon: "help" },
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
      {options.map(({ verdict, label, icon }) => {
        const on = value === verdict;
        return (
          <Pressable
            key={verdict}
            onPress={() => onChange(verdict)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 32,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: on ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
            }}
          >
            <Icon name={icon} s={13} w={2.4} c="#fff" />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#fff" }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmt2 = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
/** "13 seconds" / "1 minute" / "2 minutes 4 seconds" — the result headline reads
 *  as a sentence, so a clock format (0:13) would break it. */
const durationPhrase = (s: number) => {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (s < 60) return plural(s, "second");
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${plural(m, "minute")} ${plural(r, "second")}` : plural(m, "minute");
};
/** Compact length for the transcript meta line ("13s" / "2:04"). */
const shortDur = (s: number) => (s < 60 ? `${s}s` : fmt(s));

/** Result-screen chip: quiet state (Focus, Saved, a verdict), never an action. */
function ResultChip({
  children,
  tone = "accent",
  icon,
}: {
  children: ReactNode;
  tone?: "accent" | "gray";
  icon?: IconName;
}) {
  const t = useTheme();
  const fg = tone === "accent" ? t.colors.accD : t.colors.ink2;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 28,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: tone === "accent" ? t.colors.accS : t.colors.soft,
      }}
    >
      {icon ? <Icon name={icon} s={11} w={2.2} c={fg} /> : null}
      <Text style={{ fontSize: 12, fontWeight: "600", color: fg }}>{children}</Text>
    </View>
  );
}

/** Serif section rule above a card. Matches the Speaking Note screen. */
function ResultSect({ title }: { title: string }) {
  const t = useTheme();
  return (
    <Serif style={{ fontSize: 20, color: t.colors.ink, paddingHorizontal: 2, marginTop: 13, marginBottom: -4 }}>{title}</Serif>
  );
}

/** One line of coaching, tinted so it reads before the cards around it. */
function Quote({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const t = useTheme();
  const body = (
    <>
      <Icon name="bulb" s={14} w={1.8} c={t.colors.accD} />
      <View style={{ flex: 1 }}>{children}</View>
      {onPress ? <Icon name="chev" s={13} w={2.2} c={t.colors.accD} /> : null}
    </>
  );
  const style = {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 9,
    padding: 14,
    borderRadius: 18,
    backgroundColor: t.colors.accS,
  };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.85 : 1 }]}>
      {body}
    </Pressable>
  );
}

export function TalkScreen({ nav, talkCtx }: { nav: Nav; talkCtx?: TalkCtx }) {
  const t = useTheme();
  const posthog = usePostHog();

  // Every write in this flow is fire-and-forget, so a failing one leaves no
  // symptom: the feedback still renders from memory and the user sees nothing.
  // That is how migration 027 stayed missing while every AI feedback insert was
  // throwing. Keep the dev warning, but report it too.
  const reportTalkFailure = useCallback(
    (operation: string, error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (__DEV__) console.warn(`Talk ${operation} failed`, error);
      posthog?.capture("talk_persist_failed", { operation, message: message.slice(0, 300) });
    },
    [posthog],
  );
  const insets = useSafeAreaInsets();
  const p0 = talkCtx ?? {};

  const [phase, setPhase] = useState<"live" | "done" | "moment" | "retry" | "bankRetry">("live");
  const [sec, setSec] = useState(0);
  const [tab, setTab] = useState<"phrase" | "beats">("phrase");
  const [beatIdx, setBeatIdx] = useState(0); // current story beat in the checklist
  const [ctx, setCtx] = useState(p0.ctx || "Free talk");
  const [dd, setDd] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [todayPhrases, setTodayPhrases] = useState<PhraseItem[]>([]);
  const [dur, setDur] = useState(0);
  const [sel, setSel] = useState(0);
  const [retryResult, setRetryResult] = useState<"used" | "not_yet" | null>(null);
  const beats = p0.beats || TALK_BEATS;
  const prompt = p0.prompt || "What I’m trying to do is…";

  // On-device speech recognition for the live session (ADR 0003).
  const speech = useSpeechSession();
  const startedRef = useRef(false);
  // True when mic/speech permission was denied — recognition never started, so
  // nothing was heard and finish() must not save a "completed" session.
  const [micDenied, setMicDenied] = useState(false);
  // Recording persistence: the session id (from createTalkSession) and the audio
  // uri (from the audioend event) arrive independently after finish; move+link
  // the file once both are ready, exactly once.
  const savedIdRef = useRef<string | null>(null);
  // Holds the single createTalkSession promise so diagnosis / phrase-suggest
  // can await the exact session id before persisting feedback (no race).
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const audioUriRef = useRef<string | null>(null);
  const audioSavedRef = useRef(false);
  // Playable uri for the result screen: the durable copy once the move lands,
  // otherwise the recognizer's cache file (derived, so no setState in an effect).
  const [movedUri, setMovedUri] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  // AI diagnosis of the finished session (ADR 0003 next step). moments come from
  // the web /api/talk/diagnose route, NOT from the mock TALK_SAMPLES anymore.
  const [moments, setMoments] = useState<TalkMoment[]>([]);
  const [diagState, setDiagState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [diagErr, setDiagErr] = useState<string | null>(null);
  const [sessionFocus, setSessionFocus] = useState<TalkFocus>(() => talkFocus());
  // Bank retrieval is intentionally independent from Focus coaching. Either
  // request may fail or return empty without suppressing the other's result.
  const [bankSuggestion, setBankSuggestion] = useState<TalkPhraseSuggestion | null>(null);
  const [bankUsed, setBankUsed] = useState<TalkPhraseUsedMatch[]>([]);
  const [bankUsedVerdicts, setBankUsedVerdicts] = useState<Record<string, "used" | "not_used">>({});
  const [bankState, setBankState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [bankDismissed, setBankDismissed] = useState(false);
  const [bankRetryResult, setBankRetryResult] = useState<"used" | "not_yet" | null>(null);
  const bankAcceptedRef = useRef(false);
  const bankRejectedRef = useRef(false);
  const bankUsedRef = useRef(false);
  const [suggestionIds, setSuggestionIds] = useState<Record<string, string>>({});
  const [suggestionVerdict, setSuggestionVerdict] = useState<Record<string, SuggestionVerdict>>({});

  useEffect(() => {
    let active = true;
    todaysPhrases()
      .then((items) => {
        if (active) setTodayPhrases(items);
      })
      .catch(() => {
        if (active) setTodayPhrases([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Live timer
  useEffect(() => {
    if (phase !== "live") return;
    const iv = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // Begin on-device recognition once, when the live phase opens. Permission is
  // requested here (first run shows the iOS mic + speech dialogs). The hook owns
  // its own unmount cleanup, so no stop() effect lives here (one keyed on the
  // hook object would fire every render and interrupt the audio session).
  useEffect(() => {
    if (phase !== "live" || startedRef.current) return;
    startedRef.current = true;
    speech.start({ onDevice: true }).then((ok) => {
      if (!ok) setMicDenied(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Move the recorded WAV into place + link it to the session, once both the
  // session row (createTalkSession) and the file (audioend) are ready.
  const persistAudioIfReady = () => {
    const id = savedIdRef.current;
    const uri = audioUriRef.current;
    if (!id || !uri || audioSavedRef.current) return;
    audioSavedRef.current = true;
    saveTalkSessionAudio(id, uri)
      .then((key) => {
        // The cache file was MOVED, so the recognizer's uri is now dangling:
        // repoint playback at the durable copy or Play breaks mid-screen.
        const moved = talkAudioUri(key);
        if (moved) setMovedUri(moved);
      })
      .catch(() => {
        audioSavedRef.current = false; // leave it for a later attempt
      });
  };
  useEffect(() => {
    audioUriRef.current = speech.audioUri;
    if (speech.audioUri) persistAudioIfReady();
  }, [speech.audioUri]);
  const playUri = movedUri ?? speech.audioUri;

  // Play back what was just said, from the result screen. The recognizer has
  // already stopped by then, so this never fights the shared audio session —
  // but it still registers a stopper so a new attempt pauses it.
  const player = useAudioPlayer(playUri, { keepAudioSessionActive: true });
  const playStatus = useAudioPlayerStatus(player);
  const playing = playStatus.playing;
  useEffect(
    () =>
      registerPlaybackStopper(() => {
        try {
          player.pause();
        } catch {
          // Native player already released — nothing to pause.
        }
      }),
    [player],
  );
  const togglePlayback = async () => {
    if (playing) {
      player.pause();
      return;
    }
    if (playStatus.duration > 0 && playStatus.currentTime >= playStatus.duration) player.seekTo(0);
    await prepareSpeakerPlayback();
    player.play();
  };

  // Ask the Edge Function to surface improvable moments from the real transcript. Runs
  // in parallel with the save; an empty/short transcript short-circuits to none.
  // Return the exact saved session id, waiting for the in-flight create if the
  // diagnosis / phrase-suggest resolved first. Never blocks the UI.
  const resolveSessionId = useCallback(async (): Promise<string | null> => {
    if (savedIdRef.current) return savedIdRef.current;
    try {
      return (await sessionPromiseRef.current) ?? null;
    } catch {
      return null;
    }
  }, []);

  const runDiagnosis = (text: string) => {
    if (!text.trim()) {
      setMoments([]);
      setDiagState("done");
      return;
    }
    const topic = ctx === "Free talk" ? p0.sub ?? null : [ctx, p0.sub].filter(Boolean).join(" · ") || null;
    const focus = talkFocus();
    setSessionFocus(focus);
    setDiagState("loading");
    setDiagErr(null);
    diagnoseTalk({ transcript: text, topic, storyId: p0.storyId ?? null, focus })
      .then(async (ms) => {
        setMoments(ms);
        setDiagState("done");
        // Persist feedback only after the exact talk_session.id exists.
        const talkSessionId = await resolveSessionId();
        logTalkSuggestions({
          moments: ms,
          focus,
          talkSessionId,
          storyId: p0.storyId ?? null,
        })
          .then(setSuggestionIds)
          .catch((e) => {
            reportTalkFailure("log_suggestions", e);
          });
      })
      .catch((e) => {
        reportTalkFailure("diagnose", e);
        setDiagState("error");
        setDiagErr(ANALYSIS_ERROR_COPY);
      });
  };

  const runBankSuggestion = (text: string) => {
    if (!text.trim()) {
      setBankSuggestion(null);
      setBankUsed([]);
      setBankState("done");
      return;
    }
    const topic = ctx === "Free talk" ? p0.sub ?? null : [ctx, p0.sub].filter(Boolean).join(" · ") || null;
    setBankSuggestion(null);
    setBankUsed([]);
    setBankDismissed(false);
    bankAcceptedRef.current = false;
    bankRejectedRef.current = false;
    bankUsedRef.current = false;
    setBankState("loading");
    // Wait for the exact talk_session.id so phrase-suggest persists its
    // phrase_events with the right session linkage.
    resolveSessionId()
      .then(async (talkSessionId) => {
        const result = await suggestTalkPhrase({ transcript: text, topic, storyId: p0.storyId ?? null, talkSessionId });
        if (talkSessionId) {
          await saveAttemptPhraseCandidates({ talkSessionId, matches: result.used });
        }
        return result;
      })
      .then((result) => {
        setBankSuggestion(result.suggestion);
        setBankUsed(result.used);
        setBankUsedVerdicts({});
        setBankState("done");
      })
      .catch((e) => {
        reportTalkFailure("phrase_suggestion", e);
        setBankSuggestion(null);
        setBankUsed([]);
        setBankState("error");
      });
  };

  // Recovery when mic/speech access was denied: iOS won't re-prompt, so offer
  // Settings plus a retry once the learner has allowed access there.
  const retryMic = () => {
    void speech.start({ onDevice: true }).then((ok) => setMicDenied(!ok));
  };
  const micBlockedAlert = () =>
    Alert.alert(
      "Microphone is off",
      "Saylo can’t hear you until you allow microphone and speech access in iOS Settings. Nothing from this session is recorded.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Try again", onPress: retryMic },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );

  const finish = () => {
    if (micDenied) {
      micBlockedAlert(); // nothing was recorded — don't save a fake session
      return;
    }
    const text = speech.stop();
    setTranscript(text);
    setDur(sec);
    setPhase("done");
    setSaveState("saving");
    setSaveErr(null);
    // One session promise: diagnosis and phrase-suggest run in parallel, but
    // both await this exact id before persisting feedback/linkage.
    const sessionPromise = createTalkSession({
      storyId: p0.storyId ?? null,
      messageId: p0.messageId ?? null,
      transcript: text,
      durationSeconds: sec,
    });
    sessionPromiseRef.current = sessionPromise;
    sessionPromise
      .then((id) => {
        setSaveState("saved");
        posthog?.capture("talk_session_completed", {
          duration_seconds: sec,
          has_transcript: Boolean(text.trim()),
          linked_to_story: Boolean(p0.storyId),
        });
        savedIdRef.current = id;
        persistAudioIfReady(); // in case audioend already fired
        nav.invalidateSpeakingData(); // Studio refresh after a successful save
      })
      .catch((e) => {
        reportTalkFailure("save_session", e);
        setSaveState("error");
        setSaveErr(SESSION_SAVE_ERROR_COPY);
      });
    runDiagnosis(text);
    runBankSuggestion(text);
  };
  const restart = () => {
    speech.stop();
    startedRef.current = false;
    savedIdRef.current = null;
    sessionPromiseRef.current = null;
    audioUriRef.current = null;
    audioSavedRef.current = false;
    setMovedUri(null);
    setTranscript("");
    setSaveState("idle");
    setSaveErr(null);
    setMoments([]);
    setDiagState("idle");
    setDiagErr(null);
    setBankSuggestion(null);
    setBankUsed([]);
    setBankUsedVerdicts({});
    setBankState("idle");
    setBankDismissed(false);
    setBankRetryResult(null);
    bankAcceptedRef.current = false;
    bankRejectedRef.current = false;
    bankUsedRef.current = false;
    setSuggestionIds({});
    setSuggestionVerdict({});
    setRetryResult(null);
    setPhase("live");
    setSec(0);
    setHintOpen(false);
    setTab("phrase");
    setBeatIdx(0);
    setDd(false);
  };
  // Ending an attempt returns to whatever started it — the Speaking Note, in
  // the practice loop — instead of clearing the detail stack onto a tab root.
  const exitTalk = useCallback(() => {
    if (p0.returnTo) nav.restore(p0.returnTo);
    else nav.go(p0.from ?? "today");
  }, [nav, p0.returnTo, p0.from]);
  const leave = () => {
    speech.stop();
    exitTalk();
  };
  const mSel = moments[sel];

  const savePhrase = (i: number) => {
    const m = moments[i];
    if (!m?.want.trim()) return;
    nav.push("capture", {
      clipSeed: {
        contextText: m.want.trim(),
        sourceLabel: m.label || ctx,
        source: "speak",
        storyId: p0.storyId ?? null,
        said: m.said,
      },
    });
  };

  const tryMoment = () => {
    setRetryResult(null);
    setPhase("retry");
  };

  const persistSuggestionRating = (slot: SuggestionSlot, verdict: SuggestionVerdict, note?: string | null) => {
    const key = suggestionKey(sel, slot);
    setSuggestionVerdict((current) => ({ ...current, [key]: verdict }));
    const id = suggestionIds[key];
    if (!id) return;
    void rateTalkSuggestion(id, verdict, note).catch((e) => {
      reportTalkFailure("rate_suggestion", e);
    });
  };

  const rateSuggestion = (slot: SuggestionSlot, verdict: SuggestionVerdict) => {
    if (verdict === "like") {
      persistSuggestionRating(slot, verdict, null);
      return;
    }
    promptFeedbackNote({
      title: verdict === "dislike" ? "What didn’t work?" : "What felt off?",
      message: "One sentence is enough. This stays with the rating so later coaching can learn from it.",
      onSave: (note) => persistSuggestionRating(slot, verdict, note),
    });
  };

  const finishRetry = (used: boolean) => {
    setRetryResult(used ? "used" : "not_yet");
  };

  const tryBankPhrase = () => {
    if (!bankSuggestion || bankAcceptedRef.current || bankRejectedRef.current) return;
    bankAcceptedRef.current = true;
    setBankRetryResult(null);
    setBankDismissed(true);
    void recordPhraseEvent({
      phraseItemId: bankSuggestion.phraseItemId,
      event: "accepted",
      storyId: p0.storyId ?? null,
      talkSessionId: savedIdRef.current,
      evidence: { transcript_quote: bankSuggestion.said, source: "talk_phrase_suggest" },
    }).catch(() => undefined);
    setPhase("bankRetry");
  };

  const rejectBankPhrase = () => {
    if (!bankSuggestion || bankAcceptedRef.current || bankRejectedRef.current) return;
    promptFeedbackNote({
      title: "Why doesn’t this phrase fit?",
      message: "One sentence is enough. This helps later ranking skip the wrong matches.",
      onSave: (note) => {
        bankRejectedRef.current = true;
        setBankDismissed(true);
        void recordPhraseEvent({
          phraseItemId: bankSuggestion.phraseItemId,
          event: "rejected",
          storyId: p0.storyId ?? null,
          talkSessionId: savedIdRef.current,
          evidence: {
            transcript_quote: bankSuggestion.said,
            source: "talk_phrase_suggest",
            reason: note || null,
          },
        }).catch(() => undefined);
      },
    });
  };

  const finishBankRetry = (used: boolean) => {
    setBankRetryResult(used ? "used" : "not_yet");
    if (!used || !bankSuggestion || bankUsedRef.current) return;
    bankUsedRef.current = true;
    void recordPhraseEvent({
      phraseItemId: bankSuggestion.phraseItemId,
      event: "used",
      storyId: p0.storyId ?? null,
      talkSessionId: savedIdRef.current,
      evidence: { self_reported: true, prompted: true, source: "talk_phrase_suggest" },
    }).catch(() => undefined);
    promptPhraseStage({
      text: bankSuggestion.text,
      onChoose: (stage) => {
        void setPhraseStage(bankSuggestion.phraseItemId, stage).catch(() => undefined);
      },
    });
  };

  const confirmUsedCandidate = (match: TalkPhraseUsedMatch, used: boolean) => {
    const talkSessionId = savedIdRef.current;
    if (!talkSessionId) return;
    const previous = bankUsedVerdicts[match.phraseItemId];
    setBankUsedVerdicts((current) => ({ ...current, [match.phraseItemId]: used ? "used" : "not_used" }));
    void confirmAttemptPhraseCandidate({
      talkSessionId,
      phraseItemId: match.phraseItemId,
      used,
      situationId: p0.storyId ?? null,
      said: match.said,
    }).catch((e) => {
      setBankUsedVerdicts((current) => {
        const next = { ...current };
        if (previous) next[match.phraseItemId] = previous;
        else delete next[match.phraseItemId];
        return next;
      });
      reportTalkFailure("confirm_phrase_use", e);
      Alert.alert("Couldn’t save your answer", "Check your connection and try again.");
    });
  };

  // ── done — the session result (design: "Session Result") ──
  // Editorial header (eyebrow · serif headline · one plain sentence), then the
  // transcript, then coaching. Every block below the header is the same card
  // language as the rest of the app; nothing here is decorative.
  if (phase === "done") {
    const said = transcript.trim();
    const words = said ? said.split(/\s+/).length : 0;
    const lead = moments[0] ?? null;
    const rest = moments.slice(1);
    const noWords = !said;
    const resultSub =
      diagState === "loading"
        ? `Looking at ${TALK_FOCUS_LABEL[sessionFocus].toLowerCase()}…`
        : noWords
          ? "The attempt is saved — but the mic didn’t catch your words this time."
          : diagState === "done" && moments.length
            ? "Here’s where you could say it more naturally."
            : bankState === "loading"
              ? "Checking your Phrase Bank…"
              : bankState === "done" && bankSuggestion
                ? "You already saved something useful for this moment."
                : bankState === "error"
                  ? "Focus coaching is ready. Your Phrase Bank check needs another try."
                  : diagState === "done"
                    ? "You kept going the whole time."
                    : "";
    return (
      <Screen bottomPad={40}>
        {/* Close — the result is a landing, not a trap. Same exit as Done. */}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: -6 }}>
          <Pressable
            onPress={exitTalk}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.colors.soft, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="x" s={13} w={2} c={t.colors.ink2} />
          </Pressable>
        </View>

        <View style={{ alignItems: "center", paddingHorizontal: 8 }}>
          <Text
            style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.72, textTransform: "uppercase", color: t.colors.accD }}
            numberOfLines={1}
          >
            Attempt · {ctx}
          </Text>
          <Serif style={{ fontSize: 34, lineHeight: 38, color: t.colors.ink, textAlign: "center", marginTop: 10 }}>
            {`You spoke for\n${durationPhrase(dur)}.`}
          </Serif>
          {resultSub ? (
            <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink2, marginTop: 8, textAlign: "center" }}>{resultSub}</Text>
          ) : null}

          {/* Save + focus state live as quiet chips, never as a banner. */}
          {saveState === "saving" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
              <ActivityIndicator size="small" color={t.colors.ink3} />
              <Text style={{ fontSize: 12, color: t.colors.ink3 }}>Saving your recording…</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 }}>
              {!noWords && (diagState === "loading" || diagState === "done" || diagState === "error") ? (
                <ResultChip>Focus · {TALK_FOCUS_LABEL[sessionFocus]}</ResultChip>
              ) : null}
              {saveState === "saved" ? (
                <ResultChip tone="gray" icon="check">
                  Saved
                </ResultChip>
              ) : null}
            </View>
          )}
          {saveState === "error" ? (
            <Text style={{ fontSize: 13, lineHeight: 19, color: "#E5484D", fontWeight: "600", marginTop: 10, textAlign: "center" }}>
              {saveErr ?? "Couldn’t save this session."}
            </Text>
          ) : null}
        </View>

        <ResultSect title="What you said" />
        <Card>
          {noWords ? (
            <>
              <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink }}>No words were captured.</Text>
              <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, marginTop: 4 }}>
                Hold the phone a little closer, or check that nothing is covering the mic. Your speaking time still counts.
              </Text>
            </>
          ) : (
            <>
              <ExpandableCopy text={said} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <Text style={{ fontSize: 12, color: t.colors.ink3 }}>
                  {words} {words === 1 ? "word" : "words"} · {shortDur(dur)}
                </Text>
                {playUri ? (
                  <Pressable
                    onPress={togglePlayback}
                    accessibilityRole="button"
                    accessibilityLabel={playing ? "Pause recording" : "Play recording"}
                    hitSlop={8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      height: 28,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: t.colors.soft,
                    }}
                  >
                    <Icon name={playing ? "pause" : "play"} s={12} w={2} c={t.colors.ink} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: t.colors.ink }}>{playing ? "Pause" : "Play"}</Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          )}
        </Card>

        {/* AI diagnosis: the highest-impact moment is promoted to a single line
            of coaching; anything else stays a quiet row. */}
        {diagState === "loading" ? (
          <Card lg style={{ alignItems: "center", paddingVertical: 26, gap: 10 }}>
            <ActivityIndicator color={t.colors.accD} />
            <Text style={{ fontSize: 13, color: t.colors.ink3 }}>Finding moments to level up…</Text>
          </Card>
        ) : null}

        {diagState === "error" ? (
          <Card lg style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, color: "#E5484D", fontWeight: "600" }}>{diagErr ?? "Couldn’t analyze this session."}</Text>
            <Pill tone="tint" small onPress={() => runDiagnosis(transcript)}>
              Try again
            </Pill>
          </Card>
        ) : null}

        {lead ? (
          <>
            <ResultSect title="One thing to keep" />
            <Quote
              onPress={() => {
                setSel(0);
                setPhase("moment");
              }}
            >
              <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2 }}>
                When you said “{lead.said}” — <Text style={{ color: t.colors.ink, fontWeight: "600" }}>try “{lead.want}”.</Text>
              </Text>
            </Quote>
          </>
        ) : null}

        {rest.length ? (
          <Card style={{ paddingVertical: 0 }}>
            {rest.map((m, i) => (
              <Pressable
                key={i + 1}
                onPress={() => {
                  setSel(i + 1);
                  setPhase("moment");
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 13,
                  borderTopWidth: i ? hairline : 0,
                  borderTopColor: t.colors.sep,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.ink }} numberOfLines={1}>
                    {m.label}
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink2, marginTop: 2 }} numberOfLines={1}>
                    Try “{m.want}”
                  </Text>
                </View>
                <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
              </Pressable>
            ))}
          </Card>
        ) : null}

        {diagState === "done" && !moments.length && !noWords ? (
          <Card lg style={{ alignItems: "center", paddingVertical: 28 }}>
            <Wave n={20} h={26} />
            <Text style={{ fontSize: 15, fontWeight: "600", marginTop: 12, color: t.colors.ink }}>Smooth focus run.</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3, marginTop: 4, textAlign: "center" }}>
              {bankState === "error"
                ? "Nothing stood out in your Focus coaching. Retry the Phrase Bank check below."
                : "Nothing stood out to fix. Keep going."}
            </Text>
          </Card>
        ) : null}

        {bankState === "done" && bankUsed.length ? (
          <>
            <ResultSect title="Phrases you may have used" />
            <Card style={{ paddingVertical: 0 }}>
              {bankUsed.map((match, index) => {
                const verdict = bankUsedVerdicts[match.phraseItemId];
                return (
                  <View
                    key={match.phraseItemId}
                    style={{ paddingVertical: 14, borderTopWidth: index ? hairline : 0, borderTopColor: t.colors.sep }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "600", color: t.colors.ink }}>{match.text}</Text>
                      {verdict ? (
                        <ResultChip tone={verdict === "used" ? "accent" : "gray"} icon={verdict === "used" ? "check" : "x"}>
                          {verdict === "used" ? "Used it" : "Not this time"}
                        </ResultChip>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 12, lineHeight: 18, color: t.colors.ink3, marginTop: 3 }} numberOfLines={2}>
                      Heard: “{match.said}”
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      <Pill small full tone={verdict === "used" ? "acc" : "tint"} icon="check" onPress={() => confirmUsedCandidate(match, true)}>
                        Used
                      </Pill>
                      <Pill small full tone={verdict === "not_used" ? "dark" : "tint"} icon="x" onPress={() => confirmUsedCandidate(match, false)}>
                        Not this time
                      </Pill>
                    </View>
                  </View>
                );
              })}
              <Text style={{ fontSize: 12, lineHeight: 18, color: t.colors.ink3, paddingBottom: 14 }}>
                AI only found candidates. Your answer is the final evidence.
              </Text>
            </Card>
          </>
        ) : null}

        {bankState === "loading" ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20 }}>
            <ActivityIndicator color={t.colors.accD} />
            <Text style={{ fontSize: 13, color: t.colors.ink3 }}>Checking your saved phrases for a strong fit…</Text>
          </Card>
        ) : null}

        {bankState === "error" ? (
          <Card style={{ gap: 11 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <Icon name="bank" s={17} c="#E5484D" />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#E5484D" }}>Couldn’t check your Phrase Bank.</Text>
            </View>
            <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3 }}>Your Focus coaching is still available above.</Text>
            <Pill tone="tint" small onPress={() => runBankSuggestion(transcript)}>
              Try Phrase Bank again
            </Pill>
          </Card>
        ) : null}

        {bankState === "done" && bankSuggestion && !bankDismissed ? (
          <LinearGradient
            colors={["#315FC7", "#5B88E8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: t.r,
              padding: t.padc,
              overflow: "hidden",
              shadowColor: "#3D6FE0",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: 75,
                right: -48,
                top: -88,
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="bank" s={16} w={2} c="#FFFFFF" />
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "700", letterSpacing: 0.55, color: "rgba(255,255,255,0.88)" }}>
                FROM YOUR PHRASE BANK
              </Text>
              {bankSuggestion.linkedToStory ? (
                <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "rgba(255,255,255,0.16)" }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>STORY MATCH</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.5, color: "rgba(255,255,255,0.72)", marginTop: 14 }}>
              WHEN YOU SAID
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.84)", marginTop: 4 }}>“{bankSuggestion.said}”</Text>
            <View style={{ height: hairline, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 14 }} />
            <Text style={{ fontSize: 17, lineHeight: 24, fontWeight: "700", color: "#FFFFFF" }}>“{bankSuggestion.text}”</Text>
            {bankSuggestion.meaning ? (
              <Text style={{ fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.78)", marginTop: 6 }}>{bankSuggestion.meaning}</Text>
            ) : null}
            {bankSuggestion.usageNote ? (
              <Text style={{ fontSize: 12, lineHeight: 18, color: "rgba(255,255,255,0.72)", marginTop: 7 }}>
                How you saved it · {bankSuggestion.usageNote}
              </Text>
            ) : null}
            <Text style={{ fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.86)", marginTop: 11 }}>{bankSuggestion.why}</Text>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.66)", marginTop: 9 }}>{bankSuggestion.sourceLabel}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pill tone="white" full icon="mic" onPress={tryBankPhrase} textStyle={{ color: t.colors.accD }}>
                Try this phrase
              </Pill>
              <Pill tone="white" full onPress={rejectBankPhrase} textStyle={{ color: t.colors.ink2 }} style={{ opacity: 0.86 }}>
                Doesn’t fit
              </Pill>
            </View>
          </LinearGradient>
        ) : null}

        {/* Talking again is the point of the screen; when nothing was heard it
            becomes the primary action instead of Done. */}
        <View style={{ flexDirection: "row", gap: t.gap, marginTop: 8 }}>
          {diagState === "done" && moments.length ? (
            <Pill
              tone="tint"
              onPress={() => {
                setSel(0);
                setPhase("moment");
              }}
              style={{ flex: 1 }}
            >
              Review again
            </Pill>
          ) : (
            <Pill tone={noWords ? "acc" : "tint"} icon="mic" onPress={restart} style={{ flex: 1 }}>
              Talk again
            </Pill>
          )}
          <Pill tone={noWords ? "tint" : "acc"} onPress={exitTalk} style={{ flex: noWords ? 1 : 1.4 }}>
            Done
          </Pill>
        </View>
      </Screen>
    );
  }

  // ── moment ──
  if (phase === "moment" && mSel)
    return (
      <Screen bottomPad={40}>
        <BackBar title={mSel.label} onBack={() => setPhase("done")} />
        <TalkFeedbackDetail
          badge={`Focus · ${TALK_FOCUS_LABEL[sessionFocus]}`}
          said={mSel.said}
          want={mSel.want}
          diagnosisTag={mSel.diagnosisTag}
          action={mSel.action}
          explanation={mSel.explanation}
          why={mSel.why}
          footer={<RateRow value={suggestionVerdict[suggestionKey(sel, "want")]} onChange={(verdict) => rateSuggestion("want", verdict)} />}
        />
        <View style={{ paddingHorizontal: 2, paddingTop: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Try it now</Text>
          <Text style={{ fontSize: 14, color: t.colors.ink2, marginTop: 2 }}>Practice just this part.</Text>
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pill full icon="mic" onPress={tryMoment}>
            Retry this moment
          </Pill>
          <Pill tone="tint" full icon="bank" onPress={() => savePhrase(sel)}>
            Save as phrase
          </Pill>
        </View>
      </Screen>
    );

  // ── retry ──
  if (phase === "retry" && mSel)
    return (
      <Screen bottomPad={40}>
        <BackBar title="Retry this moment" onBack={() => setPhase("moment")} />
        <Card lg>
          <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.ink2 }}>Say just this part</Text>
          <Serif style={{ fontSize: 24, lineHeight: 31, marginTop: 6, color: t.colors.ink }}>{mSel.want}</Serif>
        </Card>
        <View style={{ borderRadius: t.r, height: 170, overflow: "hidden" }}>
          <MirrorPreview />
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Wave n={22} h={30} active color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>Just this sentence. 10 seconds is plenty.</Text>
          </View>
        </View>
        {retryResult ? (
          <Hero style={{ alignItems: "center" }}>
            <Serif style={{ fontSize: 21, lineHeight: 28, color: "#fff", textAlign: "center" }}>
              {retryResult === "used" ? "You brought it into this Story." : "Not yet is useful evidence too."}
            </Serif>
            <Pill tone="white" small onPress={() => setPhase("moment")} textStyle={{ color: t.colors.accD }} style={{ marginTop: 12, shadowOpacity: 0, alignSelf: "center" }}>Back to the moment</Pill>
          </Hero>
        ) : (
          <View style={{ gap: 10 }}>
            <Pill full icon="check" onPress={() => finishRetry(true)}>It came out</Pill>
            <Pill tone="tint" full onPress={() => finishRetry(false)}>Not yet</Pill>
          </View>
        )}
      </Screen>
    );

  // ── Phrase Bank retry ──
  if (phase === "bankRetry" && bankSuggestion)
    return (
      <Screen bottomPad={40}>
        <BackBar title="Try this phrase" onBack={() => setPhase("done")} />
        <Card lg>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="bank" s={16} c={t.colors.accD} />
            <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.5, color: t.colors.accD }}>FROM YOUR PHRASE BANK</Text>
          </View>
          <Serif style={{ fontSize: 24, lineHeight: 31, marginTop: 10, color: t.colors.ink }}>{bankSuggestion.text}</Serif>
          {bankSuggestion.meaning ? (
            <Text style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink2, marginTop: 7 }}>{bankSuggestion.meaning}</Text>
          ) : null}
        </Card>
        <View style={{ borderRadius: t.r, height: 170, overflow: "hidden" }}>
          <MirrorPreview />
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Wave n={22} h={30} active color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>Bring this saved phrase into your Story</Text>
          </View>
        </View>
        {bankRetryResult ? (
          <Hero style={{ alignItems: "center" }}>
            <Serif style={{ fontSize: 21, lineHeight: 28, color: "#fff", textAlign: "center" }}>
              {bankRetryResult === "used" ? "You brought it into this Story." : "Not yet is useful evidence too."}
            </Serif>
            <Pill
              tone="white"
              small
              onPress={() => setPhase("done")}
              textStyle={{ color: t.colors.accD }}
              style={{ marginTop: 12, shadowOpacity: 0, alignSelf: "center" }}
            >
              Back to feedback
            </Pill>
          </Hero>
        ) : (
          <View style={{ gap: 10 }}>
            <Pill full icon="check" onPress={() => finishBankRetry(true)}>It came out</Pill>
            <Pill tone="tint" full onPress={() => finishBankRetry(false)}>Not yet</Pill>
          </View>
        )}
      </Screen>
    );

  // ── mirror: live ──
  const live = phase === "live";
  const subPill = p0.sub || (ctx !== "Free talk" ? ctx : null);
  const topicLine = [ctx, p0.sub].filter(Boolean).join(" · ");
  return (
    <View style={{ position: "absolute", inset: 0 }}>
      <MirrorPreview />

      {/* top bar — "Free talk" heading + topic pill, timer on the right */}
      <View style={{ position: "absolute", top: insets.top + 6, left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 20 }}>
        <Pressable onPress={leave} style={{ backgroundColor: FROST, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="back" s={17} w={2.2} c="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Pressable onPress={() => setDd(!dd)} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: -0.2 }} numberOfLines={1}>
              {ctx}
            </Text>
            <Icon name="chev" s={12} w={2.6} c="rgba(255,255,255,0.85)" />
          </Pressable>
          {subPill ? (
            <View style={{ backgroundColor: FROST, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
              <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                {subPill}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#fff", width: 44, textAlign: "right" }}>{live ? fmt2(sec) : "00:00"}</Text>
      </View>

      {dd ? (
        <View style={{ position: "absolute", top: insets.top + 56, alignSelf: "center", zIndex: 30, backgroundColor: FROST, borderRadius: 20, padding: 8, minWidth: 200 }}>
          {["Free talk", "My startup", "Current project", "About me", "Daily life"].map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                setCtx(name);
                setDd(false);
              }}
              style={{ backgroundColor: ctx === name ? "rgba(255,255,255,0.14)" : "transparent", borderRadius: 13, paddingVertical: 11, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {ctx === name ? <Icon name="check" s={14} w={2.4} c="#fff" /> : null}
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: ctx === name ? "700" : "500" }}>{name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {live ? (
        <>
          {/* Recording status pill */}
          <View style={{ position: "absolute", top: insets.top + (subPill ? 84 : 56), left: 0, right: 0, alignItems: "center", zIndex: 12 }}>
            {micDenied ? (
              <Pressable
                onPress={micBlockedAlert}
                style={{ backgroundColor: "rgba(20,22,28,0.7)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F0453A" }} />
                <Text style={{ fontSize: 14, color: "#FFC9C9", fontWeight: "600" }}>Mic is off · nothing is being recorded · tap to fix</Text>
              </Pressable>
            ) : speech.error ? (
              speech.startupInterrupted ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry listening"
                  onPress={retryMic}
                  style={{ backgroundColor: "rgba(20,22,28,0.7)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon name="mic" s={13} w={2.4} c="#FFC9C9" />
                  <Text style={{ fontSize: 13, color: "#FFC9C9", fontWeight: "600" }}>{speech.error} · tap to retry</Text>
                </Pressable>
              ) : (
                <View style={{ backgroundColor: "rgba(20,22,28,0.7)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15 }}>
                  <Text style={{ fontSize: 13, color: "#FFC9C9", fontWeight: "600" }}>{speech.error}</Text>
                </View>
              )
            ) : (
              <View style={{ backgroundColor: "rgba(20,22,28,0.7)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#F0453A" }} />
                <Text style={{ fontSize: 14, color: "#fff", fontWeight: "600" }}>{speech.recognizing ? "Listening · keep talking" : "Getting the mic ready…"}</Text>
              </View>
            )}
          </View>

          {/* Live on-device caption — words appear as you speak. */}
          {speech.transcript ? (
            <View style={{ position: "absolute", top: insets.top + (subPill ? 132 : 104), left: 22, right: 22, alignItems: "center", zIndex: 11 }}>
              <Text style={{ fontSize: 17, lineHeight: 25, color: "#fff", textAlign: "center", fontWeight: "500" }} numberOfLines={4} ellipsizeMode="head">
                {speech.transcript}
              </Text>
            </View>
          ) : null}

          {hintOpen ? (
            <View style={[{ position: "absolute", left: 14, right: 14, bottom: insets.bottom + 132, backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 26, padding: 16 }, t.shadowLg, { zIndex: 15 }]}>
              <View style={{ flexDirection: "row", backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 999, padding: 4 }}>
                {(
                  [
                    ["phrase", "Today’s phrases"],
                    ["beats", `Story beats · ${beats.length}`],
                  ] as const
                ).map(([key, label]) => {
                  const on = tab === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setTab(key)}
                      style={{ flex: 1, height: 40, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: on ? t.colors.accS : "transparent" }}
                    >
                      {on ? <Icon name="sparkle" s={15} c={t.colors.accD} /> : null}
                      <Text style={{ fontSize: 14.5, fontWeight: "700", color: on ? t.colors.accD : "rgba(0,0,0,0.5)" }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {tab === "phrase" ? (
                <View style={{ paddingTop: 14, paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: "rgba(0,0,0,0.4)" }}>TODAY’S TOPIC</Text>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#16181d", marginTop: 6 }}>{topicLine}</Text>
                  {p0.prompt ? (
                    <Text style={{ fontSize: 13.5, lineHeight: 19, color: "rgba(0,0,0,0.5)", marginTop: 4 }}>{p0.prompt}</Text>
                  ) : null}
                  <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: "rgba(0,0,0,0.4)", marginTop: 14 }}>REVIEW TODAY</Text>
                  {todayPhrases.length ? (
                    <ScrollView style={{ maxHeight: 168, marginTop: 8 }} nestedScrollEnabled>
                      {todayPhrases.map((item, index) => (
                        <View key={item.id} style={{ paddingVertical: 8, borderTopWidth: index ? 1 : 0, borderTopColor: "rgba(0,0,0,0.06)" }}>
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#16181d" }}>{item.text}</Text>
                          {item.translation ? (
                            <Text style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", marginTop: 3 }}>{item.translation}</Text>
                          ) : null}
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={{ paddingTop: 8 }}>
                      <Serif style={{ fontSize: 22, lineHeight: 28, color: "#16181d" }}>{prompt}</Serif>
                      <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", marginTop: 6 }}>Use it naturally when it fits.</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ paddingTop: 14, paddingHorizontal: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: "rgba(0,0,0,0.4)" }} numberOfLines={1}>
                      {ctx.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.4, color: "rgba(0,0,0,0.4)" }}>
                      {Math.min(beatIdx + 1, beats.length)} OF {beats.length}
                    </Text>
                  </View>
                  {beats.map((b, i) => {
                    const done = i < beatIdx;
                    const current = i === beatIdx;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => setBeatIdx(i)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 14, backgroundColor: current ? t.colors.accS : "transparent" }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: done || current ? t.colors.acc : "transparent",
                            borderWidth: done || current ? 0 : 2,
                            borderColor: "rgba(0,0,0,0.2)",
                          }}
                        >
                          {done ? <Icon name="check" s={12} w={3} c="#fff" /> : null}
                        </View>
                        <Text style={{ flex: 1, fontSize: 15.5, fontWeight: current ? "700" : "600", color: current ? "#16181d" : done ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.7)" }}>
                          {b}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* bottom controls — Hint · record indicator · Finish */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 24, flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 40, zIndex: 15 }}>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={() => setHintOpen((open) => !open)}
                style={{ backgroundColor: hintOpen ? t.colors.acc : "rgba(28,30,36,0.66)", width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="bulb" s={24} w={1.9} c="#fff" />
              </Pressable>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>{hintOpen ? "Hide" : "Hint"}</Text>
            </View>
            <View style={{ alignItems: "center", gap: 8, paddingBottom: 22 }}>
              <View style={[{ width: 84, height: 84, borderRadius: 42, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }, t.shadowLg]}>
                <Wave n={5} h={30} active color="#fff" />
              </View>
            </View>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable onPress={finish} style={{ backgroundColor: "rgba(28,30,36,0.66)", width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 17, height: 17, borderRadius: 4, backgroundColor: "#fff" }} />
              </Pressable>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>Finish</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

// Referenced for parity; ensures TALK_BEATS default stays discoverable.
export { TALK_SAMPLES, TALK_BEATS };
