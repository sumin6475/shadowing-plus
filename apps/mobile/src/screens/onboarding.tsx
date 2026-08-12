import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/design/theme";
import { Block, Card, Icon, Pill, Screen, Serif, Wave } from "@/design/ui";
import { useSpeechSession } from "@/hooks/use-speech-session";
import {
  makePhraseExample,
  saveOnboardingDraft,
  shapeOnboardingBeats,
  type OnboardingDraft,
  type OnboardingStep,
} from "@/lib/onboarding";

const STORIES = [
  "What I do",
  "My startup",
  "A recent challenge",
  "My future plans",
  "Something I learned",
  "Write my own",
];

const STEP_ORDER: OnboardingStep[] = ["welcome", "story", "notes", "beats", "phrase", "talk", "keep"];

function Progress({ stage }: { stage: 1 | 2 | 3 }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 9 }}>
      <Text style={{ fontSize: 13, color: t.colors.ink3 }}>{stage} of 3</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3].map((value) => (
          <View key={value} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: value === stage ? t.colors.acc : t.colors.soft }} />
        ))}
      </View>
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={[styles.roundButton, { backgroundColor: t.colors.card, borderColor: t.ring }, t.shadowCard]}
    >
      <Icon name="back" s={17} w={2.2} c={t.colors.ink} />
    </Pressable>
  );
}

function FlowHeader({ stage, onBack }: { stage: 1 | 2 | 3; onBack: () => void }) {
  return (
    <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Back onPress={onBack} />
      <Progress stage={stage} />
      <View style={{ width: 44 }} />
    </View>
  );
}

function StoryCard({ title, selected, onPress, tone }: { title: string; selected: boolean; onPress: () => void; tone: string }) {
  const t = useTheme();
  return (
    <Block
      tone={tone}
      onPress={onPress}
      style={{ width: "47%", flexGrow: 1, minHeight: 118, justifyContent: "space-between", borderWidth: selected ? 2 : StyleSheet.hairlineWidth, borderColor: selected ? t.colors.acc : t.ring }}
    >
      <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: "700", color: t.colors.ink }}>{title}</Text>
      {selected ? (
        <View style={{ alignSelf: "flex-end", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.acc }}>
          <Icon name="check" s={12} w={3} c="#fff" />
        </View>
      ) : null}
    </Block>
  );
}

export function Onboarding({
  initialDraft,
  signedIn,
  onDraftChange,
  onSignIn,
  onDirectSignIn,
  onComplete,
}: {
  initialDraft: OnboardingDraft;
  signedIn: boolean;
  onDraftChange: (draft: OnboardingDraft) => void;
  onSignIn: (draft: OnboardingDraft) => void;
  onDirectSignIn: () => void;
  onComplete: (draft: OnboardingDraft) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(initialDraft);
  const draftRef = useRef(initialDraft);
  const saveQueueRef = useRef<Promise<OnboardingDraft>>(Promise.resolve(initialDraft));
  const [customStory, setCustomStory] = useState(initialDraft.storyTitle === "Write my own" ? "" : initialDraft.storyTitle);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const speech = useSpeechSession();
  const [seconds, setSeconds] = useState(initialDraft.durationSeconds);
  const [startingTalk, setStartingTalk] = useState(false);
  const [talkStarted, setTalkStarted] = useState(false);
  const [talkError, setTalkError] = useState<string | null>(null);

  const persist = (patch: Partial<OnboardingDraft>) => {
    const next: OnboardingDraft = {
      ...draftRef.current,
      ...patch,
      status: patch.status ?? (draftRef.current.status === "not_started" ? "in_progress" : draftRef.current.status),
      updatedAt: new Date().toISOString(),
    };
    draftRef.current = next;
    setDraft(next);
    onDraftChange(next);
    saveQueueRef.current = saveQueueRef.current.then(() => saveOnboardingDraft(next));
    return next;
  };

  useEffect(() => {
    if (draft.step !== "talk" || !speech.recognizing) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [draft.step, speech.recognizing]);

  const goBack = () => {
    const index = STEP_ORDER.indexOf(draft.step);
    if (index <= 0) return;
    speech.stop();
    persist({ step: STEP_ORDER[index - 1] });
  };

  const selectStory = (title: string) => {
    persist({ storyTitle: title });
    if (title !== "Write my own") setCustomStory(title);
  };

  const continueFromStory = () => {
    const title = draft.storyTitle === "Write my own" ? customStory.trim() : draft.storyTitle;
    if (!title) return;
    persist({ storyTitle: title, step: "notes" });
  };

  const shapeStory = () => {
    const beats = shapeOnboardingBeats(draft.storyTitle, draft.notes);
    persist({ beats, step: "beats" });
  };

  const keepBeats = () => {
    const beats = draft.beats.map((beat) => beat.trim()).filter(Boolean);
    persist({ beats, phraseExample: makePhraseExample(draft.storyTitle, beats), step: "phrase" });
  };

  const startTalk = async () => {
    setStartingTalk(true);
    setTalkError(null);
    setTalkStarted(false);
    setSeconds(0);
    persist({ step: "talk", transcript: "", durationSeconds: 0 });
    if (!cameraPermission?.granted) {
      try {
        await requestCameraPermission();
      } catch {
        // The front camera is optional; microphone Talk can still continue.
      }
    }
    const started = await speech.start({ onDevice: true });
    setTalkStarted(started);
    if (!started) setTalkError("Saylo needs microphone and speech access for your first Talk.");
    setStartingTalk(false);
  };

  const canFinishTalk = talkStarted && !speech.error;

  const finishTalk = () => {
    if (!canFinishTalk) return;
    const transcript = speech.stop();
    persist({ transcript, durationSeconds: seconds, step: "keep" });
  };

  const retryTalk = async () => {
    speech.reset();
    setSeconds(0);
    setStartingTalk(true);
    setTalkError(null);
    setTalkStarted(false);
    persist({ step: "talk", transcript: "", durationSeconds: 0 });
    const started = await speech.start({ onDevice: true });
    setTalkStarted(started);
    if (!started) setTalkError("Saylo needs microphone and speech access for your first Talk.");
    setStartingTalk(false);
  };

  const finishFlow = () => {
    if (!draft.transcript.trim()) return;
    const next = persist({ status: signedIn ? "in_progress" : "awaiting_sign_in" });
    if (signedIn) onComplete(next);
    else onSignIn(next);
  };

  const storyTitleUpper = draft.storyTitle.toLocaleUpperCase("en");
  const selectedStory = STORIES.includes(draft.storyTitle) ? draft.storyTitle : "Write my own";
  const spokenSeconds = Math.max(1, draft.durationSeconds || seconds);

  if (draft.step === "talk") {
    return (
      <View style={{ flex: 1, backgroundColor: "#16181d" }}>
        {cameraPermission?.granted ? <CameraView style={StyleSheet.absoluteFill} facing="front" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#30343d" }]} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,12,18,0.36)" }]} />
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 22, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{draft.storyTitle} · 30 sec</Text>
          <Text style={{ position: "absolute", right: 22, top: insets.top + 12, color: "#fff", fontVariant: ["tabular-nums"] }}>0:{String(seconds).padStart(2, "0")}</Text>
          <View style={{ marginTop: 13, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: "rgba(10,10,12,0.68)" }}>
            <Text style={{ color: "#fff", fontSize: 12 }}>{startingTalk ? "Preparing…" : speech.recognizing ? "🔴  Listening · keep talking" : "Ready when you are"}</Text>
          </View>
        </View>

        <View style={{ position: "absolute", left: 18, right: 18, bottom: insets.bottom + 116 }}>
          <Card style={{ padding: 22, backgroundColor: "rgba(255,255,255,0.94)" }}>
            <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.7, color: t.colors.accD }}>TODAY’S PHRASE</Text>
            <Serif style={{ marginTop: 13, fontSize: 28, lineHeight: 34, color: "#151519" }}>{draft.phrase}</Serif>
            {speech.transcript ? <Text style={{ marginTop: 12, fontSize: 13, lineHeight: 19, color: "rgba(60,60,67,0.7)" }} numberOfLines={2}>{speech.transcript}</Text> : null}
          </Card>
          {(talkError || speech.error) ? (
            <View style={{ marginTop: 10, borderRadius: 18, padding: 13, backgroundColor: "rgba(10,10,12,0.78)" }}>
              <Text style={{ color: "#fff", fontSize: 13, lineHeight: 18, textAlign: "center" }}>{talkError || speech.error}</Text>
              <Pressable onPress={retryTalk} style={{ marginTop: 9, alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>Try microphone again</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={{ position: "absolute", left: 22, right: 22, bottom: insets.bottom + 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={goBack} style={styles.talkSideButton}>
            <Icon name="back" s={20} c="#fff" />
            <Text style={styles.talkSideLabel}>Back</Text>
          </Pressable>
          <View style={{ width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.acc }}>
            {startingTalk ? <ActivityIndicator color="#fff" /> : <Wave active={speech.recognizing} n={5} h={27} color="#fff" />}
          </View>
          <Pressable onPress={finishTalk} disabled={startingTalk || !canFinishTalk} style={[styles.talkSideButton, { opacity: canFinishTalk ? 1 : 0.42 }]}>
            <View style={{ width: 19, height: 19, borderRadius: 5, backgroundColor: "#fff" }} />
            <Text style={styles.talkSideLabel}>{canFinishTalk ? "Finish" : "Waiting"}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Screen bottomPad={28} style={{ minHeight: "100%" }}>
      {draft.step === "welcome" ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
            <Text style={{ fontSize: 23, fontWeight: "700", color: t.colors.ink }}>saylo</Text>
            <Pressable onPress={onDirectSignIn} hitSlop={10}><Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.acc }}>Sign in</Text></Pressable>
          </View>
          <View style={{ flex: 1, justifyContent: "center", paddingVertical: 46 }}>
            <Serif style={{ fontSize: 43, lineHeight: 46, color: t.colors.ink }}>Make English{"\n"}yours.</Serif>
            <Text style={{ marginTop: 15, maxWidth: 310, fontSize: 18, lineHeight: 27, color: t.colors.ink2 }}>Build the stories you actually want to tell.</Text>
            <View style={{ height: 230, marginTop: 28, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 178, height: 178, borderRadius: 89, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}><Icon name="mic" s={34} w={2} c="#fff" /></View>
              </View>
              <Wave n={28} h={40} active color={t.colors.acc} />
            </View>
          </View>
          <Pill full onPress={() => persist({ step: "story" })}>Start with my story</Pill>
          <Text style={{ textAlign: "center", fontSize: 12.5, color: t.colors.ink3 }}>Your first story takes about a minute.</Text>
        </>
      ) : null}

      {draft.step === "story" ? (
        <>
          <FlowHeader stage={1} onBack={goBack} />
          <View style={{ paddingVertical: 24 }}>
            <Serif style={{ fontSize: 37, lineHeight: 40, color: t.colors.ink }}>What do you want{"\n"}to talk about first?</Serif>
            <Text style={{ marginTop: 12, fontSize: 16, color: t.colors.ink2 }}>Choose something from your real life.</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {STORIES.map((story, index) => <StoryCard key={story} title={story} selected={selectedStory === story} onPress={() => selectStory(story)} tone={["sky", "soft", "soft", "sky", "sky", "soft"][index]} />)}
          </View>
          {selectedStory === "Write my own" ? (
            <TextInput value={customStory} onChangeText={setCustomStory} placeholder="Name your story" placeholderTextColor={t.colors.ink3} autoFocus style={[styles.input, { color: t.colors.ink, backgroundColor: t.colors.card, borderColor: t.ring }]} />
          ) : null}
          <View style={{ flex: 1 }} />
          <Pill full onPress={continueFromStory}>Continue</Pill>
        </>
      ) : null}

      {draft.step === "notes" ? (
        <>
          <FlowHeader stage={2} onBack={goBack} />
          <View style={{ paddingTop: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.7, color: t.colors.accD }}>{storyTitleUpper}</Text>
            <Serif style={{ marginTop: 20, fontSize: 38, lineHeight: 42, color: t.colors.ink }}>Start with the{"\n"}messy version.</Serif>
            <Text style={{ marginTop: 12, fontSize: 16, color: t.colors.ink2 }}>Korean, English, keywords — all fine.</Text>
          </View>
          <TextInput
            value={draft.notes}
            onChangeText={(notes) => persist({ notes })}
            placeholder={"영어 학습 앱을 만들고 있음\nPeople know English but can’t use it\n말문이 막히는 순간을 돕고 싶음"}
            placeholderTextColor={t.colors.ink3}
            multiline
            textAlignVertical="top"
            style={[styles.notes, { color: t.colors.ink, backgroundColor: t.colors.card, borderColor: t.ring }]}
          />
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: t.colors.ink3 }}>Saylo won’t write your answer. It will help you find its shape.</Text>
          <View style={{ flex: 1 }} />
          <Pill full onPress={shapeStory}>Shape my story</Pill>
        </>
      ) : null}

      {draft.step === "beats" ? (
        <>
          <FlowHeader stage={2} onBack={goBack} />
          <View style={{ paddingTop: 22 }}>
            <Serif style={{ fontSize: 38, lineHeight: 42, color: t.colors.ink }}>Your story has{"\n"}a shape.</Serif>
            <Text style={{ marginTop: 12, fontSize: 16, color: t.colors.ink2 }}>Edit anything. This is still yours.</Text>
          </View>
          <Card style={{ marginTop: 8 }}>
            <Text style={{ marginBottom: 10, fontSize: 12, fontWeight: "800", letterSpacing: 0.7, color: t.colors.accD }}>{storyTitleUpper}</Text>
            {draft.beats.map((beat, index) => (
              <View key={index} style={{ minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: index === draft.beats.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.colors.sep }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.accS }}><Text style={{ fontSize: 16, fontWeight: "800", color: t.colors.accD }}>{index + 1}</Text></View>
                <TextInput value={beat} onChangeText={(value) => persist({ beats: draft.beats.map((item, itemIndex) => itemIndex === index ? value : item) })} multiline style={{ flex: 1, paddingVertical: 11, fontSize: 15, lineHeight: 20, fontWeight: "600", color: t.colors.ink }} />
                <Icon name="pen" s={17} c={t.colors.ink3} />
              </View>
            ))}
          </Card>
          <View style={{ flex: 1 }} />
          <Pill full onPress={keepBeats}>Looks right</Pill>
        </>
      ) : null}

      {draft.step === "phrase" ? (
        <>
          <FlowHeader stage={3} onBack={goBack} />
          <View style={{ paddingTop: 22 }}>
            <Serif style={{ fontSize: 38, lineHeight: 42, color: t.colors.ink }}>One phrase to{"\n"}take with you.</Serif>
            <Text style={{ marginTop: 12, fontSize: 16, color: t.colors.ink2 }}>Use it when you introduce your goal.</Text>
          </View>
          <Block tone="sky" style={{ minHeight: 232, justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.7, color: t.colors.accD }}>YOUR FIRST PHRASE</Text>
            <Serif style={{ fontSize: 37, lineHeight: 42, color: t.colors.ink }}>{draft.phrase}</Serif>
            <View style={{ alignSelf: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}><Icon name="mic" s={29} c="#fff" /></View>
          </Block>
          <Card><Text style={{ fontSize: 17, lineHeight: 24, color: t.colors.ink }}>{draft.phraseExample}</Text></Card>
          <View style={{ flex: 1 }} />
          <Pill full onPress={startTalk}>Try saying it</Pill>
        </>
      ) : null}

      {draft.step === "keep" ? (
        <>
          <View style={{ paddingTop: 22 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.7, color: t.colors.accD }}>✦  YOUR FIRST STORY</Text>
            <Serif style={{ marginTop: 22, fontSize: 40, lineHeight: 44, color: t.colors.ink }}>You have{"\n"}something to say.</Serif>
            <Text style={{ marginTop: 13, fontSize: 16, color: t.colors.ink2 }}>You spoke for {spokenSeconds} seconds.</Text>
          </View>
          <Card style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 19, fontWeight: "800", color: t.colors.ink }}>{draft.storyTitle}</Text>
            <Text style={{ marginTop: 7, fontSize: 13.5, color: t.colors.ink2 }}>{draft.beats.length} beats · 1 useful phrase</Text>
            <Block tone="sky" style={{ marginTop: 16 }}><Serif style={{ fontSize: 29, lineHeight: 34, color: t.colors.ink }}>{draft.phrase}</Serif></Block>
            {draft.transcript ? <Text style={{ marginTop: 15, fontSize: 14, lineHeight: 21, color: t.colors.ink2 }} numberOfLines={4}>{draft.transcript}</Text> : null}
          </Card>
          {!draft.transcript ? (
            <Pressable onPress={retryTalk} style={{ alignItems: "center", paddingVertical: 6 }}><Text style={{ fontSize: 14, fontWeight: "700", color: t.colors.accD }}>Speech wasn’t captured — try again</Text></Pressable>
          ) : null}
          <View style={{ flex: 1 }} />
          <View style={[styles.keepSheet, { backgroundColor: t.colors.card, borderColor: t.ring }]}>
            <Serif style={{ fontSize: 31, textAlign: "center", color: t.colors.ink }}>Keep this story.</Serif>
            <Text style={{ marginTop: 8, marginBottom: 18, textAlign: "center", fontSize: 14, color: t.colors.ink2 }}>{signedIn ? "Add it to your speaking world." : "Save it safely and continue on any device."}</Text>
            {draft.transcript.trim() ? (
              <Pill full onPress={finishFlow}>{signedIn ? "Add to my world" : "Sign in to keep it"}</Pill>
            ) : (
              <Pill full onPress={retryTalk}>Try speaking again</Pill>
            )}
            {!signedIn ? <Text style={{ marginTop: 11, textAlign: "center", fontSize: 12.5, color: t.colors.ink3 }}>Use your Saylo email account</Text> : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  roundButton: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 54, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, fontSize: 16 },
  notes: { minHeight: 244, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 19, fontSize: 16, lineHeight: 29 },
  talkSideButton: { width: 66, alignItems: "center", gap: 7 },
  talkSideLabel: { color: "#fff", fontSize: 12, fontWeight: "600" },
  keepSheet: { borderRadius: 28, borderWidth: StyleSheet.hairlineWidth, padding: 20 },
});
