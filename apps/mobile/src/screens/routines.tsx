import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { RecoveryState } from "@/components/recovery-state";
import { EmptyState } from "@/design/empty-state";
import { FONT, Motif } from "@/design/mobile-tokens";
import { Text, TextInput } from "@/design/text";
import { useTheme } from "@/design/theme";
import { BackBar, Card, confirmDelete, Icon, Pill, Screen, SwipeRow } from "@/design/ui";
import { useAuth } from "@/lib/auth";
import { loadNotes, type Note } from "@/lib/mvp";
import { loadNoteFolders, type NoteFolder } from "@/lib/note-growth";
import {
  pickRoutine,
  sentences,
  toneOf,
  type PersonalSentence,
  type PracticeItem,
  type Routine,
  type RoutineTone,
  type Source,
} from "@/lib/review-routines";
import { supabase } from "@/lib/supabase";
import type { Nav } from "./nav";

function failure(e: unknown) {
  Alert.alert("Couldn’t finish", String((e as Error)?.message || e));
}

// ── Shared pieces: the parts an iOS sheet and grouped list are made of ─────

/** The accent as text: the navy in light mode, its lighter step in dark. */
function useTint() {
  const t = useTheme();
  return t.dark ? t.colors.accD : t.colors.acc;
}
/** Liquid Glass exists from iOS 26; older systems get the blur material. */
const LIQUID = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
/** A control's surface in the system's glass: the material iOS 26 gives
 *  its own floating buttons. `tint` colors the glass for the one main
 *  action; `scheme` says what it floats over when that isn't the page. */
function Glass({
  style,
  tint,
  scheme,
  interactive,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  tint?: string;
  scheme?: "light" | "dark";
  /** The glass answers the touch itself, as system buttons do. */
  interactive?: boolean;
  children?: ReactNode;
}) {
  const t = useTheme();
  const on = scheme ?? (t.dark ? "dark" : "light");
  if (LIQUID)
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} colorScheme={on} style={style}>
        {children}
      </GlassView>
    );
  return (
    <View
      style={[
        style,
        {
          overflow: "hidden",
          backgroundColor: tint,
          borderWidth: tint ? 0 : StyleSheet.hairlineWidth,
          borderColor: on === "dark" ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.7)",
        },
      ]}
    >
      {tint ? null : (
        <BlurView
          intensity={60}
          tint={on === "dark" ? "systemThinMaterialDark" : "systemThinMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}
/** A page sheet with the bar iOS gives an add/edit sheet: Cancel on the
 *  left, the title, and the one confirming action on the right. */
function Sheet({
  title,
  action,
  onAction,
  disabled,
  close,
  children,
}: {
  title: string;
  action: string;
  onAction: () => void;
  disabled?: boolean;
  close: () => void;
  children: ReactNode;
}) {
  const t = useTheme();
  const tint = useTint();
  return (
    <Modal visible presentationStyle="pageSheet" animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
        <View
          style={{
            height: 56,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Pressable accessibilityRole="button" hitSlop={12} onPress={close}>
              <Text style={{ fontSize: 17, color: tint }}>Cancel</Text>
            </Pressable>
          </View>
          <Text accessibilityRole="header" style={{ ...FONT.semibold, fontSize: 17, color: t.colors.ink }}>
            {title}
          </Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: Boolean(disabled) }}
              disabled={disabled}
              hitSlop={12}
              onPress={onAction}
            >
              <Text
                style={{
                  ...FONT.semibold,
                  fontSize: 17,
                  color: disabled ? t.colors.ink3 : tint,
                  opacity: disabled ? 0.55 : 1,
                }}
              >
                {action}
              </Text>
            </Pressable>
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 56, gap: 22 }}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
/** A labelled group: the small label above an inset-grouped card. */
function Section({ label, children }: { label?: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text
          accessibilityRole="header"
          style={{ ...FONT.semibold, fontSize: 13, lineHeight: 16, color: t.colors.ink2, paddingHorizontal: 4 }}
        >
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.colors.card, borderRadius: t.r, paddingHorizontal: 16 }, style]}>
      {children}
    </View>
  );
}
/** The hairline between two rows of a group. */
function RowLine() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.sep }} />;
}
/** A settings row: what it is on the left, its control on the right. */
function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        minHeight: Motif.row,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 17, color: t.colors.ink, flexShrink: 1 }}>{label}</Text>
      {children}
    </View>
  );
}
/** A choice in a list: its name, and a checkmark when it is chosen. */
function CheckRow({ title, checked, onPress }: { title: string; checked: boolean; onPress: () => void }) {
  const t = useTheme();
  const tint = useTint();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: checked }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: Motif.row,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.55 : 1,
      })}
    >
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, color: t.colors.ink }}>
        {title}
      </Text>
      {checked ? <SymbolView name="checkmark" size={16} weight="semibold" tintColor={tint} /> : null}
    </Pressable>
  );
}
/** iOS's segmented control: one of a few, all visible at once. */
function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        { flexDirection: "row", height: 36, padding: 2, borderRadius: 10, backgroundColor: t.colors.soft },
        style,
      ]}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[
              { flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
              on
                ? {
                    backgroundColor: t.dark ? "#636366" : "#FFFFFF",
                    shadowColor: "#000",
                    shadowOpacity: 0.12,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                  }
                : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={{ ...(on ? FONT.semibold : FONT.medium), fontSize: 13, color: t.colors.ink }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
/** iOS's stepper: a count nudged up or down, never typed. */
function Stepper({
  value,
  onChange,
  min = 1,
  max = 50,
  noun,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  noun: string;
}) {
  const t = useTheme();
  const side = (delta: number, symbol: "minus" | "plus", label: string) => {
    const off = delta < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: off }}
        disabled={off}
        hitSlop={6}
        onPress={() => {
          void Haptics.selectionAsync();
          onChange(value + delta);
        }}
        style={({ pressed }) => ({
          width: 40,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          opacity: off ? 0.3 : pressed ? 0.5 : 1,
        })}
      >
        <SymbolView name={symbol} size={14} weight="semibold" tintColor={t.colors.ink} />
      </Pressable>
    );
  };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 32,
        borderRadius: 16,
        backgroundColor: t.colors.soft,
      }}
    >
      {side(-1, "minus", `Fewer ${noun}`)}
      <Text
        accessibilityLabel={`${value} ${noun}`}
        style={{ ...FONT.semibold, minWidth: 22, textAlign: "center", fontSize: 16, color: t.colors.ink, fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
      {side(1, "plus", `More ${noun}`)}
    </View>
  );
}

// ── My Sentences ───────────────────────────────────────────────────────────

type Draft = { id: string | null; text: string; meaning: string; note: string | null };

export function MySentences({ nav }: { nav: Nav }) {
  const t = useTheme();
  const [rows, setRows] = useState<PersonalSentence[] | null>(null),
    [notes, setNotes] = useState<Note[]>([]),
    [query, setQuery] = useState(""),
    [draft, setDraft] = useState<Draft | null>(null),
    [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const refresh = () => sentences().then(setRows);
  // The first load fails in place (with a way to retry), not as an alert over
  // an empty page that would invite adding a sentence that can't be saved.
  const loadFailed = (e: unknown) => setLoadError(String((e as Error)?.message || e));
  const load = () => {
    setLoadError("");
    void refresh().catch(loadFailed);
  };
  useEffect(() => {
    void sentences().then(setRows).catch(loadFailed);
    void loadNotes().then(setNotes).catch(() => undefined);
  }, []);
  const open = (s?: PersonalSentence) =>
    setDraft({ id: s?.id ?? null, text: s?.text ?? "", meaning: s?.meaning ?? "", note: s?.note_id ?? null });
  async function run(change: () => PromiseLike<{ error: unknown }>) {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await change();
      if (error) throw error;
      setDraft(null);
      await refresh();
      nav.invalidateSpeakingData();
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  const table = () => supabase.from("personal_sentences");
  const save = (d: Draft) => {
    const values = { text: d.text.trim(), meaning: d.meaning.trim(), note_id: d.note };
    return run(() => (d.id ? table().update(values).eq("id", d.id) : table().insert(values)));
  };
  const remove = (id: string) => run(() => table().delete().eq("id", id));
  const askRemove = (s: { id: string; text: string }) =>
    confirmDelete({ title: "Delete this sentence?", message: s.text, onConfirm: () => void remove(s.id) });
  const needle = query.trim().toLowerCase();
  const shown = (rows ?? []).filter((s) => `${s.text} ${s.meaning}`.toLowerCase().includes(needle));
  const noteTitle = (id: string | null) => (id ? notes.find((n) => n.id === id)?.title || "Untitled" : null);
  return (
    <Screen>
      <BackBar
        onBack={nav.pop}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add sentence"
            onPress={() => open()}
            style={[
              {
                width: Motif.tapTarget,
                height: Motif.tapTarget,
                borderRadius: Motif.tapTarget / 2,
                backgroundColor: t.colors.card,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: t.ring,
              },
              t.shadowCard,
            ]}
          >
            <SymbolView name="plus" size={18} weight="semibold" tintColor={t.colors.ink} />
          </Pressable>
        }
      />
      <View style={{ gap: 4, paddingHorizontal: 2 }}>
        <Text
          accessibilityRole="header"
          style={{ ...FONT.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.6, color: t.colors.ink }}
        >
          My Sentences
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 20, color: t.colors.ink2 }}>
          Sentences of your own, to say again.
        </Text>
      </View>
      {rows?.length ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            height: 40,
            paddingHorizontal: 10,
            borderRadius: 12,
            backgroundColor: t.colors.soft,
          }}
        >
          <SymbolView name="magnifyingglass" size={16} tintColor={t.colors.ink3} />
          <TextInput
            accessibilityLabel="Search sentences or meanings"
            placeholder="Search"
            placeholderTextColor={t.colors.ink3}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={{ flex: 1, fontSize: 17, color: t.colors.ink, padding: 0 }}
          />
        </View>
      ) : null}
      {loadError && !rows ? (
        <View style={{ paddingTop: 32 }}>
          <RecoveryState message={`Couldn’t load your sentences. ${loadError}`} onRetry={load} />
        </View>
      ) : !rows ? (
        <ActivityIndicator />
      ) : !rows.length ? (
        <EmptyState
          art="phrases"
          title="Keep the sentences you want to say"
          body="Add a sentence and what it means. A My Sentences card on the home page brings them back to practice."
          action={{ label: "Add sentence", icon: "plus", onPress: () => open() }}
        />
      ) : !shown.length ? (
        <EmptyState compact title={`No sentences match “${query.trim()}”`} />
      ) : (
        <View style={{ backgroundColor: t.colors.card, borderRadius: t.r, overflow: "hidden" }}>
          {shown.map((s, i) => (
            <SwipeRow key={s.id} flat onDelete={() => askRemove(s)}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Opens the sentence to edit"
                onPress={() => open(s)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? t.colors.soft : t.colors.card,
                  paddingLeft: 16,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 12,
                    paddingRight: 16,
                    borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: t.colors.sep,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...FONT.medium, fontSize: 17, lineHeight: 22, color: t.colors.ink }}>{s.text}</Text>
                    <Text style={{ fontSize: 15, lineHeight: 20, color: t.colors.ink2 }}>{s.meaning}</Text>
                    {s.note_id ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
                        <Icon name="link" s={12} c={t.colors.ink3} />
                        <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, lineHeight: 18, color: t.colors.ink3 }}>
                          {noteTitle(s.note_id)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Icon name="chev" s={14} c={t.colors.ink3} />
                </View>
              </Pressable>
            </SwipeRow>
          ))}
        </View>
      )}
      {draft ? (
        <SentenceSheet
          draft={draft}
          notes={notes}
          busy={busy}
          change={(patch) => setDraft({ ...draft, ...patch })}
          close={() => setDraft(null)}
          save={() => void save(draft)}
          remove={draft.id ? () => askRemove({ id: draft.id!, text: draft.text }) : undefined}
        />
      ) : null}
    </Screen>
  );
}
function SentenceSheet({
  draft,
  notes,
  busy,
  change,
  close,
  save,
  remove,
}: {
  draft: Draft;
  notes: Note[];
  busy: boolean;
  change: (patch: Partial<Draft>) => void;
  close: () => void;
  save: () => void;
  remove?: () => void;
}) {
  const t = useTheme();
  const field = { fontSize: 17, lineHeight: 22, color: t.colors.ink, paddingTop: 14, paddingBottom: 14, minHeight: Motif.row } as const;
  return (
    <Sheet
      title={draft.id ? "Edit sentence" : "New sentence"}
      action="Save"
      onAction={save}
      disabled={busy || !draft.text.trim() || !draft.meaning.trim()}
      close={close}
    >
      <Section label="Sentence">
        <Group>
          <TextInput
            accessibilityLabel="English sentence"
            placeholder="English sentence"
            placeholderTextColor={t.colors.ink3}
            value={draft.text}
            onChangeText={(text) => change({ text })}
            autoFocus={!draft.id}
            multiline
            style={field}
          />
        </Group>
      </Section>
      <Section label="Meaning">
        <Group>
          <TextInput
            accessibilityLabel="Meaning in your first language"
            placeholder="Meaning in your first language"
            placeholderTextColor={t.colors.ink3}
            value={draft.meaning}
            onChangeText={(meaning) => change({ meaning })}
            multiline
            style={field}
          />
        </Group>
      </Section>
      <Section label="Linked Studio note">
        <Group>
          <CheckRow title="None" checked={!draft.note} onPress={() => change({ note: null })} />
          {notes.map((n) => (
            <View key={n.id}>
              <RowLine />
              <CheckRow title={n.title || "Untitled"} checked={draft.note === n.id} onPress={() => change({ note: n.id })} />
            </View>
          ))}
        </Group>
      </Section>
      {remove ? (
        <Pill tone="danger" disabled={busy} onPress={remove} style={{ alignSelf: "stretch" }}>
          Delete sentence
        </Pill>
      ) : null}
    </Sheet>
  );
}

// ── The home deck ──────────────────────────────────────────────────────────

/** The home card's geometry, shared with the two built-in cards. */
const CARD = {
  width: 271,
  height: 200,
  borderRadius: 20,
  padding: 20,
  justifyContent: "space-between",
  overflow: "hidden",
} as const;
/** The Studio card's gradient: what "Midnight" means. The same in light and
 *  dark, as the built-in card is. */
const MIDNIGHT = ["#010101", "#2E395A", "#E1DFDC"] as const;
/** The same gradient cut short, for a swatch too low to show its pale foot. */
const MIDNIGHT_SWATCH = ["#010101", "#2E395A", "#8B8FA3"] as const;
const SOURCE_LABEL: Record<Source, string> = { Phrase: "Phrases", Studio: "Studio", "My Sentences": "My Sentences" };
const sourceLine = (source: Source, count: number) =>
  source === "Studio"
    ? `Studio · ${count} note${count === 1 ? "" : "s"} a session`
    : `${SOURCE_LABEL[source]} · ${count} a session`;

/** What sits on a card of each color: its text, and its capsule. */
function useCardInk(tone: RoutineTone) {
  const t = useTheme();
  return tone === "midnight"
    ? { fg: "#FFFFFF", pillBg: "#FAFAFA", pillFg: "#0A0A0A", glass: "dark" as const }
    : { fg: t.colors.ink, pillBg: t.colors.acc, pillFg: t.colors.onAcc, glass: t.dark ? ("dark" as const) : ("light" as const) };
}
function CardShell({ tone, children }: { tone: RoutineTone; children: ReactNode }) {
  const t = useTheme();
  return tone === "midnight" ? (
    <LinearGradient colors={MIDNIGHT} locations={[0, 0.5, 1]} style={CARD}>
      {children}
    </LinearGradient>
  ) : (
    <View style={[CARD, { backgroundColor: t.colors.card }]}>{children}</View>
  );
}
function CardWords({ tone, line, title }: { tone: RoutineTone; line: string; title: string }) {
  const ink = useCardInk(tone);
  return (
    <View style={{ gap: 4 }}>
      <Text numberOfLines={1} style={{ ...FONT.medium, fontSize: 12, color: ink.fg }}>
        {line}
      </Text>
      <Text numberOfLines={3} style={{ ...FONT.display, fontSize: 24, lineHeight: 28, color: ink.fg }}>
        {title}
      </Text>
    </View>
  );
}
/** A routine card as it sits on the home page, and as the sheet previews it. */
function RoutineCard({
  tone,
  line,
  title,
  onStart,
}: {
  tone: RoutineTone;
  line: string;
  title: string;
  /** Left out, the card is a picture of itself (the sheet's preview). */
  onStart?: () => void;
}) {
  const ink = useCardInk(tone);
  return (
    <CardShell tone={tone}>
      <CardWords tone={tone} line={line} title={title} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start ${title}`}
        disabled={!onStart}
        onPress={onStart}
        style={({ pressed }) => ({
          backgroundColor: ink.pillBg,
          borderRadius: 100,
          paddingVertical: 14,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ ...FONT.bold, fontSize: 16, color: ink.pillFg }}>Start</Text>
      </Pressable>
    </CardShell>
  );
}
/** The same card while the deck is being edited: it keeps its color and
 *  name, its capsule becomes Settings between two move buttons, and a minus
 *  badge on its corner removes it — the way the Home Screen edits its icons. */
function EditingCard({
  tone,
  line,
  title,
  first,
  last,
  move,
  settings,
  remove,
}: {
  tone: RoutineTone;
  line: string;
  title: string;
  first: boolean;
  last: boolean;
  move: (n: number) => void;
  settings: () => void;
  remove: () => void;
}) {
  const t = useTheme();
  const ink = useCardInk(tone);
  const arrow = (n: number, off: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={n < 0 ? "Move earlier" : "Move later"}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={() => {
        void Haptics.selectionAsync();
        move(n);
      }}
    >
      {/* Glass can't be faded from outside, so a move that isn't there dims
          its arrow and leaves the glass still. */}
      <Glass
        scheme={ink.glass}
        interactive={!off}
        style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
      >
        <View style={{ opacity: off ? 0.3 : 1 }}>
          <SymbolView name={n < 0 ? "chevron.left" : "chevron.right"} size={15} weight="semibold" tintColor={ink.fg} />
        </View>
      </Glass>
    </Pressable>
  );
  return (
    <View>
      <CardShell tone={tone}>
        <CardWords tone={tone} line={line} title={title} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {arrow(-1, first)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} settings`}
            onPress={settings}
            style={{ flex: 1 }}
          >
            <Glass
              tint={ink.pillBg}
              scheme={ink.glass}
              interactive
              style={{ height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ ...FONT.bold, fontSize: 15, color: ink.pillFg }}>Settings</Text>
            </Glass>
          </Pressable>
          {arrow(1, last)}
        </View>
      </CardShell>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title}`}
        hitSlop={10}
        onPress={remove}
        style={{
          position: "absolute",
          top: -8,
          left: -8,
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.dark ? "#636366" : "#3A3A3C",
          borderWidth: 2,
          borderColor: t.colors.bg,
        }}
      >
        <SymbolView name="minus" size={13} weight="bold" tintColor="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const defaults = ["studio", "phrases"];
type Deck = { order: string[]; cards: Routine[] };
const initial: Deck = { order: defaults, cards: [] };
const builtIn = (id: string): Routine => ({
  id,
  name: id === "studio" ? "Studio" : "Today’s phrases",
  source: id === "studio" ? "Studio" : "Phrase",
  count: id === "studio" ? 1 : 5,
  days: 0,
  random: true,
  noteIds: [],
  folder: "",
});
/** A card while the deck is being edited. It jiggles; touch and hold lifts
 *  it, and then it can be dragged a place left or right — the Home Screen's
 *  gesture. A quick swipe is left to the deck, so the row still scrolls. */
const HOLD_MS = 280;
/** One card's hold-then-drag gesture: its touch handlers, and the bookkeeping
 *  of the touch in progress. Built once per card and kept for its life. */
function makeHoldDrag(x: Animated.Value, lift: Animated.Value) {
  const s = {
    move: (_n: number) => {},
    drag: (_v: boolean) => {},
    timer: null as ReturnType<typeof setTimeout> | null,
    lifted: false,
    startX: 0,
  };
  const cancelTimer = () => {
    if (s.timer) clearTimeout(s.timer);
    s.timer = null;
  };
  const settle = () => {
    cancelTimer();
    if (s.lifted) {
      s.lifted = false;
      s.drag(false);
    }
    x.setValue(0);
    Animated.spring(lift, { toValue: 0, speed: 30, bounciness: 2, useNativeDriver: true }).start();
  };
  const responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: () => s.lifted,
    onPanResponderMove: (_, g) => x.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      const n = Math.abs(g.dx) > 40 ? Math.sign(g.dx) : 0;
      settle();
      if (n) s.move(n);
    },
    onPanResponderTerminate: settle,
  });
  return {
    /** Keeps the callbacks current; they close over the card's position. */
    update(move: (n: number) => void, drag: (v: boolean) => void) {
      s.move = move;
      s.drag = drag;
    },
    dispose: cancelTimer,
    handlers: {
      ...responder.panHandlers,
      onTouchStart: (e: { nativeEvent: { pageX: number } }) => {
        cancelTimer();
        s.startX = e.nativeEvent.pageX;
        s.timer = setTimeout(() => {
          s.lifted = true;
          // The deck stops scrolling for as long as the card is held.
          s.drag(true);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.spring(lift, { toValue: 1, speed: 30, bounciness: 4, useNativeDriver: true }).start();
        }, HOLD_MS);
      },
      // Moving before the hold completes is a scroll, not a pickup.
      onTouchMove: (e: { nativeEvent: { pageX: number } }) => {
        if (!s.lifted && Math.abs(e.nativeEvent.pageX - s.startX) > 8) cancelTimer();
      },
      onTouchEnd: settle,
      onTouchCancel: settle,
    },
  };
}
function Draggable({
  children,
  move,
  drag,
}: {
  children: ReactNode;
  move: (n: number) => void;
  drag: (v: boolean) => void;
}) {
  const x = useMemo(() => new Animated.Value(0), []),
    jiggle = useMemo(() => new Animated.Value(0), []),
    lift = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(jiggle, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(jiggle, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [jiggle]);
  const [gesture] = useState(() => makeHoldDrag(x, lift));
  useEffect(() => {
    gesture.update(move, drag);
  });
  useEffect(() => gesture.dispose, [gesture]);
  return (
    <Animated.View
      {...gesture.handlers}
      style={{
        transform: [
          { translateX: x },
          { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
          {
            rotate: jiggle.interpolate({
              inputRange: [0, 1],
              outputRange: ["-0.8deg", "0.8deg"],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function RoutineDeck({
  studio,
  phrases,
  nav,
}: {
  studio: ReactNode;
  phrases: ReactNode;
  nav: Nav;
}) {
  const t = useTheme(),
    tint = useTint(),
    { session } = useAuth(),
    key = "myne.routines.v1." + session?.user.id;
  const [deck, setDeck] = useState<Deck>(initial),
    [editing, setEditing] = useState(false),
    [form, setForm] = useState<Routine | null>(null),
    [ready, setReady] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    setReady(false);
    AsyncStorage.getItem(key)
      .then((s) => {
        if (active) {
          setDeck(s ? JSON.parse(s) : initial);
          setReady(true);
        }
      })
      .catch(failure);
    return () => {
      active = false;
    };
  }, [key]);
  const [moveScroll, setMoveScroll] = useState(false);
  function store(d: Deck) {
    setDeck(d);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(key, JSON.stringify(d)))
      .catch(failure);
  }
  function move(i: number, n: number) {
    const order = [...deck.order],
      j = i + n;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    store({ ...deck, order });
  }
  const edit = (on: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditing(on);
  };
  return (
    <>
      <ScrollView
        horizontal
        scrollEnabled={!moveScroll}
        showsHorizontalScrollIndicator={false}
        // Room above the cards for the edit badge that sits on their corner.
        // Unclipped, so the shadow the glass tile casts isn't cut off square.
        style={{ marginHorizontal: -18, marginVertical: -6, overflow: "visible" }}
        contentContainerStyle={{
          gap: 16,
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        {deck.order.map((id, i) => {
          const c = deck.cards.find((card) => card.id === id);
          const shown = c ?? builtIn(id);
          if (editing)
            return (
              <Draggable key={id} drag={setMoveScroll} move={(n) => move(i, n)}>
                <EditingCard
                  tone={toneOf(shown)}
                  line={sourceLine(shown.source, shown.count)}
                  title={shown.name}
                  first={i === 0}
                  last={i === deck.order.length - 1}
                  move={(n) => move(i, n)}
                  settings={() => setForm(shown)}
                  remove={() =>
                    confirmDelete({
                      title: `Remove “${shown.name}”?`,
                      message: "You can add a card like it again from New card.",
                      deleteLabel: "Remove",
                      onConfirm: () =>
                        store({
                          order: deck.order.filter((k) => k !== id),
                          cards: deck.cards.filter((k) => k.id !== id),
                        }),
                    })
                  }
                />
              </Draggable>
            );
          return (
            // Touch and hold a card to edit the deck, as on the Home Screen.
            <Pressable key={id} delayLongPress={350} onLongPress={() => edit(true)}>
              {c ? (
                <RoutineCard
                  tone={toneOf(c)}
                  line={sourceLine(c.source, c.count)}
                  title={c.name}
                  onStart={() => nav.push("routinePractice", { card: c })}
                />
              ) : id === "studio" ? (
                studio
              ) : (
                phrases
              )}
            </Pressable>
          );
        })}
        {/* The deck's last tile: add a card, or start and finish editing. */}
        <Glass style={{ width: 124, height: CARD.height, borderRadius: CARD.borderRadius }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? "Done editing cards" : "New card"}
            disabled={!ready}
            onPress={() => (editing ? edit(false) : setForm({ ...builtIn(String(Date.now())), source: "My Sentences", name: "", count: 5 }))}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: !ready ? 0.5 : pressed ? 0.6 : 1,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                // On glass a white disc would be pale on pale: the add mark
                // sits on the accent's tint, the done mark on the accent.
                backgroundColor: editing ? t.colors.acc : t.colors.accS,
              }}
            >
              <SymbolView
                name={editing ? "checkmark" : "plus"}
                size={18}
                weight="semibold"
                tintColor={editing ? t.colors.onAcc : tint}
              />
            </View>
            <Text style={{ ...FONT.semibold, fontSize: 13, color: t.colors.ink2 }}>
              {editing ? "Done" : "New card"}
            </Text>
          </Pressable>
          {editing ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit cards"
              accessibilityHint="Reorder, change or remove the cards"
              disabled={!ready}
              onPress={() => edit(true)}
              style={({ pressed }) => ({
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: t.colors.sep,
                opacity: !ready || pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ ...FONT.medium, fontSize: 15, color: tint }}>Edit</Text>
            </Pressable>
          )}
        </Glass>
      </ScrollView>
      {form && (
        <RoutineSheet
          initial={form}
          isNew={!deck.order.includes(form.id)}
          close={() => setForm(null)}
          save={(card) => {
            store({
              order: deck.order.includes(card.id)
                ? deck.order
                : [...deck.order, card.id],
              cards: [...deck.cards.filter((c) => c.id !== card.id), card],
            });
            setForm(null);
          }}
        />
      )}
    </>
  );
}

const SOURCES = [
  { value: "Phrase", label: "Phrases" },
  { value: "Studio", label: "Studio" },
  { value: "My Sentences", label: "My Sentences" },
] as const satisfies readonly { value: Source; label: string }[];
const TONES = [
  { value: "midnight", label: "Midnight" },
  { value: "paper", label: "Paper" },
] as const satisfies readonly { value: RoutineTone; label: string }[];

function RoutineSheet({
  initial,
  isNew,
  close,
  save,
}: {
  initial: Routine;
  isNew: boolean;
  close: () => void;
  save: (c: Routine) => void;
}) {
  const t = useTheme(),
    [c, set] = useState<Routine>({ ...initial, tone: toneOf(initial) }),
    [recent, setRecent] = useState(initial.days > 0),
    [days, setDays] = useState(String(initial.days || 7));
  const [notes, setNotes] = useState<Note[]>([]),
    [folders, setFolders] = useState<NoteFolder[]>([]);
  useEffect(() => {
    Promise.all([loadNotes(), loadNoteFolders()])
      .then(([ns, fs]) => {
        setNotes(ns);
        setFolders(fs);
      })
      .catch(failure);
  }, []);
  const change = (patch: Partial<Routine>) =>
    set((old) => ({ ...old, ...patch }));
  const tone = toneOf(c);
  const valid = !recent || (Number.isSafeInteger(+days) && +days > 0);
  const scoped = notes.filter((n) => !c.folder || n.folder_id === c.folder);
  return (
    <Sheet
      title={isNew ? "New card" : "Card settings"}
      action={isNew ? "Add" : "Done"}
      disabled={!valid}
      close={close}
      onAction={() =>
        save({
          ...c,
          name: c.name.trim() || SOURCE_LABEL[c.source],
          days: recent ? +days : 0,
        })
      }
    >
      {/* The card as it will sit on the home page, in the chosen color. */}
      <View style={[{ alignSelf: "center", borderRadius: CARD.borderRadius }, t.shadowLg]}>
        <RoutineCard tone={tone} line={sourceLine(c.source, c.count)} title={c.name.trim() || SOURCE_LABEL[c.source]} />
      </View>
      <Section label="Color">
        <View style={{ flexDirection: "row", gap: 12 }}>
          {TONES.map((o) => (
            <ToneSwatch key={o.value} tone={o.value} label={o.label} on={tone === o.value} onPress={() => change({ tone: o.value })} />
          ))}
        </View>
      </Section>
      <Section label="Name">
        <Group>
          <TextInput
            accessibilityLabel="Card name"
            placeholder={SOURCE_LABEL[c.source]}
            placeholderTextColor={t.colors.ink3}
            value={c.name}
            onChangeText={(name) => change({ name })}
            returnKeyType="done"
            maxLength={60}
            style={{ fontSize: 17, color: t.colors.ink, height: Motif.row, padding: 0 }}
          />
        </Group>
      </Section>
      <Section label="Practice from">
        <Segmented options={SOURCES} value={c.source} onChange={(source) => change({ source })} />
      </Section>
      <Group>
        <SettingRow label={c.source === "Studio" ? "Notes per session" : "Items per session"}>
          <Stepper value={c.count} onChange={(count) => change({ count })} noun={c.source === "Studio" ? "notes" : "items"} />
        </SettingRow>
        <RowLine />
        <SettingRow label="Saved within">
          <Segmented
            style={{ width: 172 }}
            options={[
              { value: false, label: "All time" },
              { value: true, label: "Recent" },
            ]}
            value={recent}
            onChange={setRecent}
          />
        </SettingRow>
        {recent ? (
          <>
            <RowLine />
            <SettingRow label="Days back">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <TextInput
                  accessibilityLabel="Days back"
                  value={days}
                  onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={4}
                  selectTextOnFocus
                  style={{
                    ...FONT.semibold,
                    minWidth: 56,
                    height: 32,
                    paddingVertical: 0,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: t.colors.soft,
                    fontSize: 16,
                    textAlign: "center",
                    color: valid ? t.colors.ink : t.colors.warn,
                    fontVariant: ["tabular-nums"],
                  }}
                />
                <Text style={{ fontSize: 17, color: t.colors.ink2 }}>days</Text>
              </View>
            </SettingRow>
          </>
        ) : null}
        <RowLine />
        <SettingRow label="Order">
          <Segmented
            style={{ width: 172 }}
            options={[
              { value: false, label: "Oldest first" },
              { value: true, label: "Shuffle" },
            ]}
            value={c.random}
            onChange={(random) => change({ random })}
          />
        </SettingRow>
      </Group>
      <Section label="Studio folder">
        <Group>
          <CheckRow title="All folders" checked={!c.folder} onPress={() => change({ folder: "", noteIds: [] })} />
          {folders.map((f) => (
            <View key={f.id}>
              <RowLine />
              <CheckRow title={f.name} checked={c.folder === f.id} onPress={() => change({ folder: f.id, noteIds: [] })} />
            </View>
          ))}
        </Group>
      </Section>
      <Section label={c.source === "Studio" ? "Notes" : "Linked to notes"}>
        <Group>
          <CheckRow title="All notes" checked={!c.noteIds.length} onPress={() => change({ noteIds: [] })} />
          {scoped.map((n) => (
            <View key={n.id}>
              <RowLine />
              <CheckRow
                title={n.title || "Untitled"}
                checked={c.noteIds.includes(n.id)}
                onPress={() =>
                  change({
                    noteIds: c.noteIds.includes(n.id)
                      ? c.noteIds.filter((id) => id !== n.id)
                      : [...c.noteIds, n.id],
                  })
                }
              />
            </View>
          ))}
        </Group>
      </Section>
    </Sheet>
  );
}
/** One of the two card colors, drawn in that color; a check marks the choice. */
function ToneSwatch({ tone, label, on, onPress }: { tone: RoutineTone; label: string; on: boolean; onPress: () => void }) {
  const t = useTheme();
  const ink = useCardInk(tone);
  const face = {
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as const;
  const inside = (
    <>
      <Text style={{ ...FONT.semibold, fontSize: 15, color: ink.fg }}>{label}</Text>
      {on ? (
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: ink.pillBg,
          }}
        >
          <SymbolView name="checkmark" size={11} weight="bold" tintColor={ink.pillFg} />
        </View>
      ) : null}
    </>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} card color`}
      accessibilityState={{ selected: on }}
      onPress={() => {
        if (on) return;
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
    >
      {tone === "midnight" ? (
        <LinearGradient colors={MIDNIGHT_SWATCH} locations={[0, 0.6, 1]} style={face}>
          {inside}
        </LinearGradient>
      ) : (
        <View style={[face, { backgroundColor: t.colors.card }]}>{inside}</View>
      )}
    </Pressable>
  );
}

// ── Practice ───────────────────────────────────────────────────────────────

export function RoutinePractice({
  nav,
  card,
  restored,
  index = 0,
}: {
  nav: Nav;
  card: Routine;
  restored?: PracticeItem[];
  index?: number;
}) {
  const t = useTheme();
  const [queue, setQueue] = useState<PracticeItem[] | null>(restored ?? null),
    [i, setIndex] = useState(index),
    [revealed, reveal] = useState(false),
    [error, setError] = useState(""),
    [attempt, retry] = useState(0);
  useEffect(() => {
    if (restored) return;
    let active = true;
    setError("");
    pickRoutine(card)
      .then((v) => {
        if (active) setQueue(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [card, restored, attempt]);
  const item = queue?.[i];
  const advance = () => {
    setIndex(i + 1);
    reveal(false);
  };
  const eyebrow = { ...FONT.semibold, fontSize: 13, lineHeight: 18, color: t.colors.ink2 } as const;
  return (
    <Screen>
      <BackBar title={card.name} onBack={nav.pop} />
      {error ? (
        <View style={{ paddingTop: 40 }}>
          <RecoveryState message={error} onRetry={() => retry(attempt + 1)} />
        </View>
      ) : !queue ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : !item ? (
        <View style={{ alignItems: "center", gap: 12, paddingTop: 48 }}>
          {queue.length ? (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.colors.accS,
                marginBottom: 4,
              }}
            >
              <SymbolView name="checkmark" size={26} weight="semibold" tintColor={t.dark ? t.colors.accD : t.colors.acc} />
            </View>
          ) : null}
          <Text
            accessibilityRole="header"
            style={{ ...FONT.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: t.colors.ink, textAlign: "center" }}
          >
            {queue.length ? "Practice complete" : "Nothing to practice yet"}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink2, textAlign: "center" }}>
            {queue.length
              ? `You went through ${queue.length} ${queue.length === 1 ? "item" : "items"}.`
              : "Nothing matches this card’s settings. Add more, or widen what the card picks from."}
          </Text>
          <Pill onPress={nav.pop} style={{ alignSelf: "stretch", marginTop: 12 }}>
            Done
          </Pill>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 2 }}>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: t.colors.soft, overflow: "hidden" }}>
              <View
                style={{
                  width: `${(i / queue.length) * 100}%`,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: t.colors.acc,
                }}
              />
            </View>
            <Text
              accessibilityLabel={`Item ${i + 1} of ${queue.length}`}
              style={{ ...FONT.medium, fontSize: 13, color: t.colors.ink2, fontVariant: ["tabular-nums"] }}
            >
              {i + 1} of {queue.length}
            </Text>
          </View>
          <Card style={{ padding: 24, minHeight: 260, justifyContent: "center", gap: 14 }}>
            {card.source === "My Sentences" ? (
              <>
                <Text style={eyebrow}>Say this in English</Text>
                <Text style={{ ...FONT.semibold, fontSize: 26, lineHeight: 33, letterSpacing: -0.3, color: t.colors.ink }}>
                  {item.meaning}
                </Text>
                {revealed ? (
                  <View style={{ gap: 8, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.sep }}>
                    <Text style={eyebrow}>Your sentence</Text>
                    <Text style={{ fontSize: 22, lineHeight: 29, color: t.dark ? t.colors.accD : t.colors.acc }}>
                      {item.text}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={eyebrow}>{card.source === "Studio" ? "Studio note" : "Phrase"}</Text>
                <Text style={{ ...FONT.semibold, fontSize: 26, lineHeight: 33, letterSpacing: -0.3, color: t.colors.ink }}>
                  {item.text || "Untitled"}
                </Text>
                {item.meaning ? (
                  <Text numberOfLines={card.source === "Studio" ? 6 : undefined} style={{ fontSize: 16, lineHeight: 23, color: t.colors.ink2 }}>
                    {item.meaning}
                  </Text>
                ) : null}
              </>
            )}
          </Card>
          {card.source === "My Sentences" ? (
            revealed ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pill
                  full
                  tone="soft"
                  onPress={() => {
                    setQueue([...queue, item]);
                    advance();
                  }}
                >
                  Practice again
                </Pill>
                <Pill full onPress={advance}>
                  Remembered
                </Pill>
              </View>
            ) : (
              <Pill onPress={() => reveal(true)} style={{ alignSelf: "stretch" }}>
                Show sentence
              </Pill>
            )
          ) : card.source === "Studio" ? (
            <Pill
              icon="mic"
              style={{ alignSelf: "stretch" }}
              onPress={() =>
                nav.startTalk({
                  from: "phrases",
                  ctx: item.text,
                  noteId: item.id,
                  noteSnapshot: { title: item.text, body: item.meaning },
                  beats: item.meaning.split("\n"),
                  returnTo: {
                    tab: "phrases",
                    stack: [
                      {
                        name: "routinePractice",
                        props: { card, restored: queue, index: i + 1 },
                      },
                    ],
                  },
                })
              }
            >
              Speak with this note
            </Pill>
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pill full tone="soft" onPress={advance}>
                Next
              </Pill>
              <Pill
                full
                onPress={() =>
                  nav.restore({
                    tab: "phrases",
                    stack: [
                      {
                        name: "routinePractice",
                        props: { card, restored: queue, index: i },
                      },
                      { name: "mvpPhrase", props: { id: item.id } },
                    ],
                  })
                }
              >
                Practice phrase
              </Pill>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

// ── A phrase's linked Studio notes (inside Phrase details) ─────────────────

export function PhraseNoteLinks({ id }: { id: string }) {
  const t = useTheme();
  const [notes, setNotes] = useState<Note[]>([]),
    [linked, setLinked] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    Promise.all([
      loadNotes(),
      supabase
        .from("routine_phrase_notes")
        .select("note_id")
        .eq("phrase_id", id),
    ])
      .then(([ns, result]) => {
        if (result.error) throw result.error;
        if (active) {
          setNotes(ns);
          setLinked(result.data.map((row) => row.note_id));
          setLoaded(true);
        }
      })
      // Phrase details stays readable when the links can't load: say so in
      // place instead of interrupting with an alert.
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function choose(noteId: string) {
    if (busy || !loaded) return;
    setBusy(true);
    try {
      const table = supabase.from("routine_phrase_notes"),
        remove = linked.includes(noteId);
      const { error } = remove
        ? await table.delete().eq("phrase_id", id).eq("note_id", noteId)
        : await table.upsert(
            { phrase_id: id, note_id: noteId },
            { onConflict: "phrase_id,note_id" },
          );
      if (error) throw error;
      setLinked((old) =>
        remove ? old.filter((x) => x !== noteId) : [...old, noteId],
      );
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: "600", letterSpacing: 0.2, color: t.colors.ink3 }}>
        Linked Studio notes
      </Text>
      {unavailable ? (
        <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2 }}>
          Linked notes aren’t available right now.
        </Text>
      ) : !loaded ? (
        <ActivityIndicator style={{ alignSelf: "flex-start" }} />
      ) : !notes.length ? (
        <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2 }}>No Studio notes yet.</Text>
      ) : (
        <View style={{ borderRadius: 14, backgroundColor: t.colors.bg, paddingHorizontal: 14 }}>
          {notes.map((n, i) => (
            <View key={n.id}>
              {i ? <RowLine /> : null}
              <CheckRow title={n.title || "Untitled"} checked={linked.includes(n.id)} onPress={() => void choose(n.id)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
