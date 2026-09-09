// studio-information.tsx — Topic → Situation → Speaking Note → Practice
// Attempt. Uses the existing Saylo visual system and native tab shell; it does
// not render or style the bottom navigation bar.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  ActivityIndicator,
  Alert,
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

function situationDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
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

function attemptDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

// Section = header + one inset grouped card, spaced as a unit so the gap
// between groups (Screen gap + marginTop) is visibly larger than the gap
// between a header and its card. iOS motif: rows on a 52pt unit, hairline
// separators, type on the 17/15/13/12/11 scale, controls as capsules.
function Group({ title, action, onAction, first, children }: { title: string; action?: string; onAction?: () => void; first?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 8, marginTop: first ? 4 : 10 }}>
      <StudioSectionHeader title={title} action={action} onAction={onAction} chevron={false} />
      {children}
    </View>
  );
}

function GroupEmpty({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ paddingVertical: 16, fontSize: 13, lineHeight: 18, color: t.colors.ink3 }}>{children}</Text>;
}

// Notes are the situation's primary unit, so the current one gets its practice
// affordance inside the list rather than a separate hero card above it. The
// hero repeated the same note twice and pushed the list off the first screen.
function SituationNoteRow({ note, first, primary, onPress, onPractice }: { note: SpeakingNote; first?: boolean; primary?: boolean; onPress: () => void; onPractice: () => void }) {
  const t = useTheme();
  const meta = [
    note.goal || null,
    note.phraseCount ? `${note.phraseCount} phrase${note.phraseCount === 1 ? "" : "s"}` : null,
    note.attemptCount ? `${note.attemptCount} attempt${note.attemptCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <View style={{ minHeight: 52, borderTopWidth: first ? 0 : hairline, borderTopColor: t.colors.sep, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${note.title}. ${meta}`}
        style={({ pressed }) => ({ flex: 1, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ fontSize: 17, fontWeight: "600", color: t.colors.ink }} numberOfLines={1}>{note.title}</Text>
        {meta ? <Text style={{ fontSize: 13, color: t.colors.ink2, marginTop: 2 }} numberOfLines={1}>{meta}</Text> : null}
      </Pressable>
      <Pressable
        onPress={onPractice}
        accessibilityRole="button"
        accessibilityLabel={`Practice ${note.title}`}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 34,
          height: 34,
          borderRadius: 9999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primary ? t.colors.acc : t.colors.soft,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="mic" s={16} w={2} c={primary ? "#fff" : t.colors.accD} />
      </Pressable>
    </View>
  );
}

// A database-style two-column list: the phrase on the left, its learning state
// on the right under a column header, which is what the PRD asks for.
function PhraseTableRow({ phrase, first }: { phrase: NotePhrase; first?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ minHeight: 52, paddingVertical: 9, borderTopWidth: first ? 0 : hairline, borderTopColor: t.colors.sep, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color: t.colors.ink }} numberOfLines={1}>{phrase.text}</Text>
        {phrase.translation ? <Text style={{ fontSize: 12, color: t.colors.ink3, marginTop: 2 }} numberOfLines={1}>{phrase.translation}</Text> : null}
      </View>
      <Text style={{ width: 88, textAlign: "right", fontSize: 13, fontWeight: "600", color: t.colors.ink2 }} numberOfLines={1}>
        {phraseStatusLabel(phrase.learningStatus)}
      </Text>
    </View>
  );
}

export function StudioSituationScreen({ id, topicId, title, nav }: { id: string; topicId: string; title?: string; nav: Nav }) {
  const t = useTheme();
  const [topics, setTopics] = useState<StudioTopic[]>([]);
  const [situations, setSituations] = useState<StudioSituation[]>([]);
  const [notes, setNotes] = useState<SpeakingNote[] | null>(null);
  const [phrases, setPhrases] = useState<NotePhrase[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [showAllPhrases, setShowAllPhrases] = useState(false);
  const load = useCallback(async () => {
    try {
      const [allTopics, allSituations, linkedNotes, linkedPhrases, recentAttempts] = await Promise.all([fetchStudioTopics(), fetchStudioSituations(topicId), fetchSpeakingNotes({ situationId: id }), fetchSituationPhrases(id), fetchPracticeAttempts({ situationId: id, limit: 10 })]);
      setTopics(allTopics); setSituations(allSituations); setNotes(linkedNotes); setPhrases(linkedPhrases); setAttempts(recentAttempts); setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load this situation."); }
  }, [id, topicId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const situation = situations.find((item) => item.id === id);
  const when = situationDate(situation?.eventDate ?? null);
  const noteTitleById = useMemo(() => new Map((notes ?? []).map((note) => [note.id, note.title])), [notes]);
  const noteCount = notes?.length ?? 0;
  const headerMeta = [
    when,
    `${noteCount} note${noteCount === 1 ? "" : "s"}`,
    `${attempts.length} attempt${attempts.length === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ");
  const visiblePhrases = showAllPhrases ? phrases : phrases.slice(0, 5);
  const list: ViewStyle = { paddingVertical: 4 };
  return (
    <>
      <Screen bottomPad={40}>
        <BackBar onBack={nav.pop} />
        <Stagger>
          <View style={{ paddingHorizontal: 2, paddingBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", letterSpacing: 0.2, color: t.colors.accD }}>{situation?.topicName ?? "Topic"}</Text>
            <Serif style={{ fontSize: 28, lineHeight: 33, color: t.colors.ink, marginTop: 4 }}>{situation?.title ?? title ?? "Situation"}</Serif>
            {situation?.description ? <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink2, marginTop: 6 }}>{situation.description}</Text> : null}
            <Text style={{ fontSize: 13, color: t.colors.ink3, marginTop: 8 }}>{headerMeta}</Text>
          </View>

          <Group title="Speaking notes" action="New" onAction={() => setQuickOpen(true)} first>
            {notes === null && !error ? <Loading /> : error ? <ErrorCard message={error} retry={load} /> : (
              <Card style={list}>
                {(notes ?? []).map((note, index) => (
                  <SituationNoteRow
                    key={note.id}
                    note={note}
                    first={index === 0}
                    primary={index === 0}
                    onPress={() => nav.push("speakingNote", { id: note.id })}
                    onPractice={() => startNotePractice(nav, note)}
                  />
                ))}
                {!notes?.length ? <GroupEmpty>Add one clear thing you want to say.</GroupEmpty> : null}
              </Card>
            )}
          </Group>

          <Group
            title="Useful phrases"
            action={phrases.length > 5 ? (showAllPhrases ? "Show less" : `All ${phrases.length}`) : undefined}
            onAction={() => setShowAllPhrases((value) => !value)}
          >
            <Card style={list}>
              {phrases.length ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 6, paddingBottom: 4 }}>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: "600", letterSpacing: 0.6, color: t.colors.ink3 }}>PHRASE</Text>
                    <Text style={{ width: 88, textAlign: "right", fontSize: 11, fontWeight: "600", letterSpacing: 0.6, color: t.colors.ink3 }}>STATUS</Text>
                  </View>
                  {visiblePhrases.map((phrase) => <PhraseTableRow key={phrase.id} phrase={phrase} />)}
                </>
              ) : (
                <GroupEmpty>Linked phrases from these notes will appear here.</GroupEmpty>
              )}
            </Card>
          </Group>

          {/* Same container as the sections above, so the screen keeps one
              idiom; attempts read lighter through smaller type and secondary
              color, not through a different kind of list. */}
          <Group title="Recent attempts" action={attempts.length > 3 ? "All" : undefined} onAction={() => nav.push("sessionsList")}>
            <Card style={list}>
              {attempts.slice(0, 3).map((attempt, index) => (
                <View key={attempt.id} style={{ minHeight: 44, paddingVertical: 8, borderTopWidth: index ? hairline : 0, borderTopColor: t.colors.sep, flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ width: 52, fontSize: 13, color: t.colors.ink3 }}>{attemptDate(attempt.createdAt)}</Text>
                  <Text style={{ flex: 1, fontSize: 15, color: t.colors.ink2 }} numberOfLines={1}>{(attempt.noteId && noteTitleById.get(attempt.noteId)) || "Free talk"}</Text>
                  <Text style={{ fontSize: 13, color: t.colors.ink3 }}>{Math.round(attempt.durationSeconds ?? 0)}s</Text>
                </View>
              ))}
              {!attempts.length ? <GroupEmpty>Attempts stay a quiet history here.</GroupEmpty> : null}
            </Card>
          </Group>
        </Stagger>
      </Screen>
      <QuickNoteSheet open={quickOpen} nav={nav} topics={topics} situations={situations} initialTopicId={topicId} initialSituationId={id} onClose={() => setQuickOpen(false)} onSaved={() => void load()} />
    </>
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

export function SpeakingNoteScreen({ id, nav }: { id: string; nav: Nav }) {
  const t = useTheme();
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
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [nextTopicId, setNextTopicId] = useState<string | null>(null);
  const [nextSituationId, setNextSituationId] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const found = await fetchSpeakingNote(id);
      if (!found) throw new Error("This note no longer exists.");
      const [linked, history, allTopics, allSituations] = await Promise.all([
        fetchNotePhrases(found),
        fetchPracticeAttempts({ noteId: id, limit: 10 }),
        fetchStudioTopics(),
        fetchStudioSituations(),
      ]);
      setNote(found); setTitle(found.title); setGoal(found.goal); setBody(found.body); setPhrases(linked); setAttempts(history); setTopics(allTopics); setSituations(allSituations); setError(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn’t load this note."); }
  }, [id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const save = async () => {
    if (!note || !title.trim() || !goal.trim() || !body.trim()) return;
    setSaving(true);
    try { await updateSpeakingNote(id, { title, goal, body, topicId: note.topicId, situationId: note.situationId }); setNote({ ...note, title: title.trim(), goal: goal.trim(), body: body.trim() }); nav.invalidateSpeakingData(); nav.notify("Note saved"); }
    catch (caught) { Alert.alert("Couldn’t save note", caught instanceof Error ? caught.message : "Try again."); }
    finally { setSaving(false); }
  };
  const openOrganizer = () => {
    setNextTopicId(note?.topicId ?? null);
    setNextSituationId(note?.situationId ?? null);
    setOrganizeOpen(true);
  };
  const saveOrganizer = async () => {
    if (!note || !nextTopicId) return;
    const selectedSituation = situations.find((item) => item.id === nextSituationId);
    setSaving(true);
    try {
      await updateSpeakingNote(id, { title, goal, body, topicId: nextTopicId, situationId: nextSituationId });
      const nextTopic = topics.find((item) => item.id === nextTopicId);
      setNote({ ...note, topicId: nextTopicId, topicName: nextTopic?.name ?? null, situationId: nextSituationId, situationTitle: selectedSituation?.title ?? null, status: nextSituationId ? "active" : "unsorted" });
      setOrganizeOpen(false);
      nav.invalidateSpeakingData();
      nav.notify(nextSituationId ? "Note organized" : "Saved to Unsorted");
    } catch (caught) {
      Alert.alert("Couldn’t organize note", caught instanceof Error ? caught.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };
  if (!note && !error) return <Screen><BackBar onBack={nav.pop} /><Loading /></Screen>;
  if (error || !note) return <Screen><BackBar onBack={nav.pop} /><ErrorCard message={error ?? "Note not found"} retry={load} /></Screen>;
  const practice = () => startNotePractice(nav, { ...note, title, goal, body });
  return (
    <>
      <Screen bottomPad={44}>
        <BackBar onBack={nav.pop} right={<Chip onPress={saving ? undefined : () => void save()} active={false}>{saving ? "Saving…" : "Save"}</Chip>} />
        <Stagger>
          <View style={{ paddingHorizontal: 2 }}><Pressable onPress={openOrganizer} style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" }}><Text style={{ fontSize: 12.5, color: t.colors.accD, fontWeight: "700" }}>{note.topicName}{note.situationTitle ? ` / ${note.situationTitle}` : " / Unsorted"}</Text><Icon name="chev" s={10} w={2.4} c={t.colors.accD} /></Pressable><TextInput value={title} onChangeText={setTitle} multiline style={{ fontFamily: "Newsreader", fontSize: 31, lineHeight: 36, color: t.colors.ink, padding: 0, marginTop: 7 }} /></View>
          <View style={{ gap: 7 }}><Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: t.colors.ink3 }}>SPEAKING GOAL</Text><TextInput value={goal} onChangeText={setGoal} multiline placeholder="What should the listener understand?" placeholderTextColor={t.colors.ink3} style={{ fontSize: 17, fontWeight: "600", lineHeight: 24, color: t.colors.ink, padding: 0 }} /></View>
          <View style={{ minHeight: 180, paddingVertical: 6 }}><TextInput ref={bodyRef} value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="Write freely…" placeholderTextColor={t.colors.ink3} style={{ minHeight: 170, fontSize: 16, lineHeight: 25, color: t.colors.ink, padding: 0 }} /></View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip icon="plus" onPress={() => bodyRef.current?.focus()}>Add thought</Chip><Chip icon="mic" onPress={practice}>Record idea</Chip><Chip icon="bank" onPress={() => setPickerOpen(true)}>Link phrase</Chip><Chip icon="search" onPress={() => setPickerOpen(true)}>How can I say this?</Chip></View>
          <Sect title="Linked phrases" action="+ Link phrase" onAction={() => setPickerOpen(true)} />
          <Card style={{ paddingVertical: 4 }}>{phrases.map((phrase, index) => <View key={phrase.id} style={{ minHeight: 57, borderTopWidth: index ? 1 : 0, borderTopColor: t.colors.sep, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1 }}><Text style={{ fontSize: 15, fontWeight: "700", color: t.colors.ink }}>{phrase.text}</Text>{phrase.translation ? <Text style={{ fontSize: 12.5, color: t.colors.ink3, marginTop: 3 }}>{phrase.translation}</Text> : null}</View><Chip>{phrase.learningStatus.replace("_", " ")}</Chip></View>)}{!phrases.length ? <Text style={{ paddingVertical: 22, textAlign: "center", color: t.colors.ink3 }}>Bring saved language into this note.</Text> : null}</Card>
          <Sect title="Previous attempts" />
          {attempts.slice(0, 3).map((attempt) => <Card key={attempt.id}><View style={{ flexDirection: "row", alignItems: "center" }}><Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: t.colors.ink }}>{attemptDate(attempt.createdAt)} · {Math.round(attempt.durationSeconds ?? 0)} sec</Text><Icon name="wave2" s={17} c={t.colors.accD} /></View>{attempt.repairSuggestion ? <Text style={{ fontSize: 13.5, color: t.colors.ink2, lineHeight: 20, marginTop: 9 }} numberOfLines={2}>{attempt.repairSuggestion}</Text> : null}</Card>)}
          <Pill full icon="mic" onPress={practice}>Start practice</Pill>
        </Stagger>
      </Screen>
      <PhrasePicker open={pickerOpen} note={note} linked={phrases} onClose={() => setPickerOpen(false)} onChanged={() => void load()} />
      <Sheet open={organizeOpen} title="Organize note" subtitle="Topic is required. Situation can stay Unsorted until later." onClose={() => setOrganizeOpen(false)}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 12, gap: 16 }}>
          <View style={{ gap: 8 }}><Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: t.colors.ink3 }}>TOPIC · REQUIRED</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{topics.map((topic) => <Chip key={topic.id} active={topic.id === nextTopicId} onPress={() => { setNextTopicId(topic.id); setNextSituationId(null); }}>{topic.name}</Chip>)}</View></View>
          <View style={{ gap: 8 }}><Text style={{ fontSize: 12, fontWeight: "800", letterSpacing: 0.55, color: t.colors.ink3 }}>SITUATION · OPTIONAL</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><Chip active={nextSituationId === null} onPress={() => setNextSituationId(null)}>Unsorted</Chip>{situations.filter((item) => item.topicId === nextTopicId).map((situation) => <Chip key={situation.id} active={situation.id === nextSituationId} onPress={() => setNextSituationId(situation.id)}>{situation.title}</Chip>)}</View></View>
          <Pill full onPress={saving ? undefined : () => void saveOrganizer()}>{saving ? "Saving…" : "Save organization"}</Pill>
        </ScrollView>
      </Sheet>
    </>
  );
}
