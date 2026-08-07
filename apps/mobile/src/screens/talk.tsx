// talk.tsx — Speak tab default: the mirror self-talk session (sp-talk.jsx).
// Phases: count → live → done → moment → retry. The web original uses radial
// gradients + backdrop blur; RN stands those in with layered translucent fills.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SERIF, useTheme } from "@/design/theme";
import { BackBar, Card, Icon, Pill, Screen, Serif, Wave } from "@/design/ui";
import { useSpeechSession } from "@/hooks/use-speech-session";
import { createTalkSession } from "@/lib/speaking-world";
import { createSpeakPhrase } from "@/lib/phrases";
import { diagnoseStuck, diagnoseTalk, type StuckMoment } from "@/lib/talk";
import { stuckNoteCopy } from "@/lib/first-language";
import type { StuckHelp, TalkMoment } from "@/types/api";
import type { Nav, TalkCtx } from "./nav";

const TALK_SAMPLES = [
  { label: "Explaining the problem", said: "I wanted to… 좀 더 쉽게 해결하고 싶어…", want: "I wanted to solve it in a simpler way.", ex: "I started this because I wanted to solve it in a simpler way." },
  { label: "Why I started", said: "이 일을 시작한 이유는…", want: "The reason I started this is…", ex: "It started because I kept seeing the same problem." },
  { label: "Saying who it helps", said: "It helps people who… 자신감이 없는?", want: "people who don’t feel confident speaking yet", ex: "It helps people who don’t feel confident speaking yet." },
];
const TALK_BEATS = ["What I’m building", "Who it helps", "How it works", "Why it matters"];

const FROST = "rgba(20,22,28,0.55)";

function TalkMirror() {
  // Approximate the mirror: dark vertical wash + a warm translucent glow.
  return (
    <View style={{ position: "absolute", inset: 0, backgroundColor: "#2e323b" }}>
      <View style={{ position: "absolute", top: -40, left: 0, right: 0, height: 300, backgroundColor: "#464b56", opacity: 0.9 }} />
      <View
        style={{
          position: "absolute",
          top: "42%",
          left: "18%",
          width: "64%",
          height: 200,
          borderRadius: 200,
          backgroundColor: "rgba(217,197,181,0.22)",
        }}
      />
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 220, backgroundColor: "#20222a", opacity: 0.85 }} />
    </View>
  );
}

// Live front-camera "mirror" — see yourself while speaking, so you practice
// looking up. PREVIEW ONLY: no recording, no audio (the speech recognizer owns
// the mic; the camera plugin sets microphonePermission:false). Falls back to the
// dark gradient TalkMirror when camera permission isn't granted.
function CameraMirror() {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission?.granted) return <TalkMirror />;

  return (
    <View style={{ position: "absolute", inset: 0, backgroundColor: "#000" }}>
      <CameraView style={{ flex: 1 }} facing="front" />
      {/* Scrim so the white top bar / caption / controls stay legible over a
          bright camera feed. */}
      <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(20,22,28,0.28)" }} />
    </View>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmt2 = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function TalkScreen({ nav, talkCtx }: { nav: Nav; talkCtx?: TalkCtx }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const p0 = talkCtx ?? {};

  const [phase, setPhase] = useState<"count" | "live" | "done" | "moment" | "retry">("count");
  const [n, setN] = useState(3);
  const [sec, setSec] = useState(0);
  const [tab, setTab] = useState<"phrase" | "beats">("phrase");
  const [beatIdx, setBeatIdx] = useState(0); // current story beat in the checklist
  const [ctx, setCtx] = useState(p0.ctx || "Free talk");
  const [dd, setDd] = useState(false);
  const [marks, setMarks] = useState<StuckMoment[]>([]);
  const [noteOpen, setNoteOpen] = useState(false); // the quick "stuck" note sheet
  const [noteText, setNoteText] = useState("");
  const [noteAt, setNoteAt] = useState("0:00");
  const [toast, setToast] = useState<string | null>(null);
  const [dur, setDur] = useState(0);
  const [sel, setSel] = useState(0);
  // Per-moment "Save as phrase" state (persists mSel.want to phrase_items).
  const [phraseSave, setPhraseSave] = useState<Record<number, "saving" | "saved" | "already" | "error">>({});
  const beats = p0.beats || TALK_BEATS;
  const prompt = p0.prompt || "What I’m trying to do is…";

  // On-device speech recognition for the live session (ADR 0003).
  const speech = useSpeechSession();
  const startedRef = useRef(false);
  const [transcript, setTranscript] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  // AI diagnosis of the finished session (ADR 0003 next step). moments come from
  // the web /api/talk/diagnose route, NOT from the mock TALK_SAMPLES anymore.
  const [moments, setMoments] = useState<TalkMoment[]>([]);
  const [diagState, setDiagState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [diagErr, setDiagErr] = useState<string | null>(null);
  // Separate analysis of the moments the learner tapped "Stuck" (talk-stuck).
  const [stuckHelp, setStuckHelp] = useState<StuckHelp[]>([]);
  const [stuckState, setStuckState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const pop = useMemo(() => new Animated.Value(1), []);

  // Countdown. State changes happen in the timer callback (not synchronously in
  // the effect body), so each number — including "Go" — gets a visible beat.
  useEffect(() => {
    if (phase !== "count") return;
    pop.setValue(1.45);
    Animated.timing(pop, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const id = setTimeout(() => {
      if (n === 0) setPhase("live");
      else setN((v) => v - 1);
    }, n === 0 ? 550 : 850);
    return () => clearTimeout(id);
  }, [phase, n, pop]);

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
    void speech.start({ onDevice: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Tap "Stuck" → open a quick note at this timestamp. Recording keeps running.
  const stuck = () => {
    setNoteAt(fmt(sec));
    setNoteText("");
    setNoteOpen(true);
  };
  const saveNote = () => {
    const note = noteText.trim();
    setNoteOpen(false);
    setNoteText("");
    if (!note) return; // empty note = cancel, no mark
    setMarks((m) => [...m, { at: noteAt, note }]);
    setToast(noteAt);
    setTimeout(() => setToast(null), 1300);
  };

  // Coach the "Stuck" taps — runs in parallel with the main diagnosis on finish.
  const runStuckDiagnosis = (moments: StuckMoment[]) => {
    if (!moments.length) {
      setStuckHelp([]);
      setStuckState("done");
      return;
    }
    const topic = ctx === "Free talk" ? p0.sub ?? null : [ctx, p0.sub].filter(Boolean).join(" · ") || null;
    setStuckState("loading");
    diagnoseStuck({ stuckMoments: moments, topic })
      .then((h) => {
        setStuckHelp(h);
        setStuckState("done");
      })
      .catch(() => setStuckState("error"));
  };
  // Ask the web API to surface improvable moments from the real transcript. Runs
  // in parallel with the save; an empty/short transcript short-circuits to none.
  const runDiagnosis = (text: string) => {
    if (!text.trim()) {
      setMoments([]);
      setDiagState("done");
      return;
    }
    const topic = ctx === "Free talk" ? p0.sub ?? null : [ctx, p0.sub].filter(Boolean).join(" · ") || null;
    setDiagState("loading");
    setDiagErr(null);
    diagnoseTalk({ transcript: text, topic })
      .then((ms) => {
        setMoments(ms);
        setDiagState("done");
      })
      .catch((e) => {
        setDiagState("error");
        setDiagErr(e instanceof Error ? e.message : "Couldn’t analyze this session.");
      });
  };

  const finish = () => {
    const text = speech.stop();
    setTranscript(text);
    setDur(sec);
    setPhase("done");
    setSaveState("saving");
    setSaveErr(null);
    createTalkSession({
      storyId: p0.storyId ?? null,
      messageId: p0.messageId ?? null,
      transcript: text,
      durationSeconds: sec,
    })
      .then(() => setSaveState("saved"))
      .catch((e) => {
        setSaveState("error");
        setSaveErr(e instanceof Error ? e.message : "Couldn’t save this session.");
      });
    runDiagnosis(text);
    runStuckDiagnosis(marks);
  };
  const restart = () => {
    speech.stop();
    startedRef.current = false;
    setTranscript("");
    setSaveState("idle");
    setSaveErr(null);
    setMoments([]);
    setDiagState("idle");
    setDiagErr(null);
    setStuckHelp([]);
    setStuckState("idle");
    setPhraseSave({});
    setPhase("count");
    setN(3);
    setSec(0);
    setMarks([]);
    setNoteOpen(false);
    setNoteText("");
    setTab("phrase");
    setBeatIdx(0);
    setDd(false);
  };
  const leave = () => {
    speech.stop();
    nav.go(p0.from ?? "today");
  };
  const mSel = moments[sel];

  // Persist a moment's suggested expression to the Phrase Bank (phrase_items).
  const savePhrase = (i: number) => {
    const m = moments[i];
    if (!m) return;
    setPhraseSave((s) => ({ ...s, [i]: "saving" }));
    createSpeakPhrase({ text: m.want, example: m.example, storyId: p0.storyId ?? null, said: m.said })
      .then((r) => setPhraseSave((s) => ({ ...s, [i]: r === "already" ? "already" : "saved" })))
      .catch(() => setPhraseSave((s) => ({ ...s, [i]: "error" })));
  };

  // ── done ──
  if (phase === "done")
    return (
      <Screen bottomPad={40}>
        <View style={{ alignItems: "center", paddingTop: 26, paddingBottom: 4 }}>
          <Serif style={{ fontSize: 34, color: t.colors.ink }}>Great job!</Serif>
          <Text style={{ fontSize: 16.5, fontWeight: "600", marginTop: 14, color: t.colors.ink }}>You spoke for {fmt(dur)}</Text>
          {marks.length ? (
            <Text style={{ fontSize: 16.5, fontWeight: "600", marginTop: 2, color: t.colors.ink }}>
              You marked {marks.length} spot{marks.length === 1 ? "" : "s"}.
            </Text>
          ) : null}
          <Text style={{ fontSize: 13.5, color: t.colors.ink3, marginTop: 10, textAlign: "center" }}>
            {diagState === "loading"
              ? "Looking at where you could level up…"
              : diagState === "done" && moments.length
                ? "Here’s where you could say it more naturally."
                : diagState === "done"
                  ? "You kept going the whole time — nice."
                  : ""}
          </Text>
        </View>

        {/* Real transcript from on-device recognition. */}
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3, paddingHorizontal: 2 }}>What you said</Text>
        <Card>
          {transcript ? (
            <Text style={{ fontSize: 15, lineHeight: 23, color: t.colors.ink }}>{transcript}</Text>
          ) : (
            <Text style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink3, fontStyle: "italic" }}>
              No words were captured this time.
            </Text>
          )}
          <Text style={{ fontSize: 11.5, fontWeight: "600", color: saveState === "error" ? "#E5484D" : t.colors.ink3, marginTop: 10 }}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved to your sessions" : saveState === "error" ? (saveErr ?? "Couldn’t save") : ""}
          </Text>
        </Card>

        {/* AI diagnosis: up to 3 improvable moments from the real transcript. */}
        {diagState === "loading" ? (
          <Card lg style={{ alignItems: "center", paddingVertical: 26, gap: 10 }}>
            <ActivityIndicator color={t.colors.accD} />
            <Text style={{ fontSize: 13.5, color: t.colors.ink3 }}>Finding moments to level up…</Text>
          </Card>
        ) : null}

        {diagState === "error" ? (
          <Card lg style={{ gap: 12 }}>
            <Text style={{ fontSize: 14, color: "#E5484D", fontWeight: "600" }}>{diagErr ?? "Couldn’t analyze this session."}</Text>
            <Pill tone="tint" onPress={() => runDiagnosis(transcript)}>
              Try again
            </Pill>
          </Card>
        ) : null}

        {diagState === "done"
          ? moments.map((m, i) => (
              <Card
                key={i}
                onPress={() => {
                  setSel(i);
                  setPhase("moment");
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: t.colors.accD }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{m.label}</Text>
                  <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }} numberOfLines={1}>
                    {m.said}
                  </Text>
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: t.colors.accD, marginTop: 4 }} numberOfLines={1}>
                    Try: {m.want}
                  </Text>
                </View>
                <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
              </Card>
            ))
          : null}

        {diagState === "done" && !moments.length ? (
          <Card lg style={{ alignItems: "center", paddingVertical: 28 }}>
            <Wave n={20} h={26} />
            <Text style={{ fontSize: 15, fontWeight: "600", marginTop: 12, color: t.colors.ink }}>Smooth run.</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 4, textAlign: "center" }}>
              Nothing stood out to fix — nice and natural. Keep going.
            </Text>
          </Card>
        ) : null}

        {/* Where you got stuck — a separate analysis of the "Stuck" taps. */}
        {marks.length > 0 ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginTop: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Where you got stuck</Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: t.colors.ink3 }}>
                {marks.length} spot{marks.length === 1 ? "" : "s"}
              </Text>
            </View>
            {stuckState === "loading" ? (
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20 }}>
                <ActivityIndicator color={t.colors.accD} />
                <Text style={{ fontSize: 13.5, color: t.colors.ink3 }}>Looking at what tripped you up…</Text>
              </Card>
            ) : stuckState === "error" ? (
              <Card style={{ gap: 10 }}>
                <Text style={{ fontSize: 14, color: "#E5484D", fontWeight: "600" }}>Couldn’t analyze your stuck moments.</Text>
                <Pill tone="tint" small onPress={() => runStuckDiagnosis(marks)}>
                  Try again
                </Pill>
              </Card>
            ) : stuckHelp.length ? (
              stuckHelp.map((h, i) => {
                // The learner's own note (their words, often Korean) → the English.
                const note = ((marks.find((m) => m.at === h.at) ?? marks[i])?.note ?? "").trim();
                return (
                  <Card key={i} style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                        <Icon name="life" s={17} c={t.colors.accD} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", letterSpacing: 0.4, color: t.colors.ink3 }}>YOU WANTED TO SAY</Text>
                      <View style={{ backgroundColor: t.colors.soft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: "700", color: t.colors.ink3 }}>{h.at}</Text>
                      </View>
                    </View>
                    {note ? <Text style={{ fontSize: 15, color: t.colors.ink, lineHeight: 21 }}>{note}</Text> : null}
                    <View style={{ backgroundColor: t.colors.accS, borderRadius: 14, padding: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.4, color: t.colors.accD }}>SAY IT LIKE THIS</Text>
                      <Text style={{ fontSize: 16, fontWeight: "600", lineHeight: 22, color: t.colors.ink, marginTop: 4 }}>{h.phrase}</Text>
                      {h.example ? <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 6, lineHeight: 19 }}>“{h.example}”</Text> : null}
                    </View>
                  </Card>
                );
              })
            ) : (
              <Card style={{ alignItems: "center", paddingVertical: 22 }}>
                <Text style={{ fontSize: 14, color: t.colors.ink2, textAlign: "center" }}>You pushed through those spots on your own. Nice.</Text>
              </Card>
            )}
          </>
        ) : null}

        <View style={{ flexDirection: "row", gap: t.gap, marginTop: 8 }}>
          {diagState === "done" && moments.length ? (
            <Pill
              tone="tint"
              full
              onPress={() => {
                setSel(0);
                setPhase("moment");
              }}
            >
              Review again
            </Pill>
          ) : (
            <Pill tone="tint" full icon="mic" onPress={restart}>
              Talk again
            </Pill>
          )}
          <Pill full onPress={() => nav.go("today")}>
            Done
          </Pill>
        </View>
      </Screen>
    );

  // ── moment ──
  if (phase === "moment" && mSel)
    return (
      <Screen bottomPad={40}>
        <BackBar title={mSel.label} onBack={() => setPhase("done")} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 4 }}>You said</Text>
        <Card>
          <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink }}>{mSel.said}</Text>
        </Card>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 6 }}>You may have meant</Text>
        <View style={[{ backgroundColor: t.colors.pill, borderRadius: t.r, padding: t.padc }, t.shadowCard]}>
          <Text style={{ fontSize: 16.5, fontWeight: "700", lineHeight: 22, color: "#fff" }}>{mSel.want}</Text>
          {mSel.example ? (
            <Text style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 20 }}>“{mSel.example}”</Text>
          ) : null}
        </View>
        <View style={{ paddingHorizontal: 2, paddingTop: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Try it now</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>Practice just this part.</Text>
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pill full icon="mic" onPress={() => setPhase("retry")}>
            Retry this moment
          </Pill>
          {(() => {
            const pSt = phraseSave[sel];
            const pDone = pSt === "saved" || pSt === "already";
            const pLabel =
              pSt === "saving"
                ? "Saving…"
                : pSt === "saved"
                  ? "Saved to Phrase Bank"
                  : pSt === "already"
                    ? "Already in your Phrase Bank"
                    : pSt === "error"
                      ? "Couldn’t save — tap to retry"
                      : "Save as phrase";
            return (
              <Pill tone="tint" full icon={pDone ? "check" : "bank"} onPress={pSt === "saving" || pDone ? undefined : () => savePhrase(sel)}>
                {pLabel}
              </Pill>
            );
          })()}
        </View>
      </Screen>
    );

  // ── retry ──
  if (phase === "retry" && mSel)
    return (
      <Screen bottomPad={40}>
        <BackBar title="Retry this moment" onBack={() => setPhase("moment")} />
        <Card lg>
          <Text style={{ fontSize: 13, color: t.colors.ink3 }}>Say just this part</Text>
          <Serif style={{ fontSize: 24, lineHeight: 31, marginTop: 6, color: t.colors.ink }}>{mSel.want}</Serif>
          {mSel.example ? (
            <Text style={{ fontSize: 13.5, color: t.colors.ink2, marginTop: 10, lineHeight: 20 }}>“{mSel.example}”</Text>
          ) : null}
        </Card>
        <View style={{ borderRadius: t.r, height: 170, overflow: "hidden" }}>
          <CameraMirror />
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Wave n={22} h={30} active color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>Just this sentence — 10 seconds is plenty</Text>
          </View>
        </View>
        <Pill full icon="check" onPress={() => setPhase("moment")}>
          I said it
        </Pill>
      </Screen>
    );

  // ── mirror: countdown + live ──
  const live = phase === "live";
  const subPill = p0.sub || (ctx !== "Free talk" ? ctx : null);
  const noteCopy = stuckNoteCopy(); // greet the learner in their first language
  return (
    <View style={{ position: "absolute", inset: 0 }}>
      <CameraMirror />
      {phase === "count" ? <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.32)" }} /> : null}

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

      {phase === "count" ? (
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", zIndex: 10 }}>
          <Animated.Text style={{ fontFamily: SERIF, fontSize: 116, color: "#fff", transform: [{ scale: pop }] }}>
            {n === 0 ? "Go" : n}
          </Animated.Text>
          <Text style={{ fontSize: 14.5, color: "rgba(255,255,255,0.72)", marginTop: 18 }}>Find your eyes. Then just talk.</Text>
          <Text style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>Your speech becomes text on your device. Nothing is uploaded.</Text>
        </View>
      ) : null}

      {live ? (
        <>
          {/* Recording status pill */}
          <View style={{ position: "absolute", top: insets.top + (subPill ? 84 : 56), left: 0, right: 0, alignItems: "center", zIndex: 12 }}>
            {speech.error ? (
              <View style={{ backgroundColor: "rgba(20,22,28,0.7)", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15 }}>
                <Text style={{ fontSize: 13, color: "#FFC9C9", fontWeight: "600" }}>{speech.error}</Text>
              </View>
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

          {toast ? (
            <View style={{ position: "absolute", bottom: 300, left: 0, right: 0, alignItems: "center", zIndex: 25 }}>
              <View style={{ backgroundColor: FROST, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Icon name="life" s={14} w={2} c="#FFD79A" />
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#fff" }}>Noted · {toast}</Text>
              </View>
            </View>
          ) : null}

          {/* cue card — segmented Today's phrase / Story beats */}
          <View style={[{ position: "absolute", left: 14, right: 14, bottom: insets.bottom + 132, backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 26, padding: 16 }, t.shadowLg, { zIndex: 15 }]}>
            <View style={{ flexDirection: "row", backgroundColor: "rgba(0,0,0,0.05)", borderRadius: 999, padding: 4 }}>
              {(
                [
                  ["phrase", "Today's phrase"],
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
              <View style={{ paddingTop: 16, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: "rgba(0,0,0,0.4)" }}>PRIORITY FOR TODAY</Text>
                <Serif style={{ fontSize: 24, lineHeight: 30, color: "#16181d", marginTop: 8 }}>{prompt}</Serif>
                <Text style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", marginTop: 6 }}>Use it naturally when it fits.</Text>
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
                <View style={{ alignItems: "flex-end", marginTop: 6 }}>
                  <Pressable
                    onPress={() => setTab("phrase")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1.5, borderColor: t.colors.accS, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}
                  >
                    <Icon name="sparkle" s={14} c={t.colors.accD} />
                    <Text style={{ fontSize: 13.5, fontWeight: "700", color: t.colors.accD }}>Use today’s phrase</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* bottom controls — Stuck · record indicator · Finish */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 24, flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 40, zIndex: 15 }}>
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable onPress={stuck} style={{ backgroundColor: "rgba(28,30,36,0.66)", width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
                <Icon name="life" s={24} w={1.9} c="#fff" />
              </Pressable>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>Stuck</Text>
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

          {/* Quick "stuck" note — jot what you wanted to say (native language OK). */}
          {noteOpen ? (
            <View style={{ position: "absolute", inset: 0, zIndex: 50 }}>
              <Pressable style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} onPress={saveNote} />
              <View style={[{ position: "absolute", top: insets.top + 96, left: 20, right: 20, backgroundColor: "#fff", borderRadius: 24, padding: 18 }, t.shadowLg]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="life" s={16} c={t.colors.accD} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: "#16181d" }}>{noteCopy.title}</Text>
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: "rgba(0,0,0,0.4)" }}>{noteAt}</Text>
                </View>
                <TextInput
                  autoFocus
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder={noteCopy.placeholder}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  multiline
                  onSubmitEditing={saveNote}
                  blurOnSubmit
                  returnKeyType="done"
                  style={{ fontSize: 16, lineHeight: 22, color: "#16181d", minHeight: 44, paddingVertical: 6 }}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      setNoteOpen(false);
                      setNoteText("");
                    }}
                    style={{ height: 40, paddingHorizontal: 16, borderRadius: 999, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "rgba(0,0,0,0.5)" }}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={saveNote} style={{ height: 40, paddingHorizontal: 20, borderRadius: 999, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Keep going</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// Referenced for parity; ensures TALK_BEATS default stays discoverable.
export { TALK_SAMPLES, TALK_BEATS };
