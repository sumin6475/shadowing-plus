// point-use-sheet.tsx — what to do with a sentence Ask suggested for a point.
//
// Opened from an expression's Use button while Ask is linked to one point of a
// note. Each page asks for one decision only, so the step is never in doubt:
//
//   Choose   — fix the point with it, keep it under Others, or save it as a phrase
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

export interface PointUseTarget {
  /** Row key in the Ask sheet, so the outcome lands on the right row. */
  key: string;
  en: string;
  meaning: string;
}
export interface PointUseSheetProps {
  target: PointUseTarget | null;
  /** The linked point as it reads now. */
  point: { label: string; noteTitle: string; text: string };
  /** Resolves false when the point is no longer in the note. */
  onFix: (text: string) => Promise<boolean>;
  onKeep: (text: string) => Promise<void>;
  onSavePhrase: (target: PointUseTarget) => void;
  onDone: (target: PointUseTarget, outcome: "fixed" | "kept") => void;
  onClose: () => void;
}

type Page = "choose" | "compare" | "edit";

export function PointUseSheet(props: PointUseSheetProps) {
  // The body mounts per target, so a new sentence always starts on Choose.
  return (
    <Modal visible={Boolean(props.target)} transparent animationType="slide" statusBarTranslucent onRequestClose={props.onClose}>
      {props.target ? <UseBody key={props.target.key} {...props} target={props.target} /> : null}
    </Modal>
  );
}

function UseBody({ target, point, onFix, onKeep, onSavePhrase, onDone, onClose }: PointUseSheetProps & { target: PointUseTarget }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<Page>("choose");
  const [draft, setDraft] = useState(target.en);
  const [busy, setBusy] = useState<"keep" | "fix" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const go = (next: Page) => { setFailure(null); setPage(next); void Haptics.selectionAsync().catch(() => {}); };
  const close = () => { if (!busy) onClose(); };

  const keep = async () => {
    setBusy("keep");
    setFailure(null);
    try {
      await onKeep(target.en);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone(target, "kept");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Couldn’t add it to Others. Try again.");
      setBusy(null);
    }
  };
  const apply = async () => {
    const text = draft.replace(/\s+/g, " ").trim();
    if (!text) return;
    setBusy("fix");
    setFailure(null);
    try {
      if (!(await onFix(text))) {
        setFailure("This point changed in the note. Close Ask and edit it there.");
        setBusy(null);
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone(target, "fixed");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "Couldn’t update the note. Try again.");
      setBusy(null);
    }
  };

  const step = page === "compare" ? "Step 1 of 2" : page === "edit" ? "Step 2 of 2" : null;
  const title = page === "choose" ? "Use this sentence" : page === "compare" ? "Compare" : "Edit your point";
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
                  <Text style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 30, color: t.colors.ink }}>{target.en}</Text>
                  {target.meaning ? <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink2 }}>{target.meaning}</Text> : null}
                </View>
                <View style={{ borderRadius: 18, backgroundColor: t.colors.bg, overflow: "hidden" }}>
                  <Option icon="pen" title={`Fix ${point.label}`} subtitle={point.text.trim() || "Fill this empty point"} primary
                    disabled={Boolean(busy)} onPress={() => go("compare")} />
                  <Separator />
                  <Option icon="folder" title="Keep in Others" subtitle="Save it in this note for later" busy={busy === "keep"}
                    disabled={Boolean(busy)} onPress={() => void keep()} />
                  <Separator />
                  <Option icon="bank" title="Save to Phrases" subtitle="Practice it as its own phrase"
                    disabled={Boolean(busy)} onPress={() => onSavePhrase(target)} />
                </View>
                {failure ? <Text accessibilityRole="alert" style={{ fontSize: 14.5, lineHeight: 20, color: t.colors.warn }}>{failure}</Text> : null}
              </ScrollView>
            ) : page === "compare" ? (
              <ComparePage point={point} suggestion={target.en} onContinue={() => { setDraft(target.en); go("edit"); }} />
            ) : (
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
            )}
          </PageIn>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Now above, suggestion below, changed words marked on both. One action. */
function ComparePage({ point, suggestion, onContinue }: { point: PointUseSheetProps["point"]; suggestion: string; onContinue: () => void }) {
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

function Option({ icon, title, subtitle, primary, busy, disabled, onPress }: {
  icon: IconName; title: string; subtitle: string; primary?: boolean; busy?: boolean; disabled?: boolean; onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} accessibilityState={{ disabled, busy }}
      disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 15, paddingVertical: 11, opacity: pressed ? 0.6 : disabled && !busy ? 0.55 : 1 })}>
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: primary ? t.colors.acc : t.colors.card }}>
        <Icon name={icon} s={16} w={2} c={primary ? t.colors.onAcc : t.colors.ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: "600", color: t.colors.ink }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontSize: 13.5, lineHeight: 18, color: t.colors.ink2 }}>{subtitle}</Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={t.colors.accD} /> : <Icon name="chev" s={14} w={2.2} c={t.colors.ink3} />}
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
