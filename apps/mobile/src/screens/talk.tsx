// talk.tsx — Speak tab default: the mirror self-talk session (sp-talk.jsx).
// Phases: count → live → done → moment → retry. The web original uses radial
// gradients + backdrop blur; RN stands those in with layered translucent fills.
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SERIF, useTheme } from "@/design/theme";
import { BackBar, Card, Icon, Pill, Screen, Serif, Wave } from "@/design/ui";
import { useSpeechSession } from "@/hooks/use-speech-session";
import { createTalkSession } from "@/lib/speaking-world";
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

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmt2 = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function TalkScreen({ nav, talkCtx }: { nav: Nav; talkCtx?: TalkCtx }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const p0 = talkCtx ?? {};

  const [phase, setPhase] = useState<"count" | "live" | "done" | "moment" | "retry">("count");
  const [n, setN] = useState(3);
  const [sec, setSec] = useState(0);
  const [cue, setCue] = useState<"phrase" | "beats" | "hidden">("phrase");
  const [ctx, setCtx] = useState(p0.ctx || "Free talk");
  const [dd, setDd] = useState(false);
  const [marks, setMarks] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [dur, setDur] = useState(0);
  const [sel, setSel] = useState(0);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const beats = p0.beats || TALK_BEATS;
  const prompt = p0.prompt || "What I’m trying to do is…";

  // On-device speech recognition for the live session (ADR 0003).
  const speech = useSpeechSession();
  const startedRef = useRef(false);
  const [transcript, setTranscript] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErr, setSaveErr] = useState<string | null>(null);

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

  const stuck = () => {
    const ts = fmt(sec);
    setMarks((m) => [...m, ts]);
    setToast(ts);
    setTimeout(() => setToast(null), 1300);
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
  };
  const restart = () => {
    speech.stop();
    startedRef.current = false;
    setTranscript("");
    setSaveState("idle");
    setSaveErr(null);
    setPhase("count");
    setN(3);
    setSec(0);
    setMarks([]);
    setCue("phrase");
    setDd(false);
  };
  const leave = () => {
    speech.stop();
    nav.go(p0.from ?? "today");
  };
  const moments = marks.map((ts, i) => ({ ts, ...TALK_SAMPLES[i % TALK_SAMPLES.length] }));
  const mSel = moments[sel];

  // ── done ──
  if (phase === "done")
    return (
      <Screen bottomPad={40}>
        <View style={{ alignItems: "center", paddingTop: 26, paddingBottom: 4 }}>
          <Serif style={{ fontSize: 34, color: t.colors.ink }}>Great job!</Serif>
          <Text style={{ fontSize: 16.5, fontWeight: "600", marginTop: 14, color: t.colors.ink }}>You spoke for {fmt(dur)}</Text>
          <Text style={{ fontSize: 16.5, fontWeight: "600", marginTop: 2, color: t.colors.ink }}>
            You marked {moments.length} moment{moments.length === 1 ? "" : "s"}.
          </Text>
          <Text style={{ fontSize: 13.5, color: t.colors.ink3, marginTop: 10, textAlign: "center" }}>
            {moments.length ? "Let’s look at the moments where you wanted help." : "You kept going the whole time — nice."}
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

        {moments.map((m, i) => (
          <Card
            key={i}
            onPress={() => {
              setSel(i);
              setPhase("moment");
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" s={17} c={t.colors.accD} />
              </View>
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: t.colors.accD }}>{m.ts}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{m.label}</Text>
              <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }} numberOfLines={1}>
                {m.said}
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: t.colors.accD, marginTop: 4 }}>2 suggested expressions</Text>
            </View>
            <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
          </Card>
        ))}
        {!moments.length ? (
          <Card lg style={{ alignItems: "center", paddingVertical: 28 }}>
            <Wave n={20} h={26} />
            <Text style={{ fontSize: 15, fontWeight: "600", marginTop: 12, color: t.colors.ink }}>Smooth run.</Text>
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 4, textAlign: "center" }}>
              Next time, tap Stuck whenever a word won’t come — we’ll catch it here.
            </Text>
          </Card>
        ) : null}
        <View style={{ flexDirection: "row", gap: t.gap, marginTop: 8 }}>
          {moments.length ? (
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
        <BackBar title={`${mSel.ts} · ${mSel.label}`} onBack={() => setPhase("done")} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 4 }}>You said</Text>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" s={16} c={t.colors.accD} />
            </View>
            <View style={{ flex: 1 }}>
              <Wave n={30} h={22} color={t.colors.ink3} />
            </View>
            <Text style={{ fontSize: 12.5, color: t.colors.ink3, fontWeight: "600" }}>0:06</Text>
          </View>
          <Text style={{ fontSize: 15, marginTop: 12, lineHeight: 22, color: t.colors.ink }}>{mSel.said}</Text>
        </Card>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink3, paddingHorizontal: 2, paddingTop: 6 }}>You may have meant</Text>
        <View style={[{ backgroundColor: t.colors.pill, borderRadius: t.r, padding: t.padc, flexDirection: "row", alignItems: "center", gap: 12 }, t.shadowCard]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16.5, fontWeight: "700", lineHeight: 22, color: "#fff" }}>{mSel.want}</Text>
            <Text style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 20 }}>“{mSel.ex}”</Text>
          </View>
          <Pressable style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" s={16} c="#fff" />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 2, paddingTop: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Try it now</Text>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>Practice just this part.</Text>
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pill full icon="mic" onPress={() => setPhase("retry")}>
            Retry this moment
          </Pill>
          <Pill tone="tint" full icon={saved[sel] ? "check" : "bank"} onPress={() => setSaved((s) => ({ ...s, [sel]: true }))}>
            {saved[sel] ? "Saved to Phrases" : "Save as phrase"}
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
          <Text style={{ fontSize: 13, color: t.colors.ink3 }}>Say just this part</Text>
          <Serif style={{ fontSize: 24, lineHeight: 31, marginTop: 6, color: t.colors.ink }}>{mSel.want}</Serif>
          <Text style={{ fontSize: 13.5, color: t.colors.ink2, marginTop: 10, lineHeight: 20 }}>“{mSel.ex}”</Text>
        </Card>
        <View style={{ borderRadius: t.r, height: 170, overflow: "hidden" }}>
          <TalkMirror />
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Wave n={22} h={30} active color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>Just this sentence — 10 seconds is plenty</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: t.gap }}>
          <Pill tone="tint" full icon="speaker">
            Hear it
          </Pill>
          <Pill full icon="check" onPress={() => setPhase("moment")}>
            I said it
          </Pill>
        </View>
      </Screen>
    );

  // ── mirror: countdown + live ──
  const live = phase === "live";
  const title = [ctx, p0.sub].filter(Boolean).join(" · ");
  return (
    <View style={{ position: "absolute", inset: 0 }}>
      <TalkMirror />
      {phase === "count" ? <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.32)" }} /> : null}

      {/* top bar */}
      <View style={{ position: "absolute", top: insets.top + 6, left: 14, right: 14, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 20 }}>
        <Pressable onPress={leave} style={{ backgroundColor: FROST, borderRadius: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="back" s={17} w={2.2} c="#fff" />
        </Pressable>
        <Pressable onPress={() => setDd(!dd)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#fff", fontSize: 14.5, fontWeight: "600" }} numberOfLines={1}>
            {title}
          </Text>
          <Icon name="chev" s={12} w={2.4} c="#fff" />
        </Pressable>
        <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#fff", width: 44, textAlign: "right" }}>{live ? fmt2(sec) : "00:00"}</Text>
      </View>

      {dd ? (
        <View style={{ position: "absolute", top: insets.top + 52, alignSelf: "center", zIndex: 30, backgroundColor: FROST, borderRadius: 20, padding: 8, minWidth: 200 }}>
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
          {/* Live on-device caption — words appear as you speak. */}
          <View style={{ position: "absolute", top: insets.top + 90, left: 22, right: 22, alignItems: "center", zIndex: 12 }}>
            {speech.error ? (
              <Text style={{ fontSize: 13, color: "#FFC9C9", fontWeight: "600", textAlign: "center" }}>
                {speech.error}
              </Text>
            ) : speech.transcript ? (
              <Text style={{ fontSize: 17, lineHeight: 25, color: "#fff", textAlign: "center", fontWeight: "500" }} numberOfLines={4}>
                {speech.transcript}
              </Text>
            ) : (
              <Text style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
                {speech.recognizing ? "Listening… just talk." : "Getting the mic ready…"}
              </Text>
            )}
          </View>

          {toast ? (
            <View style={{ position: "absolute", bottom: 268, left: 0, right: 0, alignItems: "center", zIndex: 25 }}>
              <View style={{ backgroundColor: FROST, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Icon name="bank" s={14} w={2} c="#FFD79A" />
                <Text style={{ fontSize: 13.5, fontWeight: "600", color: "#fff" }}>Moment saved · {toast}</Text>
              </View>
            </View>
          ) : null}

          {/* cue card */}
          <View style={{ position: "absolute", left: 18, right: 18, bottom: 138, zIndex: 15 }}>
            {cue === "hidden" ? (
              <View style={{ alignItems: "center" }}>
                <Pressable onPress={() => setCue("phrase")} style={{ backgroundColor: "rgba(20,22,28,0.5)", borderRadius: 999, height: 36, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>Show a cue</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setCue(cue === "phrase" ? "beats" : "phrase")}
                style={[{ backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 20, padding: 16 }, t.shadowLg]}
              >
                <Pressable onPress={() => setCue("hidden")} style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                  <Icon name="x" s={11} w={2.2} c="rgba(0,0,0,0.45)" />
                </Pressable>
                {cue === "phrase" ? (
                  <>
                    <Serif style={{ fontSize: 20, lineHeight: 26, color: "#16181d", paddingRight: 24 }}>{prompt}</Serif>
                    <Text style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", fontWeight: "600", marginTop: 5 }}>Phrase cue</Text>
                  </>
                ) : (
                  <>
                    <View style={{ gap: 6, paddingRight: 24 }}>
                      {beats.map((b, i) => (
                        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.colors.acc, opacity: 0.6 }} />
                          <Text style={{ fontSize: 14.5, fontWeight: "600", color: "#16181d" }}>{b}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", fontWeight: "600", marginTop: 7 }}>Message beats</Text>
                  </>
                )}
                <View style={{ flexDirection: "row", gap: 5, justifyContent: "center", marginTop: 9 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: cue === "phrase" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.18)" }} />
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: cue === "beats" ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.18)" }} />
                </View>
              </Pressable>
            )}
          </View>

          {/* bottom controls */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + 24, flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 36, zIndex: 15 }}>
            <View style={{ alignItems: "center", gap: 7 }}>
              <Pressable onPress={stuck} style={{ backgroundColor: "rgba(255,255,255,0.16)", width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" }}>
                <Icon name="bank" s={20} w={1.9} c="#fff" />
              </Pressable>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>Stuck</Text>
            </View>
            <View style={{ alignItems: "center", gap: 7 }}>
              <View style={[{ width: 74, height: 74, borderRadius: 37, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }, t.shadowLg]}>
                <Wave n={5} h={26} active color="#E5484D" />
              </View>
              <Text style={{ fontSize: 12 }}> </Text>
            </View>
            <View style={{ alignItems: "center", gap: 7 }}>
              <Pressable onPress={finish} style={{ backgroundColor: "rgba(255,255,255,0.16)", width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: "#fff" }} />
              </Pressable>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.75)" }}>Finish</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

// Referenced for parity; ensures TALK_BEATS default stays discoverable.
export { TALK_SAMPLES, TALK_BEATS };
