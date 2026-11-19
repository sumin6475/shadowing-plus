// ask-use-sheet.tsx — what to do with a sentence Ask suggested.
//
// Opened from a How to say sentence's Save button (or Use, while Ask is linked
// to one point of a note). Each page asks for one decision only, so the step is
// never in doubt:
//
//   Choose   — save the phrase Ask picked (Phrases), save the whole sentence
//              (My Sentences); while linked, also fix the point with it or
//              keep it under the note's Others
//   Compare  — the point as it reads now, and the suggestion, word changes marked
//   Edit     — the suggestion in an input, ready to adjust, then Apply to note
//
// The note is changed by the caller (the note editor's outline), so the editor
// behind the sheet shows the new point the moment it is applied.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Text, TextInput } from "@/design/text";
import { hairline, SERIF, useTheme } from "@/design/theme";
import { Icon, Pill, type IconName } from "@/design/ui";
import { noteWordDiff, type DiffPart } from "@/lib/note-diff";
import { splitAtPhrase } from "@/lib/ask-model";

/** How Ask's phrase pick is marked inside its sentence, on the card and here:
 *  highlighter yellow behind body-colored text. Not blue, not underlined — in
 *  this cobalt app that reads as a link, and the pick is not something to tap. */
export function phraseHighlight(t: ReturnType<typeof useTheme>) {
  return { color: t.colors.ink, backgroundColor: t.colors.mark } as const;
}

/** What a sentence's Save / Use did, shown on its row and in this sheet. */
export type UseOutcome = "fixed" | "kept" | "sentence";

export interface AskUseTarget {
  /** Row key in the Ask sheet, so the outcome lands on the right row. */
  key: string;
  en: string;
  meaning: string;
  /** Ask's phrase pick; "" = none worth saving, undefined = an older reply. */
  phrase?: string;
  phraseMeaning?: string;
}
export interface AskUseSheetProps {
  target: AskUseTarget | null;
  /** Outcomes this sentence already has: those options show as done. */
  done: readonly UseOutcome[];
  /** Set while Ask is linked to a note point: adds Fix and Keep in Others. */
  point?: {
    label: string;
    noteTitle: string;
    text: string;
    /** Resolves false when the point is no longer in the note. */
    onFix: (text: string) => Promise<boolean>;
    onKeep: (text: string) => Promise<void>;
  };
  /** Opens the Phrase editor (leaves Ask). */
  onSavePhrase: (target: AskUseTarget) => void;
  /** Resolves "exists" when the sentence was already in My Sentences. */
  onSaveSentence: (target: AskUseTarget) => Promise<"saved" | "exists">;
  onDone: (target: AskUseTarget, outcome: UseOutcome) => void;
  onClose: () => void;
}

type Page = "choose" | "compare" | "edit";

export function AskUseSheet(props: AskUseSheetProps) {
  // The body mounts per target, so a new sentence always starts on Choose.
  return (
    <Modal visible={Boolean(props.target)} transparent animationType="slide" statusBarTranslucent onRequestClose={props.onClose}>
      {props.target ? <UseBody key={props.target.key} {...props} target={props.target} /> : null}
    </Modal>
  );
}

function UseBody({ target, done, point, onSavePhrase, onSaveSentence, onDone, onClose }: AskUseSheetProps & { target: AskUseTarget }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<Page>("choose");
  const [draft, setDraft] = useState(target.en);
  const [busy, setBusy] = useState<"keep" | "fix" | "sentence" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const go = (next: Page) => { setFailure(null); setPage(next); void Haptics.selectionAsync().catch(() => {}); };
  const close = () => { if (!busy) onClose(); };
  const finished = (outcome: UseOutcome) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onDone(target, outcome);
  };
  const fail = (error: unknown, fallback: string) => {
    setFailure(error instanceof Error ? error.message : fallback);
    setBusy(null);
  };

  const keep = async () => {
    if (!point) return;
    setBusy("keep");
    setFailure(null);
    try {
      await point.onKeep(target.en);
      finished("kept");
    } catch (error) { fail(error, "Couldn’t add it to Others. Try again."); }
  };
  const saveSentence = async () => {
    setBusy("sentence");
    setFailure(null);
    try {
      await onSaveSentence(target);
      finished("sentence");
    } catch (error) { fail(error, "Couldn’t save to My Sentences. Try again."); }
  };
  const apply = async () => {
    const text = draft.replace(/\s+/g, " ").trim();
    if (!text || !point) return;
    setBusy("fix");
    setFailure(null);
    try {
      if (!(await point.onFix(text))) {
        setFailure("This point changed in the note. Close Ask and edit it there.");
        setBusy(null);
        return;
      }
      finished("fixed");
    } catch (error) { fail(error, "Couldn’t update the note. Try again."); }
  };

  const picked = target.phrase?.trim() ?? "";
  const split = splitAtPhrase(target.en, picked);
  const step = page === "compare" ? "Step 1 of 2" : page === "edit" ? "Step 2 of 2" : null;
  const title = page === "choose" ? (point ? "Use this sentence" : "Save this sentence") : page === "compare" ? "Compare" : "Edit your point";
  const isDone = (outcome: UseOutcome) => done.includes(outcome);
  // The phrase Ask recommends leads when there is one; otherwise the sentence.
  const phraseOption = (
    <Option key="phrase" icon="bank" primary={Boolean(picked) && !point}
      title={picked ? `Save phrase · ${picked}` : "Save a phrase"}
      subtitle={picked ? target.phraseMeaning?.trim() || "Practice it as its own phrase" : target.phrase === "" ? "Choose the words to keep" : "Find the phrase to keep"}
      disabled={Boolean(busy)} onPress={() => onSavePhrase(target)} />
  );
  const sentenceOption = (
    <Option key="sentence" icon="text" primary={!picked && !point} done={isDone("sentence")}
      title="Save to My Sentences" subtitle={isDone("sentence") ? "Saved" : "Keep the whole sentence to practice"}
      busy={busy === "sentence"} disabled={Boolean(busy) || isDone("sentence")} onPress={() => void saveSentence()} />
  );
  const options = [
    ...(point ? [
      <Option key="fix" icon="pen" title={`Fix ${point.label}`} subtitle={point.text.trim() || "Fill this empty point"} primary
        disabled={Boolean(busy)} onPress={() => go("compare")} />,
      <Option key="keep" icon="folder" title="Keep in Others" done={isDone("kept")}
        subtitle={isDone("kept") ? "Added to this note" : "Save it in this note for later"}
        busy={busy === "keep"} disabled={Boolean(busy) || isDone("kept")} onPress={() => void keep()} />,
    ] : []),
    ...(picked ? [phraseOption, sentenceOption] : [sentenceOption, phraseOption]),
  ];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,22,28,0.3)" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} style={{ flex: 1 }} />
        <View accessibilityViewIsModal style={{ maxHeight: "88%", backgroundColor: t.colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          <View style={{ width: 34, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: t.colors.soft, marginBottom: 12 }} />
          {/* Header: back (after the first page), the page's name and step, close. */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, minHeight: 44 }}>
            <View style={{ width: 44 }}>
              {page !== "choose" ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={Boolean(busy)} hitSlop={6}
                  onPress={() => go(page === "edit" ? "compare" : "choose")}
                  style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
                  <Icon name="back" s={20} w={2.2} c={t.colors.ink} />
                </Pressable>
              ) : null}
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text accessibilityRole="header" style={{ fontSize: 17, lineHeight: 22, fontWeight: "700", color: t.colors.ink }}>{title}</Text>
              {step ? <Text style={{ fontSize: 12.5, lineHeight: 16, fontWeight: "600", color: t.colors.ink3 }}>{step}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={Boolean(busy)} hitSlop={6} onPress={close}
              style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.colors.soft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="x" s={13} w={2.4} c={t.colors.ink2} />
              </View>
            </Pressable>
          </View>

          <PageIn key={page}>
            {page === "choose" ? (
              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 14, gap: 22 }} keyboardShouldPersistTaps="handled">
                <View style={{ gap: 6 }}>
                  <Text style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 30, color: t.colors.ink }}>
                    {split ? <>{split[0]}<Text style={phraseHighlight(t)}>{split[1]}</Text>{split[2]}</> : target.en}
                  </Text>
                  {target.meaning ? <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink2 }}>{target.meaning}</Text> : null}
                </View>
                <View style={{ borderRadius: 18, backgroundColor: t.colors.bg, overflow: "hidden" }}>
                  {options.map((option, i) => (
                    <View key={option.key}>
                      {i ? <Separator /> : null}
                      {option}
                    </View>
                  ))}
                </View>
                {failure ? <Text accessibilityRole="alert" style={{ fontSize: 14.5, lineHeight: 20, color: t.colors.warn }}>{failure}</Text> : null}
              </ScrollView>
            ) : page === "compare" && point ? (
              <ComparePage point={point} suggestion={target.en} onContinue={() => { setDraft(target.en); go("edit"); }} />
            ) : point ? (
              <View style={{ paddingHorizontal: 22, paddingTop: 14, gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>{`WAS · ${point.label.toUpperCase()}`}</Text>
                  <Text numberOfLines={2} style={{ fontSize: 15, lineHeight: 21, color: point.text.trim() ? t.colors.ink2 : t.colors.ink3 }}>
                    {point.text.trim() || "Empty point"}
                  </Text>
                </View>
                <TextInput accessibilityLabel={`New text for ${point.label}`} autoFocus multiline scrollEnabled
                  editable={!busy} value={draft} onChangeText={setDraft} maxLength={600}
                  style={{ minHeight: 96, maxHeight: 200, fontSize: 18, lineHeight: 26, color: t.colors.ink, backgroundColor: t.colors.bg,
                    borderRadius: 16, borderWidth: hairline, borderColor: t.colors.sep, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" }} />
                {failure ? <Text accessibilityRole="alert" style={{ fontSize: 14.5, lineHeight: 20, color: t.colors.warn }}>{failure}</Text> : null}
                <Pill disabled={Boolean(busy) || !draft.trim()} onPress={() => void apply()} style={{ alignSelf: "stretch", marginTop: 4 }}>
                  {busy === "fix" ? "Applying…" : "Apply to note"}
                </Pill>
              </View>
            ) : null}
          </PageIn>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Now above, suggestion below, changed words marked on both. One action. */
function ComparePage({ point, suggestion, onContinue }: { point: { label: string; text: string }; suggestion: string; onContinue: () => void }) {
  const t = useTheme();
  const diff = useMemo(() => noteWordDiff(point.text, suggestion), [point.text, suggestion]);
  return (
    <View style={{ paddingHorizontal: 22, paddingTop: 14, gap: 12 }}>
      <View style={{ borderRadius: 18, backgroundColor: t.colors.bg, padding: 16, gap: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.ink3 }}>{`NOW · ${point.label.toUpperCase()}`}</Text>
        {point.text.trim() ? (
          <Text style={{ fontSize: 17, lineHeight: 25, color: t.colors.ink2 }}>
            <DiffText parts={diff.before} changedStyle={{ color: t.colors.ink3, textDecorationLine: "line-through" }} />
          </Text>
        ) : (
          <Text style={{ fontSize: 17, lineHeight: 25, color: t.colors.ink3 }}>Empty point</Text>
        )}
      </View>
      <View style={{ alignItems: "center" }}>
        <View style={{ transform: [{ rotate: "90deg" }] }}>
          <Icon name="arrow" s={18} w={2} c={t.colors.ink3} />
        </View>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: t.colors.accS, padding: 16, gap: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.6, color: t.colors.accD }}>SUGGESTED</Text>
        <Text style={{ fontSize: 17, lineHeight: 25, color: t.colors.ink }}>
          <DiffText parts={diff.after} changedStyle={{ color: t.colors.accD, fontWeight: "700" }} />
        </Text>
      </View>
      <Pill onPress={onContinue} style={{ alignSelf: "stretch", marginTop: 10 }}>Continue</Pill>
    </View>
  );
}

function DiffText({ parts, changedStyle }: { parts: DiffPart[]; changedStyle: object }) {
  return (
    <>
      {parts.map((part, i) => {
        // The space before a word belongs to the sentence, not to the change:
        // a struck-through gap reads as a stray dash.
        const lead = part.changed && part.text.startsWith(" ") ? " " : "";
        return (
          <Text key={i}>
            {lead}
            <Text style={part.changed ? changedStyle : undefined}>{part.text.slice(lead.length)}</Text>
          </Text>
        );
      })}
    </>
  );
}

function Option({ icon, title, subtitle, primary, busy, done, disabled, onPress }: {
  icon: IconName; title: string; subtitle: string; primary?: boolean; busy?: boolean; done?: boolean; disabled?: boolean; onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} accessibilityState={{ disabled, busy, checked: done }}
      disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 15, paddingVertical: 11, opacity: pressed ? 0.6 : disabled && !busy && !done ? 0.55 : 1 })}>
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: primary && !done ? t.colors.acc : t.colors.card }}>
        <Icon name={icon} s={16} w={2} c={primary && !done ? t.colors.onAcc : t.colors.ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontSize: 16, lineHeight: 21, fontWeight: "600", color: t.colors.ink }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 18, color: done ? t.colors.accD : t.colors.ink2 }}>{subtitle}</Text>
      </View>
      {busy
        ? <ActivityIndicator size="small" color={t.colors.accD} />
        : done
          ? <Icon name="check" s={15} w={2.6} c={t.colors.accD} />
          : <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />}
    </Pressable>
  );
}

function Separator() {
  const t = useTheme();
  return <View style={{ height: hairline, backgroundColor: t.colors.sep, marginLeft: 62 }} />;
}

/** Each page slides in a little, so moving on reads as moving forward. */
function PageIn({ children }: { children: ReactNode }) {
  const progress = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 200, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return (
    <Animated.View style={{ opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}
