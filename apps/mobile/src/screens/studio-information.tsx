// studio-information.tsx — Topic → Situation → Speaking Note → Practice
// Attempt. Uses the existing Saylo visual system and native tab shell; it does
// not render or style the bottom navigation bar.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { IconName } from "@/design/icon";
import { hairline, useTheme } from "@/design/theme";
import { AnimatedPressable, Avatar, BackBar, Card, Chip, EnterStagger, Icon, Pill, Screen, Sect, Serif, Stagger, usePressFx } from "@/design/ui";
import {
  createQuickNote,
  createStudioSituation,
  fetchNotePhrases,
  fetchPracticeAttempts,
  fetchSituationPhrases,
  fetchSpeakingNote,
  fetchSpeakingNotes,
  fetchStudioOverview,
  fetchStudioSituations,
  fetchStudioTopics,
  linkPhraseToNote,
  pickCurrentNote,
  setSituationEventDate,
  phraseChoices,
  quickTitleFromBody,
  unlinkPhraseFromNote,
  updateSpeakingNote,
  type NotePhrase,
  type PracticeAttempt,
  type QuickNoteInput,
  type SpeakingNote,
  type StudioOverview,
  type StudioSituation,
  type StudioTopic,
} from "@/lib/studio-information";
import type { PhraseItem } from "@/lib/phrases";
import type { Nav } from "./nav";

function Loading() {
  const t = useTheme();
  return <ActivityIndicator color={t.colors.acc} style={{ paddingVertical: 42 }} />;
}

function ErrorCard({ message, retry }: { message: string; retry: () => void }) {
  const t = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 24 }}>
      <Text style={{ color: t.colors.ink, fontWeight: "700", fontSize: 15 }}>Couldn’t load this</Text>
      <Text style={{ color: t.colors.ink3, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 }}>{message}</Text>
      <Pill tone="tint" small onPress={retry} style={{ marginTop: 14 }}>Retry</Pill>
    </Card>
  );
}

function Meta({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 12.5, color: t.colors.ink3, fontWeight: "600" }}>{children}</Text>;
}

function noteMeta(note: SpeakingNote): string {
  const parts = [note.situationTitle ?? note.topicName ?? "Unsorted"];
  if (note.phraseCount) parts.push(`${note.phraseCount} phrase${note.phraseCount === 1 ? "" : "s"}`);
  if (note.attemptCount) parts.push(`${note.attemptCount} attempt${note.attemptCount === 1 ? "" : "s"}`);
  return parts.join("  ·  ");
}

// Home list row. The old row spent 78pt and a rotating decorative icon on no
// information; this one is 64pt and carries where the note lives plus its
// phrase/attempt counts, so five notes fit where three did.
function StudioNoteRow({ note, onPress }: { note: SpeakingNote; onPress: () => void }) {
  const t = useTheme();
  const unsorted = !note.situationId;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${note.title}. ${noteMeta(note)}${unsorted ? ". Unsorted" : ""}`}
      style={({ pressed }) => ({
        minHeight: 64,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.sep,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {unsorted ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.acc }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>{note.title}</Text>
        <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 3 }} numberOfLines={1}>{noteMeta(note)}</Text>
      </View>
      <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />
    </Pressable>
  );
}

function NoteRow({ note, onPress }: { note: SpeakingNote; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 70,
        paddingVertical: 12,
        paddingHorizontal: 2,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.sep,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>{note.title}</Text>
        <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 4 }} numberOfLines={1}>
          {note.situationTitle ?? "Unsorted"}{note.goal ? ` · ${note.goal}` : ""}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
          <Meta>{note.phraseCount} phrases</Meta>
          <Meta>{note.attemptCount} attempts</Meta>
        </View>
      </View>
      <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />
    </Pressable>
  );
}

// stories.event_date is a DATE, so it arrives as "2026-09-18". `new Date()`
// reads a bare date as UTC midnight, which renders as the previous day in any
// timezone behind UTC. Pin it to local midnight instead.
function parseCalendarDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

function situationDate(value: string | null): string | null {
  if (!value) return null;
  const date = parseCalendarDate(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
}

// Three fixed-width tiles truncated every title and carried no counts, so they
// gave nothing to choose on. A row fits the full title plus notes/attempts and
// the event date when the situation has one.
function StudioSituationRow({ situation, first, onPress }: { situation: StudioSituation; first?: boolean; onPress: () => void }) {
  const t = useTheme();
  const when = situationDate(situation.eventDate);
  const meta = `${situation.noteCount} note${situation.noteCount === 1 ? "" : "s"}  ·  ${situation.attemptCount} attempt${situation.attemptCount === 1 ? "" : "s"}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${situation.title}. ${meta}${when ? `. ${when}` : ""}`}
      style={({ pressed }) => ({
        minHeight: 62,
        paddingVertical: 11,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.colors.sep,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
        <Icon name="calendar" s={18} c={t.colors.accD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>{situation.title}</Text>
        <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 2 }} numberOfLines={1}>{meta}</Text>
      </View>
      {when ? <Text style={{ fontSize: 12.5, fontWeight: "700", color: t.colors.ink3 }}>{when}</Text> : null}
      <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />
    </Pressable>
  );
}

// Browse rows re-open the views that lost their entry point when the old
// Speaking World home was removed: the stats dashboard, the attempts list, and
// the Topic screen. PRD: organizing/browsing paths sit below the practice zone.
function BrowseRow({ icon, label, caption, first, onPress }: { icon: IconName; label: string; caption: string; first?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${caption}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 58,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.colors.sep,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} s={18} c={t.colors.accD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }}>{label}</Text>
        <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 2 }} numberOfLines={1}>{caption}</Text>
      </View>
      <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />
    </Pressable>
  );
}

function SituationRow({ situation, onPress }: { situation: StudioSituation; onPress: () => void }) {
  const t = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 13 }}>
      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
        <Icon name="calendar" s={19} c={t.colors.accD} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15.5, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>{situation.title}</Text>
        <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 4 }}>
          {situation.noteCount} notes · {situation.attemptCount} attempts
        </Text>
      </View>
      <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />
    </Card>
  );
}

function StudioSectionHeader({ title, action, onAction, chevron = true, style }: { title: string; action?: string; onAction?: () => void; chevron?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ minHeight: 32, paddingHorizontal: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, style]}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: t.colors.ink }}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>{action}</Text>
          {chevron ? <Icon name="chev" s={14} w={2.2} c={t.colors.accD} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function startNotePractice(nav: Nav, note: SpeakingNote) {
  nav.startTalk({
    ctx: note.title,
    sub: note.goal || note.situationTitle,
    prompt: note.body || note.goal || null,
    from: "topics",
    storyId: note.situationId,
    messageId: note.id,
    // Close the loop: ending the attempt lands back on this note with the new
    // attempt open, so the next try starts from the repair you just read.
    returnTo: { tab: "topics", stack: [{ name: "speakingNote", props: { id: note.id, justPracticed: true } }] },
  });
}

function Sheet({
  open,
  title,
  subtitle,
  eyebrow,
  showClose = false,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  showClose?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(20,22,28,0.42)" }}
        />
        <KeyboardAvoidingView
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View
            style={{
              maxHeight: "92%",
              backgroundColor: t.colors.bg,
              borderTopLeftRadius: 38,
              borderTopRightRadius: 38,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 18),
              overflow: "hidden",
            }}
          >
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: t.colors.ink3, alignSelf: "center", marginBottom: eyebrow ? 7 : 14 }} />
            <View style={{ paddingHorizontal: 22, paddingBottom: eyebrow ? 17 : 12 }}>
              {eyebrow ? (
                <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 1.45, color: t.colors.accD }}>{eyebrow}</Text>
                  {showClose ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Close quick capture"
                      onPress={onClose}
                      hitSlop={8}
                      style={({ pressed }) => ({
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: t.colors.card,
                        borderWidth: 1,
                        borderColor: t.ring,
                        opacity: pressed ? 0.62 : 1,
                      })}
                    >
                      <Icon name="x" s={19} w={2.1} c={t.colors.ink2} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <Serif style={{ fontSize: eyebrow ? 34 : 24, lineHeight: eyebrow ? 39 : undefined, color: t.colors.ink, marginTop: eyebrow ? 3 : 0 }}>{title}</Serif>
              {subtitle ? <Text style={{ fontSize: 13.5, color: t.colors.ink3, marginTop: 4, lineHeight: 19 }}>{subtitle}</Text> : null}
            </View>
            <View style={{ flexShrink: 1 }}>{children}</View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline, onBlur }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; onBlur?: () => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: t.colors.ink3 }}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={t.colors.ink3}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 104 : 50,
          borderRadius: 17,
          backgroundColor: t.colors.card,
          borderWidth: 1,
          borderColor: t.ring,
          color: t.colors.ink,
          fontSize: 15.5,
          lineHeight: 22,
          paddingHorizontal: 15,
          paddingVertical: multiline ? 13 : 10,
        }}
      />
    </View>
  );
}

interface QuickNoteSheetProps {
  open: boolean;
  nav: Nav;
  topics: StudioTopic[];
  situations: StudioSituation[];
  initialTopicId?: string | null;
  initialSituationId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function QuickNoteSheet({ open, nav, topics, situations, initialTopicId, initialSituationId, onClose, onSaved }: QuickNoteSheetProps) {
  const t = useTheme();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topicId, setTopicId] = useState<string | null>(initialTopicId ?? topics[0]?.id ?? null);
  const [situationId, setSituationId] = useState<string | null>(initialSituationId ?? null);
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [phraseIds, setPhraseIds] = useState<string[]>([]);
  const [chooser, setChooser] = useState<"situation" | "phrases" | null>(null);
  const [saving, setSaving] = useState<"practice" | "later" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initialSituation = situations.find((item) => item.id === initialSituationId);
    const timer = setTimeout(() => {
      setTopicId(initialTopicId ?? initialSituation?.topicId ?? topics[0]?.id ?? null);
      setSituationId(initialSituationId ?? null);
      setChooser(null);
    }, 0);
    phraseChoices().then((items) => setPhrases(items.slice(0, 20))).catch(() => setPhrases([]));
    return () => clearTimeout(timer);
  }, [open, initialTopicId, initialSituationId, situations, topics]);

  const availableSituations = situations.filter((item) => item.topicId === topicId);
  const selectedSituation = situations.find((item) => item.id === situationId);
  const selectedTopic = topics.find((item) => item.id === topicId);
  const situationLabel = selectedSituation?.title ?? (selectedTopic ? `Unsorted · ${selectedTopic.name}` : "Choose a situation");
  const resetAndClose = () => {
    if (saving) return;
    setTitle("");
    setBody("");
    setPhraseIds([]);
    setChooser(null);
    setError(null);
    onClose();
  };
  const save = async (mode: "practice" | "later") => {
    const resolvedTitle = title.trim() || quickTitleFromBody(body);
    const resolvedGoal = quickTitleFromBody(body);
    if (!resolvedTitle || !body.trim() || !resolvedGoal || !topicId) {
      setError("Add what you want to say and choose a topic before saving.");
      return;
    }
    setSaving(mode);
    setError(null);
    const input: QuickNoteInput = { title: resolvedTitle, body, goal: resolvedGoal, topicId, situationId, phraseIds };
    try {
      const noteId = await createQuickNote(input);
      const situation = situations.find((item) => item.id === situationId);
      const topic = topics.find((item) => item.id === topicId);
      const note: SpeakingNote = {
        id: noteId,
        topicId,
        topicName: topic?.name ?? null,
        situationId,
        situationTitle: situation?.title ?? null,
        title: resolvedTitle,
        goal: resolvedGoal,
        body: body.trim(),
        status: situationId ? "active" : "unsorted",
        phraseCount: phraseIds.length,
        attemptCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTitle(""); setBody(""); setPhraseIds([]); setChooser(null);
      onClose();
      nav.invalidateSpeakingData();
      onSaved();
      if (mode === "practice") startNotePractice(nav, note);
      else nav.push("speakingNote", { id: noteId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t save this note.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Sheet open={open} eyebrow="QUICK CAPTURE" title="New speaking note" showClose onClose={resetAndClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 10, gap: 18 }}
      >
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="Explain an unexpected result" />

        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: t.colors.ink3 }}>WHAT DO YOU WANT TO SAY?</Text>
          <View style={{ minHeight: 154, borderRadius: 17, backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.ring, paddingBottom: 58 }}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write a thought, question, or rough idea..."
              placeholderTextColor={t.colors.ink3}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 94, color: t.colors.ink, fontSize: 15.5, lineHeight: 22, paddingHorizontal: 15, paddingTop: 13, paddingBottom: 8 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Speak instead"
              onPress={saving ? undefined : () => { resetAndClose(); nav.startTalk({ ctx: selectedSituation?.title ?? selectedTopic?.name ?? "Free talk", from: "topics" }); }}
              style={({ pressed }) => ({
                position: "absolute",
                left: 14,
                bottom: 12,
                height: 40,
                borderRadius: 999,
                paddingHorizontal: 15,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                backgroundColor: t.colors.card,
                borderWidth: 1,
                borderColor: t.colors.sep,
                opacity: pressed ? 0.62 : 1,
              })}
            >
              <Icon name="mic" s={17} w={2} c={t.colors.accD} />
              <Text style={{ fontSize: 14.5, fontWeight: "600", color: t.colors.accD }}>Speak instead</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: t.colors.sep }} />

        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: t.colors.ink3 }}>SITUATION</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose situation, currently ${situationLabel}`}
            onPress={() => setChooser((current) => current === "situation" ? null : "situation")}
            style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.62 : 1 })}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
              <Icon name="flask" s={20} w={1.9} c={t.colors.accD} />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: t.colors.ink }} numberOfLines={1}>{situationLabel}</Text>
            <Icon name="chev" s={14} w={2.2} c={t.colors.ink2} />
          </Pressable>
          {chooser === "situation" ? (
            <View style={{ borderRadius: 20, backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.ring, padding: 14, gap: 12 }}>
              <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 0.5, color: t.colors.ink3 }}>TOPIC</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {topics.map((topic) => <Chip key={topic.id} active={topic.id === topicId} onPress={() => { setTopicId(topic.id); setSituationId(null); }}>{topic.name}</Chip>)}
              </ScrollView>
              <Text style={{ fontSize: 11.5, fontWeight: "800", letterSpacing: 0.5, color: t.colors.ink3 }}>SITUATION</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Chip active={situationId === null} onPress={() => { setSituationId(null); setChooser(null); }}>Unsorted</Chip>
                {availableSituations.map((situation) => (
                  <Chip key={situation.id} active={situation.id === situationId} onPress={() => { setSituationId(situation.id); setTopicId(situation.topicId); setChooser(null); }}>{situation.title}</Chip>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: t.colors.ink3 }}>LINKED PHRASES</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose linked phrases"
            onPress={() => setChooser((current) => current === "phrases" ? null : "phrases")}
            style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.62 : 1 })}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: t.colors.accS, alignItems: "center", justifyContent: "center" }}>
              <Icon name="link" s={20} w={1.9} c={t.colors.accD} />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: t.colors.accD }}>{phraseIds.length ? `${phraseIds.length} linked phrases` : "+ Add phrases"}</Text>
            <Icon name="chev" s={14} w={2.2} c={t.colors.ink2} />
          </Pressable>
          {chooser === "phrases" ? (
            <View style={{ borderRadius: 20, backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.ring, padding: 14 }}>
              {phrases.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {phrases.slice(0, 10).map((phrase) => (
                    <Chip
                      key={phrase.id}
                      active={phraseIds.includes(phrase.id)}
                      onPress={() => setPhraseIds((current) => current.includes(phrase.id) ? current.filter((id) => id !== phrase.id) : [...current, phrase.id])}
                    >
                      {phrase.text}
                    </Chip>
                  ))}
                </View>
              ) : <Text style={{ fontSize: 13.5, lineHeight: 19, color: t.colors.ink3 }}>Saved phrases will appear here.</Text>}
            </View>
          ) : null}
        </View>

        {error ? <Text style={{ color: "#E5484D", fontSize: 13.5, lineHeight: 19 }}>{error}</Text> : null}
        <Text style={{ fontSize: 13, lineHeight: 19, textAlign: "center", color: t.colors.ink2 }}>Capture it now. You can organize it later.</Text>
        <Pill full icon="mic" onPress={saving ? undefined : () => void save("practice")}>{saving === "practice" ? "Saving…" : "Save & practice"}</Pill>
        <Pill tone="ghost" full onPress={saving ? undefined : () => void save("later")}>{saving === "later" ? "Saving…" : "Save for later"}</Pill>
      </ScrollView>
    </Sheet>
  );
}

export function StudioHomeScreen({ nav }: { nav: Nav }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const quickFx = usePressFx(0.92);
  const [data, setData] = useState<StudioOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAllSituations, setShowAllSituations] = useState(false);
  const load = useCallback(async () => {
    try { setData(await fetchStudioOverview()); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load your Studio."); }
  }, []);
  const revision = nav.speakingDataRevision;
  useFocusEffect(useCallback(() => { if (revision >= 0) void load(); }, [load, revision]));

  const current = data ? pickCurrentNote(data.notes, data.recentAttempts) : null;
  const visibleNotes = (data?.notes ?? []).slice(0, showAllNotes ? 8 : 5);
  const visibleSituations = (data?.situations ?? []).slice(0, showAllSituations ? 8 : 3);
  const fabBottom = Math.max(insets.bottom, 12) + 12;
  return (
    <>
      <Screen style={{ gap: 0 }} bottomPad={112}>
        <View style={{ paddingHorizontal: 2, paddingTop: 4, paddingBottom: t.gap * 2 }}>
          <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 1.5, color: t.colors.accD }}>YOUR STUDIO</Text>
            <Avatar onPress={() => nav.push("settings")} />
          </View>
          <Serif style={{ fontSize: 34, lineHeight: 38, color: t.colors.ink, marginTop: 11 }}>Ready to speak?</Serif>
        </View>
        {data === null && !error ? <Loading /> : error ? <ErrorCard message={error} retry={load} /> : (
          <>
            <EnterStagger i={0} style={{ gap: 10 }}>
              <StudioSectionHeader title="Continue practicing" />
              {current ? (
                <Card lg style={{ padding: t.padc + 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.7, color: t.colors.accD }} numberOfLines={1}>
                    {[current.topicName, current.situationTitle].filter(Boolean).join("  ·  ").toUpperCase() || "SPEAKING NOTE"}
                  </Text>
                  <Serif style={{ fontSize: 27, lineHeight: 32, color: t.colors.ink, marginTop: 12 }}>{current.title}</Serif>
                  {current.goal ? <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 6 }}>{current.goal}</Text> : null}
                  <View style={{ height: 1, backgroundColor: t.colors.sep, marginTop: 17 }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <Icon name="bank" s={17} c={t.colors.accD} />
                      <Meta>{current.phraseCount} linked phrases</Meta>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <Icon name="wave2" s={17} c={t.colors.accD} />
                      <Meta>{current.attemptCount} attempts</Meta>
                    </View>
                  </View>
                  <Pill full icon="mic" onPress={() => startNotePractice(nav, current)} style={{ marginTop: 18 }}>Start practice</Pill>
                </Card>
              ) : (
                <Card lg style={{ padding: t.padc + 2 }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.7, color: t.colors.accD }}>YOUR NEXT THOUGHT</Text>
                  <Serif style={{ fontSize: 27, lineHeight: 32, color: t.colors.ink, marginTop: 12 }}>What do you need to say?</Serif>
                  <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2, marginTop: 7 }}>Capture one idea, then practice it in your own voice.</Text>
                  <Pill full icon="plus" onPress={() => setQuickOpen(true)} style={{ marginTop: 18 }}>Create a speaking note</Pill>
                </Card>
              )}
            </EnterStagger>

            <EnterStagger i={1} style={{ gap: 9, marginTop: t.gap * 3 }}>
              <StudioSectionHeader
                title="Recent notes"
                action={(data?.notes.length ?? 0) > 5 ? (showAllNotes ? "Show less" : "See all") : undefined}
                onAction={() => setShowAllNotes((value) => !value)}
              />
              <View>
                {visibleNotes.map((note) => <StudioNoteRow key={note.id} note={note} onPress={() => nav.push("speakingNote", { id: note.id })} />)}
                {!data?.notes.length ? <Text style={{ color: t.colors.ink3, fontSize: 13.5, lineHeight: 20, textAlign: "center", paddingVertical: 28 }}>Your notes will stay easy to scan here.</Text> : null}
              </View>
            </EnterStagger>

            <EnterStagger i={2} style={{ gap: 9, marginTop: t.gap * 3 }}>
              <StudioSectionHeader
                title="Your situations"
                action={(data?.situations.length ?? 0) > 3 ? (showAllSituations ? "Show less" : "See all") : "All"}
                onAction={() => ((data?.situations.length ?? 0) > 3 ? setShowAllSituations((value) => !value) : nav.push("topicsList"))}
              />
              {visibleSituations.length ? (
                <Card style={{ paddingVertical: 2 }}>
                  {visibleSituations.map((situation, index) => (
                    <StudioSituationRow
                      key={situation.id}
                      situation={situation}
                      first={index === 0}
                      onPress={() => nav.push("situation", { id: situation.id, topicId: situation.topicId, title: situation.title })}
                    />
                  ))}
                </Card>
              ) : (
                <Card onPress={() => nav.push("topicsList")} style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                  <Icon name="map" s={22} c={t.colors.accD} />
                  <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "700", color: t.colors.ink }}>Create your first situation</Text>
                  <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />
                </Card>
              )}
            </EnterStagger>

            <EnterStagger i={3} style={{ gap: 9, marginTop: t.gap * 3 }}>
              <StudioSectionHeader title="Browse" />
              <Card style={{ paddingVertical: 2 }}>
                <BrowseRow
                  first
                  icon="map"
                  label="Topics"
                  caption={`${data?.topics.length ?? 0} topics · organize situations and notes`}
                  onPress={() => nav.push("topicsList")}
                />
                <BrowseRow
                  icon="wave2"
                  label="All attempts"
                  caption="Every practice recording you have made"
                  onPress={() => nav.push("sessionsList")}
                />
                <BrowseRow
                  icon="gauge"
                  label="Speaking stats"
                  caption="Time spoken, weekly goal, phrase progress"
                  onPress={() => nav.push("studio")}
                />
              </Card>
            </EnterStagger>

          </>
        )}
      </Screen>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Create a quick speaking note"
        onPress={() => setQuickOpen(true)}
        onPressIn={quickFx.pressIn}
        onPressOut={quickFx.pressOut}
        style={[
          {
            position: "absolute",
            right: 18,
            bottom: fabBottom,
            zIndex: 50,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          },
          { transform: [{ scale: quickFx.scale }] },
        ]}
      >
        <View style={[{ minHeight: 36, borderRadius: 999, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.ring }, t.shadowCard]}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: t.colors.accD }}>Quick note</Text>
        </View>
        <View style={[{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }, t.shadowLg]}>
          <Icon name="plus" s={24} w={2.4} c="#fff" />
        </View>
      </AnimatedPressable>
      <QuickNoteSheet open={quickOpen} nav={nav} topics={data?.topics ?? []} situations={data?.situations ?? []} onClose={() => setQuickOpen(false)} onSaved={() => void load()} />
    </>
  );
}

export function StudioTopicScreen({ id, name, nav }: { id: string; name?: string; nav: Nav }) {
  const t = useTheme();
  const [topics, setTopics] = useState<StudioTopic[]>([]);
  const [situations, setSituations] = useState<StudioSituation[] | null>(null);
  const [notes, setNotes] = useState<SpeakingNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [newSituation, setNewSituation] = useState(false);
  const [situationTitle, setSituationTitle] = useState("");
  const [situationDescription, setSituationDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [allTopics, topicSituations, topicNotes] = await Promise.all([fetchStudioTopics(), fetchStudioSituations(id), fetchSpeakingNotes({ topicId: id })]);
      setTopics(allTopics); setSituations(topicSituations); setNotes(topicNotes); setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load this topic."); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const createSituation = async () => {
    if (!situationTitle.trim()) return;
    setSaving(true);
    try { await createStudioSituation({ topicId: id, title: situationTitle, description: situationDescription }); setNewSituation(false); setSituationTitle(""); setSituationDescription(""); nav.invalidateSpeakingData(); await load(); }
    catch (caught) { Alert.alert("Couldn’t create situation", caught instanceof Error ? caught.message : "Try again."); }
    finally { setSaving(false); }
  };
  return (
    <>
      <Screen>
        <BackBar onBack={nav.pop} />
        <Stagger>
          <View style={{ paddingHorizontal: 2 }}><Text style={{ fontSize: 12, fontWeight: "800", color: t.colors.accD, letterSpacing: 0.65 }}>TOPIC</Text><Serif style={{ fontSize: 31, lineHeight: 35, color: t.colors.ink, marginTop: 4 }}>{name ?? topics.find((topic) => topic.id === id)?.name ?? "Topic"}</Serif></View>
          <View style={{ flexDirection: "row", gap: 10 }}><Pill full icon="plus" onPress={() => setQuickOpen(true)}>New note</Pill><Pill full tone="tint" onPress={() => setNewSituation(true)}>New situation</Pill></View>
          <Sect title="Situations" />
        </Stagger>
        {situations === null && !error ? <Loading /> : error ? <ErrorCard message={error} retry={load} /> : (situations ?? []).map((situation) => <SituationRow key={situation.id} situation={situation} onPress={() => nav.push("situation", { id: situation.id, topicId: id, title: situation.title })} />)}
        <Sect title="Unsorted notes" />
        {notes.filter((note) => !note.situationId).map((note) => <NoteRow key={note.id} note={note} onPress={() => nav.push("speakingNote", { id: note.id })} />)}
      </Screen>
      <QuickNoteSheet open={quickOpen} nav={nav} topics={topics} situations={situations ?? []} initialTopicId={id} onClose={() => setQuickOpen(false)} onSaved={() => void load()} />
      <Sheet open={newSituation} title="New situation" subtitle="Name a specific event, audience, or moment." onClose={() => setNewSituation(false)}>
        <View style={{ paddingHorizontal: 22, gap: 14 }}><Field label="Situation" value={situationTitle} onChangeText={setSituationTitle} placeholder="ABC interview — September" /><Field label="Description" value={situationDescription} onChangeText={setSituationDescription} placeholder="What is happening?" multiline /><Pill full onPress={saving ? undefined : () => void createSituation()}>{saving ? "Saving…" : "Create situation"}</Pill></View>
      </Sheet>
    </>
  );
}

// ── Situation detail ────────────────────────────────────────────────────────
// Ported from Claude Design "Situation Detail.html" (2026-09-09, confirmed).
// The design carries its own token set, close to but not identical with the
// global theme: a lighter well/hairline and a distinct dark accent. Deriving
// them here keeps the port faithful without moving tokens other screens use.
function useSituationTokens() {
  const t = useTheme();
  const dark = t.dark;
  return {
    t,
    dark,
    card: t.colors.card,
    ink: t.colors.ink,
    sub: t.colors.ink2,
    faint: dark ? "rgba(235,235,245,0.3)" : "rgba(60,60,67,0.33)",
    hair: dark ? "rgba(235,235,245,0.13)" : "rgba(60,60,67,0.14)",
    well: dark ? "rgba(120,120,128,0.14)" : "rgba(120,120,128,0.08)",
    accent: dark ? "#5B8AF5" : "#3B6EE1",
    accentSoft: dark ? "rgba(91,138,245,0.18)" : "rgba(59,110,225,0.11)",
    onAccent: dark ? "#000" : "#fff",
    warn: dark ? "#FF453A" : "#FF3B30",
  };
}

type SituationTokens = ReturnType<typeof useSituationTokens>;

// Cards sit at 16 from the frame edge, header and section rows at 20, while
// Screen already pads 18 — so cards pull 2 out and text pushes 2 in.
const CARD_PULL = -2;
const TEXT_PUSH = 2;

function situationCard(c: SituationTokens): ViewStyle {
  return {
    backgroundColor: c.card,
    borderRadius: 26,
    marginHorizontal: CARD_PULL,
    borderWidth: hairline,
    borderColor: c.hair,
    overflow: "hidden",
  };
}

const PHRASE_STATUS_LABEL: Record<string, string> = {
  new: "New",
  recognizing: "Recognizing",
  practicing: "Practicing",
  ready: "Ready",
};

function phraseStatusLabel(status: string): string {
  return PHRASE_STATUS_LABEL[status] ?? status.replace(/_/g, " ");
}

/** Badge tone ladder: New and Recognizing stay neutral, Practicing tints, Ready fills. */
function PhraseBadge({ status, c }: { status: string; c: SituationTokens }) {
  const label = phraseStatusLabel(status);
  const filled = status === "ready";
  const tinted = status === "practicing";
  return (
    <View
      style={{
        height: 24,
        paddingHorizontal: 10,
        borderRadius: 9999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? c.accent : tinted ? c.accentSoft : c.well,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.33, color: filled ? c.onAccent : tinted ? c.accent : status === "new" ? c.faint : c.sub }}>
        {label}
      </Text>
    </View>
  );
}

function SituationChip({ c, icon, label, dashed, onPress }: { c: SituationTokens; icon?: IconName; label: string; dashed?: boolean; onPress?: () => void }) {
  const body = (
    <View
      style={{
        height: 28,
        paddingHorizontal: 12,
        borderRadius: 9999,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: dashed ? "transparent" : c.well,
        borderWidth: dashed ? 1.5 : 0,
        borderColor: dashed ? "rgba(120,120,128,0.45)" : "transparent",
        borderStyle: dashed ? "dashed" : "solid",
      }}
    >
      {icon ? <Icon name={icon} s={12} w={1.6} c={c.sub} /> : null}
      <Text style={{ fontSize: 12.5, fontWeight: "500", color: c.sub }}>{label}</Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

/** Serif section title with an optional tinted capsule action on the right. */
function SituationSection({ c, title, actionLabel, actionIcon, onAction }: { c: SituationTokens; title: string; actionLabel?: string; actionIcon?: IconName; onAction?: () => void }) {
  return (
    <View style={{ paddingHorizontal: TEXT_PUSH, marginTop: 28, marginBottom: 10, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
      <Serif style={{ fontSize: 20, color: c.ink }}>{title}</Serif>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          {({ pressed }) => (
            <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 9999, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.accentSoft, opacity: pressed ? 0.65 : 1 }}>
              {actionIcon ? <Icon name={actionIcon} s={12} w={1.8} c={c.accent} /> : null}
              <Text style={{ fontSize: 13, fontWeight: "600", color: c.accent }}>{actionLabel}</Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function MicButton({ c, filled, label, onPress }: { c: SituationTokens; filled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 9999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? c.accent : c.well,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name="mic" s={16} w={1.7} c={filled ? c.onAccent : c.accent} />
    </Pressable>
  );
}

/** The first note of a situation is the one you are most likely to speak next,
 *  so it gets the filled mic and slightly taller row (design variant A). */
function SituationNoteRow({ c, note, first, hero, onPress, onPractice }: { c: SituationTokens; note: SpeakingNote; first?: boolean; hero?: boolean; onPress: () => void; onPractice: () => void }) {
  const meta = `${note.phraseCount} phrase${note.phraseCount === 1 ? "" : "s"} · ${note.attemptCount} attempt${note.attemptCount === 1 ? "" : "s"}`;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingLeft: 18,
        paddingRight: 14,
        paddingVertical: hero ? 18 : 14,
        borderTopWidth: first ? 0 : hairline,
        borderTopColor: c.hair,
      }}
    >
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${note.title}. ${meta}`} style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ fontSize: hero ? 17 : 16, fontWeight: "600", lineHeight: hero ? 22 : 21, color: c.ink }}>{note.title}</Text>
        {note.goal ? <Text style={{ fontSize: 13, lineHeight: 18, color: c.sub, marginTop: 3 }}>{note.goal}</Text> : null}
        <Text style={{ fontSize: 12, color: c.faint, marginTop: 5 }}>{meta}</Text>
      </Pressable>
      <MicButton c={c} filled={hero} label={`Practice ${note.title}`} onPress={onPractice} />
    </View>
  );
}

function PhraseRow({ c, phrase, first, chevron, onPress }: { c: SituationTokens; phrase: NotePhrase; first?: boolean; chevron?: boolean; onPress?: () => void }) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 18, paddingRight: 16, paddingVertical: 12, borderTopWidth: first ? 0 : hairline, borderTopColor: c.hair }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14.5, lineHeight: 20, fontWeight: "400", color: c.ink }}>{phrase.text}</Text>
        {phrase.translation ? <Text style={{ fontSize: 12.5, color: c.sub, marginTop: 4 }}>{phrase.translation}</Text> : null}
      </View>
      <PhraseBadge status={phrase.learningStatus} c={c} />
      {chevron ? <Icon name="chev" s={12} w={1.8} c={c.faint} /> : null}
    </View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{inner}</Pressable>;
}

function MoreRow({ c, label, onPress }: { c: SituationTokens; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 11, borderTopWidth: hairline, borderTopColor: c.hair }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.accent }}>{label}</Text>
        <Icon name="chev" s={12} w={1.8} c={c.faint} />
      </View>
    </Pressable>
  );
}

function attemptDuration(seconds: number | null): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function AttemptRow({ c, date, note, duration, first, chevron, onPress }: { c: SituationTokens; date: string; note: string; duration: string; first?: boolean; chevron?: boolean; onPress?: () => void }) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, paddingHorizontal: 18, paddingVertical: 11, borderTopWidth: first ? 0 : hairline, borderTopColor: c.hair }}>
      <Text style={{ width: 52, fontSize: 13.5, color: c.faint, fontVariant: ["tabular-nums"] }}>{date}</Text>
      <Text style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: c.sub }} numberOfLines={1}>{note}</Text>
      <Text style={{ fontSize: 13.5, color: c.faint, fontVariant: ["tabular-nums"] }}>{duration}</Text>
      {chevron ? <Icon name="chev" s={12} w={1.8} c={c.faint} /> : null}
    </View>
  );
  if (!onPress) return inner;
  return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{inner}</Pressable>;
}

/** The one repair worth carrying forward, shown above the attempt list. */
function RepairNote({ c, lead, body, inset }: { c: SituationTokens; lead: string; body: string; inset?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 9, marginHorizontal: inset ? 0 : CARD_PULL, marginTop: 2, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 18, backgroundColor: c.accentSoft }}>
      <Icon name="bulb" s={14} w={1.5} c={c.accent} />
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: c.sub }}>
        {lead}
        <Text style={{ color: c.ink, fontWeight: "600" }}>{body}</Text>
      </Text>
    </View>
  );
}

function SituationEmpty({ c, title, body }: { c: SituationTokens; title?: string; body: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 22 }}>
      {title ? <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{title}</Text> : null}
      <Text style={{ fontSize: 13, lineHeight: 19, color: c.sub, marginTop: title ? 4 : 0 }}>{body}</Text>
    </View>
  );
}

function BigCta({ c, icon, label, onPress, style }: { c: SituationTokens; icon: IconName; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1, marginHorizontal: 16, marginTop: 16, marginBottom: 4 }, style]}>
      <View style={{ height: 50, borderRadius: 9999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.accent }}>
        <Icon name={icon} s={14} w={1.8} c={c.onAccent} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.onAccent }}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Soft "+ Add phrase" affordance used by the empty phrase card and by the
 *  Speaking Note action row (34pt — the middle of the three button heights). */
function SoftAction({ c, icon, label, onPress, style }: { c: SituationTokens; icon?: IconName; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ alignSelf: "flex-start", marginTop: 12, opacity: pressed ? 0.65 : 1 }, style]}>
      <View style={{ height: 34, paddingHorizontal: 16, borderRadius: 9999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.accentSoft }}>
        {icon ? <Icon name={icon} s={13} w={1.8} c={c.accent} /> : null}
        <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.accent }}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SituationCenter({ c, children }: { c: SituationTokens; children: ReactNode }) {
  return <View style={{ alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40, paddingVertical: 110 }}>{children}</View>;
}

const situationHeaderDate = situationDate;

function attemptDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Minimal date capture behind the "+ Date" chip. situations.event_date shipped
 *  in migration 028 but nothing ever wrote it, so every situation read null. */
function EventDateSheet({ open, initial, onClose, onSave }: { open: boolean; initial: string | null; onClose: () => void; onSave: (value: string | null) => Promise<void> }) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => { setValue(initial ?? ""); setError(null); }, 0);
    return () => clearTimeout(timer);
  }, [open, initial]);
  const commit = async (next: string | null) => {
    setSaving(true);
    setError(null);
    try { await onSave(next); onClose(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t save the date."); }
    finally { setSaving(false); }
  };
  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) return void commit(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || !Number.isFinite(new Date(trimmed).getTime())) {
      setError("Use YYYY-MM-DD, for example 2026-09-18.");
      return;
    }
    void commit(trimmed);
  };
  return (
    <Sheet open={open} title="When is it?" subtitle="A date makes the situation easier to find later. Leave it blank to clear." onClose={onClose}>
      {/* Scrollable so the keyboard can't push the save action off-screen. */}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 8, gap: 14 }}>
        <Field label="Date" value={value} onChangeText={setValue} placeholder="2026-09-18" />
        {error ? <Text style={{ color: "#E5484D", fontSize: 13.5, lineHeight: 19 }}>{error}</Text> : null}
        <Pill full onPress={saving ? undefined : save}>{saving ? "Saving…" : "Save date"}</Pill>
      </ScrollView>
    </Sheet>
  );
}

export function StudioSituationScreen({ id, topicId, title, nav }: { id: string; topicId: string; title?: string; nav: Nav }) {
  const c = useSituationTokens();
  const [topics, setTopics] = useState<StudioTopic[]>([]);
  const [situations, setSituations] = useState<StudioSituation[]>([]);
  const [notes, setNotes] = useState<SpeakingNote[] | null>(null);
  const [phrases, setPhrases] = useState<NotePhrase[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const load = useCallback(async () => {
    try {
      const [allTopics, allSituations, linkedNotes, linkedPhrases, recentAttempts] = await Promise.all([
        fetchStudioTopics(),
        fetchStudioSituations(topicId),
        fetchSpeakingNotes({ situationId: id }),
        fetchSituationPhrases(id),
        fetchPracticeAttempts({ situationId: id, limit: 25 }),
      ]);
      setTopics(allTopics); setSituations(allSituations); setNotes(linkedNotes); setPhrases(linkedPhrases); setAttempts(recentAttempts); setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load this situation."); }
  }, [id, topicId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const situation = situations.find((item) => item.id === id);
  const when = situationHeaderDate(situation?.eventDate ?? null);
  const noteTitleById = useMemo(() => new Map((notes ?? []).map((note) => [note.id, note.title])), [notes]);
  const noteCount = notes?.length ?? 0;
  const lastRepair = attempts.find((attempt) => attempt.repairSuggestion)?.repairSuggestion ?? null;
  const card = situationCard(c);

  const header = (
    <>
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: TEXT_PUSH }}>
        <Text style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.72, color: c.accent, marginTop: 14, marginBottom: 6 }}>
          {(situation?.topicName ?? "Topic").toUpperCase()}
        </Text>
        <Serif style={{ fontSize: 31, lineHeight: 35, color: c.ink }}>{situation?.title ?? title ?? "Situation"}</Serif>
        {situation?.description ? <Text style={{ fontSize: 14, lineHeight: 20, color: c.sub, marginTop: 8 }}>{situation.description}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {when
            ? <SituationChip c={c} icon="calendar" label={when} onPress={() => setDateOpen(true)} />
            : <SituationChip c={c} dashed label="+ Date" onPress={() => setDateOpen(true)} />}
          <SituationChip c={c} label={`${noteCount} note${noteCount === 1 ? "" : "s"}`} />
          <SituationChip c={c} label={`${attempts.length} attempt${attempts.length === 1 ? "" : "s"}`} />
        </View>
      </View>
    </>
  );

  if (notes === null && !error) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <SituationCenter c={c}><ActivityIndicator color={c.accent} /></SituationCenter>
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <SituationCenter c={c}>
          <Serif style={{ fontSize: 20, color: c.ink }}>Couldn’t load this situation</Serif>
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.sub, textAlign: "center" }}>{error}</Text>
          <Pill onPress={load}>Retry</Pill>
        </SituationCenter>
      </Screen>
    );
  }

  return (
    <>
      <Screen style={{ gap: 0 }} bottomPad={40}>
        {header}

        <SituationSection c={c} title="Speaking Notes" actionLabel={noteCount ? "New" : undefined} actionIcon="plus" onAction={() => setQuickOpen(true)} />
        <View style={card}>
          {noteCount ? (
            (notes ?? []).map((note, index) => (
              <SituationNoteRow
                key={note.id}
                c={c}
                note={note}
                first={index === 0}
                hero={index === 0}
                onPress={() => nav.push("speakingNote", { id: note.id })}
                onPractice={() => startNotePractice(nav, note)}
              />
            ))
          ) : (
            <>
              <SituationEmpty c={c} title="What will you need to say here?" body="Write one thing you’ll actually say in this situation — a sentence is enough. Practice starts from a note." />
              <BigCta c={c} icon="plus" label="Write your first note" onPress={() => setQuickOpen(true)} />
            </>
          )}
        </View>

        <SituationSection c={c} title="Useful Phrases" />
        <View style={card}>
          {phrases.length ? (
            <>
              {phrases.slice(0, 5).map((phrase, index) => <PhraseRow key={phrase.id} c={c} phrase={phrase} first={index === 0} />)}
              {/* Always present, so the full list is reachable even when
                  nothing is hidden — the label switches to "All N" then. */}
              <MoreRow
                c={c}
                label={phrases.length > 5 ? `${phrases.length - 5} more phrases` : `All ${phrases.length} phrase${phrases.length === 1 ? "" : "s"}`}
                onPress={() => nav.push("situationPhrases", { id, topicId, title: situation?.title ?? title })}
              />
            </>
          ) : (
            <View style={{ paddingHorizontal: 20, paddingVertical: 22 }}>
              <Text style={{ fontSize: 13, lineHeight: 19, color: c.sub }}>No phrases yet — collect expressions you want ready for this situation.</Text>
              <SoftAction c={c} label="+ Add phrase" onPress={() => (notes?.[0] ? nav.push("speakingNote", { id: notes[0].id }) : setQuickOpen(true))} />
            </View>
          )}
        </View>

        <SituationSection
          c={c}
          title="Recent Attempts"
          actionLabel={attempts.length ? `All ${attempts.length}` : undefined}
          onAction={() => nav.push("situationAttempts", { id, topicId, title: situation?.title ?? title })}
        />
        {lastRepair ? <RepairNote c={c} lead="Last time: " body={lastRepair} /> : null}
        <View style={card}>
          {attempts.length ? (
            attempts.slice(0, 3).map((attempt, index) => (
              <AttemptRow
                key={attempt.id}
                c={c}
                first={index === 0}
                date={attemptDate(attempt.createdAt)}
                note={(attempt.noteId && noteTitleById.get(attempt.noteId)) || "Free talk"}
                duration={attemptDuration(attempt.durationSeconds)}
              />
            ))
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 18, paddingRight: 14, paddingVertical: 14 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", lineHeight: 21, color: c.ink }}>Start your first attempt</Text>
                <Text style={{ fontSize: 13, lineHeight: 18, color: c.sub, marginTop: 3 }}>Free talk — you don’t need a note to begin.</Text>
              </View>
              <MicButton c={c} filled label="Start a free talk attempt" onPress={() => nav.startTalk({ ctx: situation?.title ?? title ?? "Free talk", from: "topics", storyId: id })} />
            </View>
          )}
        </View>
      </Screen>
      <QuickNoteSheet open={quickOpen} nav={nav} topics={topics} situations={situations} initialTopicId={topicId} initialSituationId={id} onClose={() => setQuickOpen(false)} onSaved={() => void load()} />
      <EventDateSheet
        open={dateOpen}
        initial={situation?.eventDate ?? null}
        onClose={() => setDateOpen(false)}
        onSave={async (value) => { await setSituationEventDate(id, value); nav.invalidateSpeakingData(); await load(); }}
      />
    </>
  );
}

const PHRASE_FILTER_ORDER = ["ready", "practicing", "recognizing", "new"] as const;

/** Pushed full phrase list. Rows are tappable in the design's Phrase Detail
 *  screen, which is not confirmed yet, so they stay inert here. */
export function SituationPhrasesScreen({ id, title, nav }: { id: string; title?: string; nav: Nav }) {
  const c = useSituationTokens();
  const [phrases, setPhrases] = useState<NotePhrase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setPhrases(await fetchSituationPhrases(id)); setError(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load these phrases."); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const all = useMemo(() => phrases ?? [], [phrases]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const phrase of all) map.set(phrase.learningStatus, (map.get(phrase.learningStatus) ?? 0) + 1);
    return map;
  }, [all]);
  const visible = filter ? all.filter((phrase) => phrase.learningStatus === filter) : all;
  return (
    <Screen style={{ gap: 0 }} bottomPad={40}>
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: TEXT_PUSH }}>
        <Text style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.72, color: c.accent, marginTop: 14, marginBottom: 6 }} numberOfLines={1}>
          {(title ?? "Situation").toUpperCase()}
        </Text>
        <Serif style={{ fontSize: 31, lineHeight: 35, color: c.ink }}>Useful Phrases</Serif>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <Pressable onPress={() => setFilter(null)} hitSlop={6}>
            <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 9999, justifyContent: "center", backgroundColor: filter === null ? c.accent : c.well }}>
              <Text style={{ fontSize: 12.5, fontWeight: "500", color: filter === null ? c.onAccent : c.sub }}>{`All ${all.length}`}</Text>
            </View>
          </Pressable>
          {PHRASE_FILTER_ORDER.filter((status) => counts.get(status)).map((status) => (
            <Pressable key={status} onPress={() => setFilter((current) => (current === status ? null : status))} hitSlop={6}>
              <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 9999, justifyContent: "center", backgroundColor: filter === status ? c.accent : c.well }}>
                <Text style={{ fontSize: 12.5, fontWeight: "500", color: filter === status ? c.onAccent : c.sub }}>{`${phraseStatusLabel(status)} ${counts.get(status)}`}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ height: 20 }} />
      {phrases === null && !error ? <SituationCenter c={c}><ActivityIndicator color={c.accent} /></SituationCenter> : error ? <ErrorCard message={error} retry={load} /> : (
        <View style={situationCard(c)}>
          {visible.length ? visible.map((phrase, index) => <PhraseRow key={phrase.id} c={c} phrase={phrase} first={index === 0} />) : <SituationEmpty c={c} body="Nothing in this stage yet." />}
        </View>
      )}
    </Screen>
  );
}

function attemptBucket(value: string, now: number): string {
  const days = Math.floor((now - new Date(value).getTime()) / 86400000);
  if (days <= 7) return "This week";
  if (days <= 14) return "Last week";
  if (days <= 31) return "This month";
  return "Earlier";
}

/** Pushed full attempt list for one situation, grouped by recency, with each
 *  attempt's one repair suggestion inline under its row. */
export function SituationAttemptsScreen({ id, title, nav }: { id: string; title?: string; nav: Nav }) {
  const c = useSituationTokens();
  const [attempts, setAttempts] = useState<PracticeAttempt[] | null>(null);
  const [notes, setNotes] = useState<SpeakingNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Captured at fetch time so bucketing never calls Date.now() during render.
  const [loadedAt, setLoadedAt] = useState(0);
  const load = useCallback(async () => {
    try {
      const [list, linked] = await Promise.all([fetchPracticeAttempts({ situationId: id, limit: 100 }), fetchSpeakingNotes({ situationId: id })]);
      setAttempts(list); setNotes(linked); setLoadedAt(Date.now()); setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load these attempts."); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const noteTitleById = useMemo(() => new Map(notes.map((note) => [note.id, note.title])), [notes]);
  const all = useMemo(() => attempts ?? [], [attempts]);
  const totalMinutes = Math.round(all.reduce((sum, attempt) => sum + (attempt.durationSeconds ?? 0), 0) / 60);
  const groups = useMemo(() => {
    const out: { label: string; items: PracticeAttempt[] }[] = [];
    for (const attempt of all) {
      const label = attemptBucket(attempt.createdAt, loadedAt);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(attempt);
      else out.push({ label, items: [attempt] });
    }
    return out;
  }, [all, loadedAt]);
  return (
    <Screen style={{ gap: 0 }} bottomPad={40}>
      <BackBar onBack={nav.pop} />
      <View style={{ paddingHorizontal: TEXT_PUSH }}>
        <Text style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.72, color: c.accent, marginTop: 14, marginBottom: 6 }} numberOfLines={1}>
          {(title ?? "Situation").toUpperCase()}
        </Text>
        <Serif style={{ fontSize: 31, lineHeight: 35, color: c.ink }}>Attempts</Serif>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <SituationChip c={c} label={`${all.length} attempt${all.length === 1 ? "" : "s"}`} />
          <SituationChip c={c} label={`${totalMinutes} min total`} />
        </View>
      </View>
      <View style={{ height: 20 }} />
      {attempts === null && !error ? <SituationCenter c={c}><ActivityIndicator color={c.accent} /></SituationCenter> : error ? <ErrorCard message={error} retry={load} /> : (
        <View style={situationCard(c)}>
          {all.length ? groups.map((group, groupIndex) => (
            <View key={`${group.label}-${groupIndex}`}>
              <Text style={{ paddingHorizontal: 18, paddingTop: groupIndex === 0 ? 16 : 14, paddingBottom: 6, fontSize: 11, fontWeight: "700", letterSpacing: 0.77, color: c.sub }}>
                {group.label.toUpperCase()}
              </Text>
              {group.items.map((attempt, index) => (
                <View key={attempt.id}>
                  <AttemptRow
                    c={c}
                    first={index === 0}
                    chevron
                    date={attemptDate(attempt.createdAt)}
                    note={(attempt.noteId && noteTitleById.get(attempt.noteId)) || "Free talk"}
                    duration={attemptDuration(attempt.durationSeconds)}
                  />
                  {attempt.repairSuggestion ? <RepairNote c={c} inset lead="" body={attempt.repairSuggestion} /> : null}
                </View>
              ))}
            </View>
          )) : <SituationEmpty c={c} body="Attempts stay a quiet history here." />}
        </View>
      )}
    </Screen>
  );
}

function PhrasePicker({ open, note, linked, onClose, onChanged }: { open: boolean; note: SpeakingNote; linked: NotePhrase[]; onClose: () => void; onChanged: () => void }) {
  const t = useTheme();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PhraseItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (open) phraseChoices().then(setItems).catch(() => setItems([])); }, [open]);
  const linkedIds = useMemo(() => new Set(linked.map((phrase) => phrase.id)), [linked]);
  const visible = items.filter((item) => !query.trim() || `${item.text} ${item.translation ?? ""}`.toLocaleLowerCase("en").includes(query.trim().toLocaleLowerCase("en"))).slice(0, 30);
  const toggle = async (phrase: PhraseItem) => {
    setBusy(phrase.id);
    try { if (linkedIds.has(phrase.id)) await unlinkPhraseFromNote(note.id, phrase.id); else await linkPhraseToNote({ noteId: note.id, phraseId: phrase.id, situationId: note.situationId }); onChanged(); }
    catch (caught) { Alert.alert("Couldn’t update phrases", caught instanceof Error ? caught.message : "Try again."); }
    finally { setBusy(null); }
  };
  return (
    <Sheet open={open} title="Link phrases" subtitle="Choose language you want available when you practice." onClose={onClose}>
      <View style={{ paddingHorizontal: 22, gap: 12 }}>
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="How can I say this?" />
        <ScrollView style={{ maxHeight: 430 }} keyboardShouldPersistTaps="handled">
          {visible.map((phrase, index) => { const selected = linkedIds.has(phrase.id); return <Pressable key={phrase.id} onPress={() => void toggle(phrase)} style={({ pressed }) => ({ minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: index ? 1 : 0, borderTopColor: t.colors.sep, opacity: pressed || busy === phrase.id ? 0.55 : 1 })}><View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{phrase.text}</Text>{phrase.translation ? <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 3 }}>{phrase.translation}</Text> : null}</View><View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: selected ? t.colors.acc : t.colors.soft, alignItems: "center", justifyContent: "center" }}><Icon name={selected ? "check" : "plus"} s={14} c={selected ? "#fff" : t.colors.ink3} /></View></Pressable>; })}
        </ScrollView>
        <Pill tone="ghost" full onPress={onClose}>Done</Pill>
      </View>
    </Sheet>
  );
}

/** Autosave cadence. Long enough that a normal typing burst is one write,
 *  short enough that leaving the screen almost never has anything to flush. */
const NOTE_SAVE_DEBOUNCE_MS = 800;

type NoteDraft = { title: string; goal: string; body: string };
type SaveState = "idle" | "saving" | "saved" | "error";

function SaveStatus({ c, state, onRetry }: { c: SituationTokens; state: SaveState; onRetry: () => void }) {
  if (state === "idle") return null;
  if (state === "error") {
    return (
      <Pressable onPress={onRetry} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: c.warn }}>Not saved · Retry</Text>
      </Pressable>
    );
  }
  return (
    <Text style={{ fontSize: 13, fontWeight: "500", color: state === "saving" ? c.faint : c.sub }}>
      {state === "saving" ? "Saving…" : "Saved ✓"}
    </Text>
  );
}

export function SpeakingNoteScreen({ id, nav, justPracticed }: { id: string; nav: Nav; justPracticed?: boolean }) {
  const c = useSituationTokens();
  const insets = useSafeAreaInsets();
  const bodyRef = useRef<TextInput>(null);
  const [note, setNote] = useState<SpeakingNote | null>(null);
  const [phrases, setPhrases] = useState<NotePhrase[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [topics, setTopics] = useState<StudioTopic[]>([]);
  const [situations, setSituations] = useState<StudioSituation[]>([]);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [nextTopicId, setNextTopicId] = useState<string | null>(null);
  const [nextSituationId, setNextSituationId] = useState<string | null>(null);
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);
  const [allAttempts, setAllAttempts] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);

  // Autosave reads through refs so the debounce timer and the unmount flush
  // always see the latest draft without re-subscribing on every keystroke.
  // The ref is written from the edit handlers, never during render.
  const draftRef = useRef<NoteDraft>({ title: "", goal: "", body: "" });
  const savedRef = useRef<SpeakingNote | null>(null);
  const editDraft = useCallback(<K extends keyof NoteDraft>(field: K, value: string) => {
    draftRef.current = { ...draftRef.current, [field]: value };
    if (field === "title") setTitle(value);
    else if (field === "goal") setGoal(value);
    else setBody(value);
  }, []);

  const load = useCallback(async () => {
    try {
      const found = await fetchSpeakingNote(id);
      if (!found) throw new Error("This note no longer exists.");
      const [linked, history, allTopics, allSituations] = await Promise.all([
        fetchNotePhrases(found),
        fetchPracticeAttempts({ noteId: id, limit: 20 }),
        fetchStudioTopics(),
        fetchStudioSituations(),
      ]);
      savedRef.current = found;
      draftRef.current = { title: found.title, goal: found.goal, body: found.body };
      setNote(found); setTitle(found.title); setGoal(found.goal); setBody(found.body);
      setPhrases(linked); setAttempts(history); setTopics(allTopics); setSituations(allSituations); setError(null);
      // Coming back from an attempt, the thing you want is the repair you just
      // earned — open it rather than making the learner hunt for it.
      if (justPracticed && history[0]) setOpenAttempt(history[0].id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load this note."); }
  }, [id, justPracticed]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKeyboardUp(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const persist = useCallback(async () => {
    const base = savedRef.current;
    const draft = draftRef.current;
    if (!base) return;
    // A blank title would leave an unfindable row, so an empty field is treated
    // as "still typing" rather than as a value to write.
    if (!draft.title.trim()) return;
    if (draft.title === base.title && draft.goal === base.goal && draft.body === base.body) return;
    setSaveState("saving");
    try {
      await updateSpeakingNote(base.id, { title: draft.title, goal: draft.goal, body: draft.body, topicId: base.topicId, situationId: base.situationId });
      const next = { ...base, title: draft.title.trim(), goal: draft.goal.trim(), body: draft.body.trim() };
      savedRef.current = next;
      setNote(next);
      setSaveState("saved");
      nav.invalidateSpeakingData();
    } catch {
      setSaveState("error");
    }
  }, [nav]);

  const persistRef = useRef(persist);
  useEffect(() => { persistRef.current = persist; });

  useEffect(() => {
    if (!note) return;
    if (title === note.title && goal === note.goal && body === note.body) return;
    const timer = setTimeout(() => void persistRef.current(), NOTE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, goal, body, note]);

  // Leaving the screen inside the debounce window must not lose the edit.
  useEffect(() => () => { void persistRef.current(); }, []);

  const openOrganizer = () => {
    setNextTopicId(note?.topicId ?? null);
    setNextSituationId(note?.situationId ?? null);
    setOrganizeOpen(true);
  };
  const saveOrganizer = async () => {
    const base = savedRef.current;
    if (!base || !nextTopicId) return;
    const selectedSituation = situations.find((item) => item.id === nextSituationId);
    setOrganizing(true);
    try {
      await updateSpeakingNote(id, { title, goal, body, topicId: nextTopicId, situationId: nextSituationId });
      const nextTopic = topics.find((item) => item.id === nextTopicId);
      const next = { ...base, title: title.trim(), goal: goal.trim(), body: body.trim(), topicId: nextTopicId, topicName: nextTopic?.name ?? null, situationId: nextSituationId, situationTitle: selectedSituation?.title ?? null, status: nextSituationId ? "active" : "unsorted" } as SpeakingNote;
      savedRef.current = next;
      setNote(next);
      setOrganizeOpen(false);
      nav.invalidateSpeakingData();
      nav.notify(nextSituationId ? "Note organized" : "Saved to Unsorted");
    } catch (caught) {
      Alert.alert("Couldn’t organize note", caught instanceof Error ? caught.message : "Try again.");
    } finally {
      setOrganizing(false);
    }
  };

  if (!note && !error) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <SituationCenter c={c}><ActivityIndicator color={c.accent} /></SituationCenter>
      </Screen>
    );
  }
  if (error || !note) {
    return (
      <Screen>
        <BackBar onBack={nav.pop} />
        <SituationCenter c={c}>
          <Serif style={{ fontSize: 20, color: c.ink }}>Couldn’t open this note</Serif>
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.sub, textAlign: "center" }}>{error ?? "Note not found"}</Text>
          <Pill onPress={load}>Retry</Pill>
        </SituationCenter>
      </Screen>
    );
  }

  const practice = () => startNotePractice(nav, { ...note, title, goal, body });
  const crumb = `${note.topicName ?? "Topic"} / ${note.situationTitle ?? "Unsorted"}`;
  const lastRepair = attempts.find((attempt) => attempt.repairSuggestion)?.repairSuggestion ?? null;
  const shownAttempts = allAttempts ? attempts : attempts.slice(0, 3);
  const card = situationCard(c);

  return (
    <>
      <View style={{ flex: 1 }}>
        <Screen style={{ gap: 0 }} bottomPad={112}>
          <BackBar onBack={nav.pop} right={<SaveStatus c={c} state={saveState} onRetry={() => void persist()} />} />

          <View style={{ paddingHorizontal: TEXT_PUSH }}>
            <Pressable onPress={openOrganizer} hitSlop={6} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 14, marginBottom: 6, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.72, color: c.accent }}>{crumb.toUpperCase()}</Text>
              <Icon name="chev" s={11} w={2} c={c.accent} />
            </Pressable>
            <TextInput
              value={title}
              onChangeText={(value) => editDraft("title", value)}
              multiline
              placeholder="Untitled note"
              placeholderTextColor={c.faint}
              style={{ fontFamily: "Newsreader", fontSize: 31, lineHeight: 35, color: c.ink, padding: 0 }}
            />
            <TextInput
              value={goal}
              onChangeText={(value) => editDraft("goal", value)}
              multiline
              placeholder="What should the listener understand?"
              placeholderTextColor={c.faint}
              style={{ fontSize: 17, fontWeight: "600", lineHeight: 23, color: c.sub, padding: 0, marginTop: 8 }}
            />
            <View style={{ height: hairline, backgroundColor: c.hair, marginTop: 16 }} />
            <TextInput
              ref={bodyRef}
              value={body}
              onChangeText={(value) => editDraft("body", value)}
              multiline
              textAlignVertical="top"
              placeholder="Write freely…"
              placeholderTextColor={c.faint}
              style={{ minHeight: 156, fontSize: 16, lineHeight: 25, color: c.ink, padding: 0, marginTop: 14 }}
            />
            {/* Two actions, not the spec's three: the sticky CTA below is the
                same call as "Record idea" was, so the chip only competed with
                it. What is left is one action per thing you can add. */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <SoftAction c={c} icon="plus" label="Add thought" onPress={() => bodyRef.current?.focus()} />
              <SoftAction c={c} icon="bank" label="Link phrase" onPress={() => setPickerOpen(true)} />
            </View>
          </View>

          <SituationSection c={c} title="Linked Phrases" actionLabel={phrases.length ? "Link" : undefined} actionIcon="plus" onAction={() => setPickerOpen(true)} />
          <View style={card}>
            {phrases.length ? (
              phrases.map((phrase, index) => <PhraseRow key={phrase.id} c={c} phrase={phrase} first={index === 0} />)
            ) : (
              <View style={{ paddingHorizontal: 20, paddingVertical: 22 }}>
                <Text style={{ fontSize: 13, lineHeight: 19, color: c.sub }}>Bring saved language into this note, so practice has something to reach for.</Text>
                <SoftAction c={c} label="+ Link phrase" onPress={() => setPickerOpen(true)} />
              </View>
            )}
          </View>

          <SituationSection c={c} title="Previous Attempts" />
          {lastRepair ? <RepairNote c={c} lead="Last time: " body={lastRepair} /> : null}
          <View style={card}>
            {attempts.length ? (
              <>
                {shownAttempts.map((attempt, index) => (
                  <View key={attempt.id}>
                    <AttemptRow
                      c={c}
                      first={index === 0}
                      date={attemptDate(attempt.createdAt)}
                      note={attempt.repairSuggestion ? "One fix to try" : "No fix suggested"}
                      duration={attemptDuration(attempt.durationSeconds)}
                      chevron={Boolean(attempt.repairSuggestion)}
                      onPress={attempt.repairSuggestion ? () => setOpenAttempt((current) => (current === attempt.id ? null : attempt.id)) : undefined}
                    />
                    {openAttempt === attempt.id && attempt.repairSuggestion ? (
                      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                        <RepairNote c={c} inset lead="" body={attempt.repairSuggestion} />
                      </View>
                    ) : null}
                  </View>
                ))}
                {attempts.length > 3 && !allAttempts ? (
                  <MoreRow c={c} label={`${attempts.length - 3} more attempts`} onPress={() => setAllAttempts(true)} />
                ) : null}
              </>
            ) : (
              <SituationEmpty c={c} title="No attempts yet" body="Say it out loud once. You get one thing to fix, then you say it again." />
            )}
          </View>
        </Screen>

        {/* Sticky, because the loop is say → fix → say again and the CTA has to
            be reachable from anywhere in the note. Hidden while typing so it
            never sits under the keyboard. */}
        {!keyboardUp ? (
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 14), backgroundColor: c.t.colors.bg, borderTopWidth: hairline, borderTopColor: c.hair }}>
            <BigCta c={c} icon="mic" label="Start practice" onPress={practice} style={{ marginHorizontal: 0, marginTop: 0, marginBottom: 0 }} />
          </View>
        ) : null}
      </View>
      <PhrasePicker open={pickerOpen} note={note} linked={phrases} onClose={() => setPickerOpen(false)} onChanged={() => void load()} />
      <Sheet open={organizeOpen} title="Organize note" subtitle="Topic is required. Situation can stay Unsorted until later." onClose={() => setOrganizeOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 12, gap: 16 }}>
          <View style={{ gap: 8 }}><Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: c.faint }}>TOPIC · REQUIRED</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{topics.map((topic) => <Chip key={topic.id} active={topic.id === nextTopicId} onPress={() => { setNextTopicId(topic.id); setNextSituationId(null); }}>{topic.name}</Chip>)}</View></View>
          <View style={{ gap: 8 }}><Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: c.faint }}>SITUATION · OPTIONAL</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip active={nextSituationId === null} onPress={() => setNextSituationId(null)}>Unsorted</Chip>{situations.filter((item) => item.topicId === nextTopicId).map((situation) => <Chip key={situation.id} active={situation.id === nextSituationId} onPress={() => setNextSituationId(situation.id)}>{situation.title}</Chip>)}</View></View>
          <Pill full onPress={organizing ? undefined : () => void saveOrganizer()}>{organizing ? "Saving…" : "Save organization"}</Pill>
        </ScrollView>
      </Sheet>
    </>
  );
}
