import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { TalkFeedbackDetail } from "@/components/talk-feedback-detail";
import { prepareSpeakerPlayback, registerPlaybackStopper } from "@/lib/audio-session";
import { fetchSessionPhraseMemory, type SessionPhraseLink, type SessionRecommendation } from "@/lib/phrases";
import { deleteTalkSessionAudio, talkAudioUri } from "@/lib/talk-audio";
import { fetchTalkFeedbackById, type TalkFeedbackRecord } from "@/lib/talk-feedback";
import { TALK_FOCUS_LABEL, type TalkFocus } from "@/lib/talk-focus";
import { deleteAttempt, fetchAttempts, type Attempt } from "@/lib/studio-model";
import { useTheme } from "@/design/theme";
import { BackBar, Card, ExpandableCopy, Header, Icon, Pill, Screen, Serif, Stagger, SwipeRow, confirmDelete } from "@/design/ui";
import type { Nav } from "./nav";

function Loading() {
  const t = useTheme();
  return <View style={{ paddingVertical: 48, alignItems: "center" }}><ActivityIndicator color={t.colors.acc} /></View>;
}

function ErrorCard({ message, retry }: { message: string; retry: () => void }) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 26 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Couldn’t load this</Text>
      <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 6, textAlign: "center", lineHeight: 19 }}>{message}</Text>
      <Pill tone="tint" small onPress={retry} style={{ marginTop: 14 }}>Retry</Pill>
    </Card>
  );
}

function formatDuration(seconds: number | null): string {
  const value = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function relativeTime(iso: string): string {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function AttemptRow({ attempt, onOpen, onDelete }: { attempt: Attempt; onOpen: () => void; onDelete: () => void }) {
  const t = useTheme();
  return (
    <SwipeRow onDelete={() => confirmDelete({
      title: "Delete this attempt?",
      message: "This speaking attempt and its transcript will be removed.",
      deleteLabel: "Delete",
      onConfirm: onDelete,
    })}>
      <Card onPress={onOpen} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ alignItems: "center", gap: 3, width: 44 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic" s={17} c={t.colors.accD} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: "700", color: t.colors.accD }}>{formatDuration(attempt.durationSeconds)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 14.5, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>{attempt.situationTitle ?? "Free talk"}</Text>
            <Text style={{ fontSize: 12, color: t.colors.ink3 }}>{relativeTime(attempt.createdAt)}</Text>
          </View>
          <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 3, lineHeight: 19 }} numberOfLines={2}>
            {attempt.transcript?.trim() || "No words were captured."}
          </Text>
        </View>
        <Icon name="chev" s={14} c={t.colors.ink3} w={2.2} />
      </Card>
    </SwipeRow>
  );
}

export function AttemptsScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setAttempts(await fetchAttempts()); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load your attempts."); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const remove = useCallback(async (id: string) => {
    const previous = attempts;
    setAttempts((items) => (items ?? []).filter((item) => item.id !== id));
    try { await deleteAttempt(id); nav.invalidateSpeakingData(); }
    catch (caught) {
      setAttempts(previous);
      Alert.alert("Couldn’t delete", caught instanceof Error ? caught.message : "Try again.");
    }
  }, [attempts, nav]);

  return (
    <Screen>
      <BackBar onBack={nav.pop} />
      <Stagger><Header title={<Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>Your attempts</Serif>} sub="Every time you practice out loud." /></Stagger>
      {attempts === null && !error ? <Loading /> : error ? <ErrorCard message={error} retry={load} /> : (attempts ?? []).length === 0 ? (
        <Card style={{ alignItems: "center", paddingVertical: 30 }}>
          <Icon name="mic" s={20} c={t.colors.accD} />
          <Serif style={{ fontSize: 20, color: t.colors.ink, marginTop: 14 }}>No attempts yet</Serif>
          <Pill icon="mic" onPress={() => nav.startTalk({ ctx: "Free talk", from: "topics" })} style={{ marginTop: 16 }}>Start talking</Pill>
        </Card>
      ) : (
        <Stagger startIndex={1}>{(attempts ?? []).map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} onOpen={() => nav.push("attempt", { attempt })} onDelete={() => void remove(attempt.id)} />)}</Stagger>
      )}
    </Screen>
  );
}

function AttemptSection({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return <View style={{ gap: t.gap }}><Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.5, color: t.colors.ink3, paddingHorizontal: 2 }}>{label}</Text>{children}</View>;
}

export function AttemptDetailScreen({ attempt, nav }: { attempt?: Attempt; nav: Nav }) {
  const t = useTheme();
  const [recordingDeleted, setRecordingDeleted] = useState(false);
  const [memory, setMemory] = useState<{ used: SessionPhraseLink[]; recommended: SessionRecommendation[] } | null>(null);
  const audioUri = attempt && !recordingDeleted ? talkAudioUri(attempt.audioKey) : null;
  const player = useAudioPlayer(audioUri, { keepAudioSessionActive: true });
  const status = useAudioPlayerStatus(player);

  useEffect(() => registerPlaybackStopper(() => { try { player.pause(); } catch {} }), [player]);
  useEffect(() => {
    if (!attempt?.id) return;
    let active = true;
    fetchSessionPhraseMemory(attempt.id).then((result) => { if (active) setMemory(result); }).catch(() => { if (active) setMemory({ used: [], recommended: [] }); });
    return () => { active = false; };
  }, [attempt?.id]);

  if (!attempt) return <Screen><BackBar onBack={nav.pop} /><ErrorCard message="This attempt couldn’t be opened." retry={nav.pop} /></Screen>;

  const togglePlayback = async () => {
    if (status.playing) { player.pause(); return; }
    if (status.duration > 0 && status.currentTime >= status.duration) player.seekTo(0);
    await prepareSpeakerPlayback();
    player.play();
  };

  return (
    <Screen>
      <BackBar title={attempt.situationTitle ?? "Free talk"} onBack={nav.pop} />
      <Stagger>
        <Text style={{ fontSize: 13, color: t.colors.ink3 }}>{formatDuration(attempt.durationSeconds)} · {relativeTime(attempt.createdAt)}</Text>
        {audioUri ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={togglePlayback} style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
              <Icon name={status.playing ? "pause" : "play"} s={22} c={t.colors.onAcc} />
            </Pressable>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>Your recording</Text><Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 2 }}>Saved on this device</Text></View>
            <Pill tone="tint" small onPress={() => confirmDelete({ title: "Delete this recording?", message: "The audio will be removed from your device.", deleteLabel: "Delete", onConfirm: async () => { player.pause(); await deleteTalkSessionAudio(attempt.id, attempt.audioKey); setRecordingDeleted(true); } })}>Delete</Pill>
          </Card>
        ) : null}
        <AttemptSection label="WHAT YOU SAID"><Card><ExpandableCopy text={attempt.transcript ?? ""} style={{ fontSize: 16, lineHeight: 25 }} /></Card></AttemptSection>
        {memory?.used.length ? <AttemptSection label="PHRASES YOU USED">{memory.used.map((item) => <Card key={item.id}><Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{item.text}</Text></Card>)}</AttemptSection> : null}
        {memory?.recommended.length ? <AttemptSection label="RECOMMENDED FOR THIS ATTEMPT">{memory.recommended.map((item) => item.kind === "phrase" ? (
          <Card key={`phrase-${item.phraseItemId}`} onPress={() => nav.push("phrase", { id: item.phraseItemId })}><Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{item.text}</Text></Card>
        ) : (
          <Card key={`feedback-${item.feedbackId}`} onPress={() => nav.push("coachingFeedback", { id: item.feedbackId })}><Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{item.text}</Text></Card>
        ))}</AttemptSection> : null}
        <Pill full icon="mic" onPress={() => nav.startTalk({ ctx: attempt.situationTitle ?? "Free talk", situationId: attempt.situationId, from: "topics" })}>Talk again</Pill>
      </Stagger>
    </Screen>
  );
}

export function CoachingFeedbackScreen({ feedbackId, nav }: { feedbackId?: string; nav: Nav }) {
  const [record, setRecord] = useState<TalkFeedbackRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!feedbackId) { setRecord(null); return; }
    try { setRecord(await fetchTalkFeedbackById(feedbackId)); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load this feedback."); }
  }, [feedbackId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const focusLabel = record?.focus && record.focus in TALK_FOCUS_LABEL ? TALK_FOCUS_LABEL[record.focus as TalkFocus] : null;
  return (
    <Screen bottomPad={40}>
      <BackBar title={record?.momentLabel ?? "Feedback"} onBack={nav.pop} />
      {record === undefined && !error ? <Loading /> : error ? <ErrorCard message={error} retry={load} /> : record ? (
        <TalkFeedbackDetail badge={focusLabel ? `Focus · ${focusLabel}` : null} said={record.said} want={record.want} diagnosisTag={record.diagnosisTag} action={record.action} explanation={record.explanation} why={record.why} />
      ) : <ErrorCard message="This feedback could not be found." retry={nav.pop} />}
    </Screen>
  );
}
