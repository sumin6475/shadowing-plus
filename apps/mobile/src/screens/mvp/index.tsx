import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "@/design/text";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect } from "react-native-svg";
import {
  Button,
  Host,
  Image,
  Menu,
  Picker,
  Text as SwiftText,
} from "@expo/ui/swift-ui";
import { frame, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { SEARCH_ENABLED } from "@/lib/release-flags";
import { FONT, Motif } from "@/design/mobile-tokens";
import { phrasesPerDay } from "@/lib/daily-phrases";
import {
  Avatar,
  BackBar,
  Card,
  confirmDelete,
  Icon,
  Pill,
  Screen,
  Serif,
  SwipeRow,
} from "@/design/ui";
import { useTheme } from "@/design/theme";
import { EmptyState } from "@/design/empty-state";
import { usePhraseSpeech } from "@/hooks/use-phrase-speech";
import { deletePhrase } from "@/lib/phrases";
import {
  addSentence,
  completedSteps,
  createNote,
  deleteMirrorSession,
  deleteNote,
  deleteSentence,
  dateLabel,
  dateTimeLabel,
  durationLabel,
  isBlankNote,
  loadMirrorSessions,
  notePreview,
  loadNote,
  loadNotes,
  loadPhraseBank,
  loadSentences,
  periodOf,
  phraseStage,
  practicedOn,
  saveNote,
  setStep,
  STEPS,
  todaysPicks,
  type MirrorSession,
  type Period,
  type MvpPhrase,
  type Note,
  type Sentence,
} from "@/lib/mvp";
import { useAuth } from "@/lib/auth";
import type { Nav } from "../nav";
import { NoteOutline, type NoteOutlineHandle } from "../note-outline";
import { SessionStatsCard, TranscriptCard } from "../session-stats";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Please try again.";
function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.1,
        color: t.colors.ink3,
      }}
    >
      {children}
    </Text>
  );
}
function Copy({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 14, lineHeight: 21, color: t.colors.ink2 }}>
      {children}
    </Text>
  );
}
function Field(props: React.ComponentProps<typeof TextInput>) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.colors.ink3}
      {...props}
      style={[
        {
          backgroundColor: t.colors.soft,
          color: t.colors.ink,
          borderRadius: 14,
          padding: 15,
          fontSize: 16,
          minHeight: 50,
        },
        props.style,
      ]}
    />
  );
}
function ErrorCard({
  error,
  retry,
}: {
  error: string | null;
  retry: () => void;
}) {
  if (!error) return null;
  return (
    <Card>
      <Copy>{error}</Copy>
      <Pill tone="soft" onPress={retry}>
        Try again
      </Pill>
    </Card>
  );
}
/** What the header's filter button offers. Its list drops down from the
 *  button (native iOS menu) — options with a checkmark on the current one. */
interface FilterMenu {
  options: { label: string; count?: number }[];
  selected: string;
  onSelect: (label: string) => void;
  /** Shown only while SEARCH_ENABLED. */
  onSearch?: () => void;
}
function Header({
  nav,
  title,
  add,
  addLabel,
  menu,
  filtered = false,
}: {
  nav: Nav;
  title: string;
  add: () => void;
  addLabel: string;
  menu?: FilterMenu;
  filtered?: boolean;
}) {
  const t = useTheme();
  const search = SEARCH_ENABLED ? menu?.onSearch : undefined;
  const hasFilter = !!menu && (menu.options.length > 0 || !!search);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ flex: 1, fontFamily: FONT.bold, fontSize: 32, color: t.colors.ink }}
      >
        {title}
      </Text>
      {/* Quick action + filter share one capsule (Figma ButtonGroup). */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 20,
          height: 48,
          paddingHorizontal: 12,
          borderRadius: 100,
          backgroundColor: t.colors.card,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          onPress={add}
          hitSlop={8}
        >
          <Icon name="plus" s={28} w={1.75} c={t.colors.ink} />
        </Pressable>
        {hasFilter && menu ? (
          <View>
            <Host matchContents>
              <Menu
                label={
                  <Image
                    systemName="line.3.horizontal.decrease"
                    size={22}
                    color={t.colors.ink}
                  />
                }
              >
                {search ? (
                  <Button label="Search" systemImage="magnifyingglass" onPress={search} />
                ) : null}
                {menu.options.length ? (
                  <Picker
                    label="Show"
                    selection={menu.selected}
                    onSelectionChange={(v) => menu.onSelect(String(v))}
                    modifiers={[pickerStyle("inline")]}
                  >
                    {menu.options.map((o) => (
                      <SwiftText key={o.label} modifiers={[tag(o.label)]}>
                        {o.count === undefined ? o.label : `${o.label}  ${o.count}`}
                      </SwiftText>
                    ))}
                  </Picker>
                ) : null}
              </Menu>
            </Host>
            {filtered ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -2,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: t.colors.acc,
                }}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      <View
        style={{
          borderRadius: 24,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Avatar s={48} onPress={() => nav.push("profile")} />
      </View>
    </View>
  );
}
/** Inline search under the header — only reachable while SEARCH_ENABLED. */
function SearchBar({
  query,
  setQuery,
  placeholder,
  close,
}: {
  query: string;
  setQuery: (q: string) => void;
  placeholder: string;
  close: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Field
        autoFocus
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{ flex: 1, backgroundColor: t.colors.card }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close search"
        hitSlop={10}
        onPress={close}
      >
        <Icon name="x" s={18} c={t.colors.ink2} />
      </Pressable>
    </View>
  );
}
function FilterSummary({ text, clear }: { text: string; clear: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text
        numberOfLines={1}
        style={{ flex: 1, fontFamily: FONT.medium, fontSize: 14, color: t.colors.ink2 }}
      >
        {text}
      </Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={clear}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 14, color: t.colors.acc }}>
          Clear
        </Text>
      </Pressable>
    </View>
  );
}
function useRefresh<T>(fetcher: () => Promise<T>, revision: number) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const key = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (key === generation.current) setData(result);
    } catch (e) {
      if (key === generation.current) setError(message(e));
    } finally {
      if (key === generation.current) setLoading(false);
    }
  }, [fetcher]);
  useFocusEffect(
    useCallback(() => {
      void revision;
      void refresh();
      return () => {
        generation.current++;
      };
    }, [refresh, revision]),
  );
  return { data, error, loading, refresh };
}
const loadHome = async () => {
  const [phrases, notes] = await Promise.all([loadPhraseBank(), loadNotes()]);
  return { phrases, notes };
};
/** One period's rows, as one rounded card (Figma). */
export function SectionCard({ label, children }: { label: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: FONT.bold,
          fontSize: 14,
          color: t.colors.ink,
          paddingHorizontal: 2,
          paddingTop: 12,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: t.colors.card,
          borderRadius: 24,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        {children}
      </View>
    </View>
  );
}
/** A row inside a SectionCard: 16pt padding, hairline between rows. */
export function Row({ last, children }: { last: boolean; children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: last ? 0 : 1,
        // Figma's divider is a whisper (#EAEAEA at 50%); the theme's sep reads
        // as a rule. Dark mode keeps sep so it stays visible.
        borderColor: t.dark ? t.colors.sep : "rgba(234,234,234,0.5)",
      }}
    >
      {children}
    </View>
  );
}
/** The 24pt circle a row starts with (button.svg), holding any glyph. */
function RowCircle({ children }: { children?: ReactNode }) {
  const t = useTheme();
  // Light mode is the Figma file verbatim; dark mode swaps the near-white
  // circle for the theme's so it doesn't glow on a dark card.
  const ring = t.dark ? t.colors.sep : "#F2F2F7";
  return (
    <View style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
      <Svg width={24} height={24} viewBox="0 0 24 24" style={{ position: "absolute" }}>
        <Rect x={0.5} y={0.5} width={23} height={23} rx={11.5} fill={ring} fillOpacity={0.5} />
        <Rect x={0.5} y={0.5} width={23} height={23} rx={11.5} stroke={ring} fill="none" />
      </Svg>
      {children}
    </View>
  );
}
/** The glyph colour inside RowCircle, from button.svg. */
const ROW_GLYPH = "#A6A7A3";
/** Figma's listen button (button.svg, 24pt): a grey speaker in that circle.
 *  While playing, the same circle holds a navy pause. */
const SPEAKER_D =
  "M13.2292 17.625C13.6461 17.625 13.9464 17.3184 13.9464 16.9077V7.12913C13.9464 6.71845 13.6461 6.375 13.2169 6.375C12.9166 6.375 12.7141 6.50997 12.3892 6.81655L9.68555 9.37296C9.64077 9.41002 9.58409 9.42963 9.52598 9.42815H7.70539C6.84087 9.42815 6.375 9.9003 6.375 10.8198V13.1986C6.375 14.1183 6.84087 14.5902 7.70539 14.5902H9.52598C9.58745 14.5902 9.64265 14.6085 9.68555 14.6453L12.3892 17.2266C12.6835 17.5023 12.9289 17.625 13.2292 17.625ZM16.711 14.7189C16.9195 14.8661 17.2201 14.8172 17.3977 14.5781C17.8761 13.9341 18.1641 12.9903 18.1641 12.0277C18.1641 11.0651 17.8698 10.1271 17.3977 9.47105C17.2198 9.23197 16.9258 9.18279 16.711 9.3298C16.4416 9.50767 16.4107 9.82052 16.6069 10.0902C16.9627 10.5684 17.1772 11.2979 17.1772 12.0275C17.1772 12.7573 16.9501 13.4868 16.6009 13.971C16.4168 14.2347 16.4476 14.5347 16.711 14.7189Z";
function ListenButton({ state }: { state: "idle" | "loading" | "playing" }) {
  const t = useTheme();
  return (
    <RowCircle>
      {state === "loading" ? (
        <ActivityIndicator size="small" style={{ transform: [{ scale: 0.6 }] }} />
      ) : (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          {state === "idle" ? (
            <Path d={SPEAKER_D} fill={ROW_GLYPH} />
          ) : (
            <>
              <Rect x={8.5} y={7.5} width={2.4} height={9} rx={1.2} fill={t.colors.acc} />
              <Rect x={13.1} y={7.5} width={2.4} height={9} rx={1.2} fill={t.colors.acc} />
            </>
          )}
        </Svg>
      )}
    </RowCircle>
  );
}
const HERO_CARD = {
  width: 271,
  height: 200,
  borderRadius: 20,
  padding: 20,
  justifyContent: "space-between",
  overflow: "hidden",
} as const;
export function PhraseBank({ nav }: { nav: Nav }) {
  const t = useTheme(),
    state = useRefresh(loadHome, nav.speakingDataRevision),
    voice = usePhraseSpeech();
  const [filter, setFilter] = useState("All"),
    [query, setQuery] = useState(""),
    [searching, setSearching] = useState(false);
  const phrases = state.data?.phrases ?? [],
    recent = state.data?.notes.find((n) => !isBlankNote(n.title, n.body));
  const now = new Date(),
    picks = todaysPicks(phrases, phrasesPerDay(), now),
    done = picks.filter((p) => practicedOn(p, now)).length,
    next = picks.find((p) => !practicedOn(p, now)) ?? picks[0];
  const filtering = filter !== "All" || !!query.trim();
  const filtered = phrases
    .filter(
      (p) =>
        (filter === "All" || phraseStage(p) === filter) &&
        `${p.text} ${p.translation ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  // Newest first, so the Map fills Today → Earlier in order.
  const groups = new Map<Period, MvpPhrase[]>();
  for (const p of filtered) {
    const label = periodOf(p.createdAt, now);
    groups.set(label, [...(groups.get(label) ?? []), p]);
  }
  const clear = () => {
    setFilter("All");
    setQuery("");
  };
  return (
    <Screen onPullToSearch={() => nav.push("search", { visit: Date.now() })}>
      <Header
        nav={nav}
        title="Phrases"
        add={() => nav.push("capture")}
        addLabel="Save a phrase"
        menu={{
          options: ["All", "Collected", "Learning", "Ready"].map((label) => ({
            label,
            count: phrases.filter((p) => label === "All" || phraseStage(p) === label)
              .length,
          })),
          selected: filter,
          onSelect: setFilter,
          onSearch: () => setSearching(true),
        }}
        filtered={filtering}
      />
      {searching ? (
        <SearchBar
          query={query}
          setQuery={setQuery}
          placeholder="Search your phrases"
          close={() => {
            setSearching(false);
            setQuery("");
          }}
        />
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 18, paddingVertical: 4 }}
      >
        <LinearGradient
          colors={["#010101", "#2E395A", "#E1DFDC"]}
          locations={[0, 0.5, 1]}
          style={HERO_CARD}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: "#FFFFFF" }}>
              Start the day with practice.
            </Text>
            <Text
              numberOfLines={3}
              style={{
                fontFamily: FONT.display,
                fontSize: 24,
                lineHeight: 28,
                color: "#FFFFFF",
              }}
            >
              {recent
                ? `Your “${recent.title || "Untitled"}” note is waiting.`
                : "Make a little room for your voice."}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              nav.startTalk({
                ctx: recent?.title || "Free talk",
                noteId: recent?.id,
                beats: recent?.body.split("\n"),
                from: "phrases",
              })
            }
            style={{
              backgroundColor: "#FAFAFA",
              borderRadius: 100,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: "#0A0A0A" }}>
              Speaking
            </Text>
          </Pressable>
        </LinearGradient>
        <View style={[HERO_CARD, { backgroundColor: t.colors.card }]}>
          <Text style={{ fontFamily: FONT.medium, fontSize: 12, color: t.colors.ink }}>
            Today’s phrases for you.
          </Text>
          <Text
            accessibilityLabel={
              state.data ? `${done} of ${picks.length} practiced today` : "Loading"
            }
            style={{
              fontFamily: FONT.bold,
              fontSize: 28,
              color: t.colors.ink,
              textAlign: "center",
            }}
          >
            {state.data ? `${done}/${picks.length || phrasesPerDay()}` : "–"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              next ? nav.push("mvpPhrase", { id: next.id }) : nav.push("capture")
            }
            style={{
              backgroundColor: t.colors.acc,
              borderRadius: 100,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ fontFamily: FONT.bold, fontSize: 16, color: t.colors.onAcc }}>
              {!picks.length
                ? "ADD A PHRASE"
                : done === picks.length
                  ? "ALL DONE"
                  : done
                    ? "CONTINUE"
                    : "START"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      {filtering ? (
        <FilterSummary
          text={`${filtered.length} ${filter === "All" ? "" : `${filter} `}phrase${filtered.length === 1 ? "" : "s"}${query.trim() ? ` matching “${query.trim()}”` : ""}`}
          clear={clear}
        />
      ) : null}
      <ErrorCard error={state.error} retry={() => void state.refresh()} />
      {!state.data && state.loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : null}
      {state.data && !state.error && filtered.length === 0 ? (
        phrases.length ? (
          <EmptyState compact title="Nothing here yet." body="Try another filter or search." />
        ) : (
          <EmptyState
            art="phrases"
            title="Good words find you."
            body="Save an expression from a conversation, a video, or your day. Learn it when you have a moment."
            action={{
              label: "Save your first phrase",
              icon: "plus",
              onPress: () => nav.push("capture"),
            }}
          />
        )
      ) : null}
      {[...groups].map(([label, items]) => (
        <SectionCard key={label} label={label}>
          {items.map((p, i) => {
            const playing = voice.speakingId === p.id;
            return (
              <Row key={p.id} last={i === items.length - 1}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${playing ? "Stop" : "Play"} ${p.text}`}
                  onPress={() => void voice.toggle(p.id, p.text)}
                  hitSlop={10}
                >
                  <ListenButton
                    state={
                      voice.loadingId === p.id
                        ? "loading"
                        : playing
                          ? "playing"
                          : "idle"
                    }
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${p.text}, ${phraseStage(p)}, open details`}
                  onPress={() => nav.push("mvpPhrase", { id: p.id })}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    marginLeft: 6,
                    gap: 12,
                  }}
                >
                  <Text
                    numberOfLines={2}
                    style={{
                      flex: 1,
                      fontFamily: FONT.semibold,
                      fontSize: 16,
                      color: t.colors.ink,
                    }}
                  >
                    {p.text}
                  </Text>
                  <Icon name="chev" s={14} c={t.colors.ink2} />
                </Pressable>
              </Row>
            );
          })}
        </SectionCard>
      ))}
    </Screen>
  );
}

/** The play control: one accent circle that never moves or resizes — only the
 *  glyph inside it changes (play → spinner while the voice loads → pause).
 *  56pt, comfortably over the 44pt minimum target. Pressed feedback is a dim,
 *  not a scale, so the circle stays put. */
const PLAY_SIZE = 56;
function PlayCircle({
  state,
  onPress,
  label,
}: {
  state: "idle" | "loading" | "playing";
  onPress: () => void;
  label: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={state === "loading" ? "Loading voice" : label}
      accessibilityState={{ busy: state === "loading" }}
      onPress={state === "loading" ? undefined : onPress}
      style={({ pressed }) => ({
        width: PLAY_SIZE,
        height: PLAY_SIZE,
        borderRadius: PLAY_SIZE / 2,
        backgroundColor: t.colors.acc,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {state === "loading" ? (
        <ActivityIndicator color={t.colors.onAcc} />
      ) : (
        <SymbolView
          name={state === "playing" ? "pause.fill" : "play.fill"}
          size={22}
          tintColor={t.colors.onAcc}
          // The play triangle's visual centre sits left of its box.
          style={state === "playing" ? undefined : { marginLeft: 3 }}
        />
      )}
    </Pressable>
  );
}
/** Marks a step done. Same proportions as the Add-a-phrase kind chips
 *  (medium height, capsule, 15pt semibold); white until pressed, then the
 *  play circle's accent with a check. */
function ClearChip({
  done,
  disabled,
  onPress,
}: {
  done: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const fg = done ? t.colors.onAcc : t.colors.ink2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={done ? "Cleared. Tap to undo" : "Mark this step clear"}
      accessibilityState={{ selected: done, disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={4}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        {
          height: Motif.buttonHeight.medium,
          borderRadius: Motif.radius.pill,
          paddingHorizontal: 15,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: done ? t.colors.acc : t.colors.card,
          borderWidth: done ? 0 : StyleSheet.hairlineWidth,
          borderColor: t.ring,
          opacity: pressed ? 0.8 : 1,
        },
        done ? null : t.shadowCard,
      ]}
    >
      <Text style={{ fontSize: 15, fontWeight: "600", color: fg }}>Clear</Text>
      {done ? <Icon name="check" s={14} w={2.4} c={fg} /> : null}
    </Pressable>
  );
}
/** A detail screen's "…" — a native iOS menu, drawn in the same round card
 *  button as the back arrow opposite it. Children are the menu's buttons. */
function MoreMenu({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      accessibilityLabel="More"
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
      <Host matchContents>
        <Menu
          label={
            <Image
              systemName="ellipsis"
              size={18}
              color={t.colors.ink}
              modifiers={[frame({ width: Motif.tapTarget, height: Motif.tapTarget })]}
            />
          }
        >
          {children}
        </Menu>
      </Host>
    </View>
  );
}
function PhraseMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <MoreMenu>
      <Button label="Edit" systemImage="pencil" onPress={onEdit} />
      <Button label="Delete" systemImage="trash" role="destructive" onPress={onDelete} />
    </MoreMenu>
  );
}
/** A player-style toggle beside the play circle: no words, each tap moves to
 *  the next state, and a non-default state is drawn in the accent — the way
 *  Music and Podcasts mark shuffle, repeat and speed. 64pt wide on both sides
 *  so the play circle stays centred whatever the glyph's width. */
function TransportToggle({
  label,
  value,
  active,
  onPress,
  children,
}: {
  label: string;
  value: string;
  active: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        width: 64,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.45 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
/** Reminders' row circle: 22pt, 1.5pt hairline stroke; filled with a check
 *  once the sentence is saved. */
const ROW_RADIO = 22;
function RowRadio({ done }: { done: boolean }) {
  const t = useTheme();
  return (
    <View
      style={{
        width: ROW_RADIO,
        height: ROW_RADIO,
        borderRadius: ROW_RADIO / 2,
        borderWidth: done ? 0 : 1.5,
        borderColor: t.colors.ink3,
        backgroundColor: done ? t.colors.acc : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {done ? <Icon name="check" s={13} w={2.4} c={t.colors.onAcc} /> : null}
    </View>
  );
}
/** One Reminders-style row: radio, 17pt text, hairline inset to the text. */
function ReminderRow({
  done,
  last,
  children,
}: {
  done: boolean;
  last: boolean;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View style={{ paddingTop: 12 }}>
        <RowRadio done={done} />
      </View>
      <View
        style={{
          flex: 1,
          minHeight: 44,
          justifyContent: "center",
          paddingVertical: 10,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: t.colors.sep,
        }}
      >
        {children}
      </View>
    </View>
  );
}
/** Helper line under a step's controls — one level below body copy. */
function Hint({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3 }}>
      {children}
    </Text>
  );
}
export function PhraseChecklist({ nav, id }: { nav: Nav; id: string }) {
  const [rate, setRate] = useState(1),
    [repeat, setRepeat] = useState(1);
  const t = useTheme(),
    voice = usePhraseSpeech({ rate, repeat });
  const fetcher = useCallback(async () => {
    const [all, sentences] = await Promise.all([
      loadPhraseBank(),
      loadSentences(id),
    ]);
    const phrase = all.find((p) => p.id === id);
    if (!phrase) throw new Error("This phrase is no longer available.");
    return { phrase, sentences };
  }, [id]);
  const state = useRefresh(fetcher, nav.speakingDataRevision),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const p = state.data?.phrase;
  // The page scrolls under the keyboard (Screen adjusts its insets) but never
  // brings the sentence field into view by itself, so a focused or growing
  // field slid behind the keyboard. The field and its Save button are the last
  // things on the page: while it's focused, keep the page scrolled to the end.
  const scrollRef = useRef<ScrollView>(null);
  const sentenceFocused = useRef(false);
  const revealSentence = useCallback(() => {
    if (sentenceFocused.current) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", revealSentence);
    return () => sub.remove();
  }, [revealSentence]);
  const mutate = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      nav.invalidateSpeakingData();
      await state.refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  // Deleting is a second, explicit step: the menu item only asks.
  const confirmDeletePhrase = () =>
    Alert.alert("Delete this phrase?", "Its saved sentences will also be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void mutate(async () => {
            await deletePhrase(id);
            nav.pop();
          }),
      },
    ]);
  return (
    <Screen scrollRef={scrollRef}>
      <BackBar
        title="Phrases"
        onBack={nav.pop}
        right={
          p ? (
            <PhraseMenu
              onEdit={() => nav.push("capture", { editPhraseId: id })}
              onDelete={confirmDeletePhrase}
            />
          ) : undefined
        }
      />
      <ErrorCard error={state.error} retry={() => void state.refresh()} />
      {!p ? (
        state.loading ? (
          <ActivityIndicator />
        ) : null
      ) : (
        <>
          <View style={{ alignItems: "center", gap: 10, paddingTop: 6 }}>
            <Label>
              {phraseStage(p).toUpperCase()} · {completedSteps(p)} OF 3
            </Label>
            <Serif style={{ fontSize: 43, lineHeight: 50, textAlign: "center" }}>
              {p.text}
            </Serif>
            <Text
              style={{
                fontSize: 17,
                lineHeight: 24,
                color: t.colors.ink2,
                textAlign: "center",
              }}
            >
              {p.translation || "An expression to make your own."}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 5, marginVertical: 8 }}>
            {STEPS.map((step) => (
              <View
                key={step}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: p[step] ? t.colors.acc : t.colors.sep,
                }}
              />
            ))}
          </View>
          {STEPS.map((step, index) => (
            <Card key={step} style={{ gap: 14 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 44,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: t.colors.ink,
                    }}
                  >
                    {index + 1} ·{" "}
                    {
                      [
                        "Say it until it feels natural",
                        "Hear it in real sentences",
                        "Make your own sentence",
                      ][index]
                    }
                  </Text>
                  <Text
                    style={{
                      fontSize: 13.5,
                      color: p[step] ? t.colors.acc : t.colors.ink3,
                      fontWeight: p[step] ? "600" : "400",
                    }}
                  >
                    {p[step]
                      ? `Done · ${dateLabel(p[step]!)}`
                      : [
                          "Listen, repeat, then check",
                          "Find a voice and a context",
                          "At least one saved sentence",
                        ][index]}
                  </Text>
                </View>
                <ClearChip
                  done={!!p[step]}
                  disabled={busy}
                  onPress={() => {
                    if (
                      index === 2 &&
                      !p[step] &&
                      !state.data?.sentences.length
                    ) {
                      setError(
                        "Save at least one sentence before clearing this step.",
                      );
                      return;
                    }
                    void mutate(() => setStep(id, step, !p[step]));
                  }}
                />
              </View>
              <View style={{ gap: 10 }}>
              {index === 0 ? (
                <>
                  {/* A transport row, as in Music: the play circle centred, its
                      two settings flanking it as bare glyphs that change state
                      on tap. The line under it says the state in words. */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 18,
                      paddingVertical: 4,
                    }}
                  >
                    <TransportToggle
                      label="Playback speed"
                      value={`${rate}×`}
                      active={rate !== 1}
                      onPress={() => {
                        void voice.stop();
                        setRate(rate === 1 ? 0.75 : 1);
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONT.semibold,
                          fontSize: 17,
                          color: rate !== 1 ? t.colors.acc : t.colors.ink2,
                        }}
                      >
                        {`${rate}×`}
                      </Text>
                    </TransportToggle>
                    <PlayCircle
                      state={
                        voice.loadingId === id
                          ? "loading"
                          : voice.speakingId === id
                            ? "playing"
                            : "idle"
                      }
                      label={
                        voice.speakingId === id ? "Stop" : "Play pronunciation"
                      }
                      onPress={() => void voice.toggle(id, p.text)}
                    />
                    <TransportToggle
                      label="Repeat"
                      value={repeat === 1 ? "Off" : "5 times"}
                      active={repeat !== 1}
                      onPress={() => {
                        void voice.stop();
                        setRepeat(repeat === 1 ? 5 : 1);
                      }}
                    >
                      <View>
                        <SymbolView
                          name="repeat"
                          size={22}
                          weight="semibold"
                          tintColor={repeat !== 1 ? t.colors.acc : t.colors.ink2}
                        />
                        {repeat !== 1 ? (
                          <View
                            style={{
                              position: "absolute",
                              top: -7,
                              right: -10,
                              minWidth: 15,
                              height: 15,
                              paddingHorizontal: 3,
                              borderRadius: 8,
                              backgroundColor: t.colors.acc,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: FONT.bold,
                                fontSize: 10,
                                color: t.colors.onAcc,
                              }}
                            >
                              5
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </TransportToggle>
                  </View>
                </>
              ) : index === 1 ? (
                <>
                  {/* A browser sheet inside the app, not a jump to Safari: the
                      learner comes back with Done, still on this phrase. The
                      site itself stays outside the app — embedding YouGlish's
                      widget in a mobile app needs their written permission. */}
                  <Pill
                    tone="tint"
                    icon="link"
                    style={{ alignSelf: "stretch" }}
                    onPress={() =>
                      void WebBrowser.openBrowserAsync(
                        `https://youglish.com/pronounce/${encodeURIComponent(p.text)}/english`,
                        { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET },
                      ).catch((e) => setError(message(e)))
                    }
                  >
                    Open YouGlish
                  </Pill>
                  <Hint>
                    Real videos from youglish.com, opened in a browser inside Myne.
                  </Hint>
                </>
              ) : (
                <>
                  {/* Reminders: saved rows with a filled check circle, then an
                      always-present blank row that is the new-entry field.
                      Return saves; swipe a row left to delete it. */}
                  <View>
                    {(state.data?.sentences ?? []).map((sentence: Sentence) => (
                      <SwipeRow
                        key={sentence.id}
                        flat
                        onDelete={() =>
                          confirmDelete({
                            title: "Delete this sentence?",
                            message: "Removing the last sentence resets this step.",
                            onConfirm: () =>
                              void mutate(() => deleteSentence(sentence.id)),
                          })
                        }
                      >
                        <ReminderRow done last={false}>
                          <Text
                            style={{ fontSize: 17, lineHeight: 24, color: t.colors.ink }}
                          >
                            {sentence.text}
                          </Text>
                        </ReminderRow>
                      </SwipeRow>
                    ))}
                    <ReminderRow done={false} last>
                      <TextInput
                        accessibilityLabel="Your sentence"
                        multiline
                        submitBehavior="blurAndSubmit"
                        returnKeyType="done"
                        placeholder={`Use “${p.text}” in a sentence`}
                        placeholderTextColor={t.colors.ink3}
                        value={draft}
                        onChangeText={(value) => {
                          // The Save button appears below the field on the first character.
                          if (!draft.trim() && value.trim()) revealSentence();
                          setDraft(value);
                        }}
                        onFocus={() => {
                          sentenceFocused.current = true;
                          revealSentence();
                        }}
                        onBlur={() => {
                          sentenceFocused.current = false;
                        }}
                        onContentSizeChange={revealSentence}
                        onSubmitEditing={() => {
                          if (!draft.trim() || busy) return;
                          void mutate(async () => {
                            await addSentence(id, draft);
                            setDraft("");
                          });
                        }}
                        style={{
                          fontSize: 17,
                          lineHeight: 24,
                          color: t.colors.ink,
                          padding: 0,
                          minHeight: 48,
                        }}
                      />
                    </ReminderRow>
                  </View>
                  {draft.trim() ? (
                    <Pill
                      tone="soft"
                      style={{ alignSelf: "stretch" }}
                      onPress={() =>
                        void mutate(async () => {
                          await addSentence(id, draft);
                          setDraft("");
                        })
                      }
                    >
                      {busy ? "Saving…" : "Save sentence"}
                    </Pill>
                  ) : null}
                </>
              )}
              </View>
            </Card>
          ))}
          <ErrorCard error={error} retry={() => setError(null)} />
          {phraseStage(p) === "Ready" ? (
            <Pill
              style={{ alignSelf: "stretch", marginTop: 6 }}
              icon="mic"
              onPress={() => nav.startTalk({ from: "phrases", phraseId: p.id })}
            >
              Use it in the mirror
            </Pill>
          ) : null}
        </>
      )}
    </Screen>
  );
}

export function NotesStudio({ nav }: { nav: Nav }) {
  const t = useTheme();
  const state = useRefresh(loadNotes, nav.speakingDataRevision),
    [query, setQuery] = useState(""),
    [searching, setSearching] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const create = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const note = await createNote();
      nav.invalidateSpeakingData();
      nav.push("mvpNote", { id: note.id });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const notes = (state.data ?? []).filter((n) =>
    `${n.title} ${n.body}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  // loadNotes returns newest first, so the Map fills Today → Earlier in order.
  const groups = new Map<Period, Note[]>();
  for (const n of notes) {
    const label = periodOf(n.updated_at);
    groups.set(label, [...(groups.get(label) ?? []), n]);
  }
  return (
    <Screen onPullToSearch={() => nav.push("search", { visit: Date.now() })}>
      <Header
        nav={nav}
        title="Studio"
        add={() => void create()}
        addLabel="New note"
        menu={{
          options: [],
          selected: "",
          onSelect: () => {},
          onSearch: () => setSearching(true),
        }}
        filtered={!!query.trim()}
      />
      {searching ? (
        <SearchBar
          query={query}
          setQuery={setQuery}
          placeholder="Search notes"
          close={() => {
            setSearching(false);
            setQuery("");
          }}
        />
      ) : null}
      {query.trim() ? (
        <FilterSummary
          text={`${notes.length} note${notes.length === 1 ? "" : "s"} matching “${query.trim()}”`}
          clear={() => setQuery("")}
        />
      ) : null}

      <ErrorCard
        error={state.error || error}
        retry={() => {
          setError(null);
          void state.refresh();
        }}
      />
      {!state.loading && !notes.length && !state.error ? (
        query ? (
          <EmptyState compact title="No matching notes." body="Try a different word." />
        ) : (
          <EmptyState
            art="notes"
            title="Start with a real moment."
            body="Tomorrow’s meeting. A catch-up with a friend. Something you want to explain. Give your thoughts a place to begin."
            action={{ label: "Write your first note", icon: "pen", onPress: () => void create() }}
          />
        )
      ) : null}
      {[...groups].map(([label, items]) => (
        <SectionCard key={label} label={label}>
          {items.map((n, i) => {
            const title = n.title || "Untitled note";
            return (
              <Row key={n.id} last={i === items.length - 1}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Speak with ${title}`}
                  hitSlop={10}
                  onPress={() =>
                    nav.startTalk({
                      ctx: title,
                      noteId: n.id,
                      beats: n.body.split("\n"),
                      from: "topics",
                      returnTo: {
                        tab: "topics",
                        stack: [{ name: "mvpNote", props: { id: n.id } }],
                      },
                    })
                  }
                >
                  <RowCircle>
                    <Icon name="mic" s={12} c={ROW_GLYPH} />
                  </RowCircle>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${title}, open note`}
                  onPress={() => nav.push("mvpNote", { id: n.id })}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    marginLeft: 6,
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontFamily: FONT.semibold,
                        fontSize: 16,
                        color: t.colors.ink,
                      }}
                    >
                      {title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ fontFamily: FONT.regular, fontSize: 14, color: t.colors.ink3 }}
                    >
                      {notePreview(n.body)}
                    </Text>
                  </View>
                  <Icon name="chev" s={14} c={t.colors.ink2} />
                </Pressable>
              </Row>
            );
          })}
        </SectionCard>
      ))}
    </Screen>
  );
}

/** Heights of the note's two fixed bars: the back bar at the top, and the
 *  pinned Speak button (a 50pt pill under a fade) at the bottom. */
const NOTE_HEADER = Motif.tapTarget + 8;
const NOTE_FOOTER = 78;
export function NoteEditor({ nav, id }: { nav: Nav; id: string }) {
  const { session } = useAuth();
  const draftKey = `saylo.note-draft.${session?.user.id}.${id}`;
  const t = useTheme(),
    insets = useSafeAreaInsets(),
    [note, setNote] = useState<Note | null>(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [status, setStatus] = useState("Loading…"),
    [error, setError] = useState<string | null>(null),
    [typing, setTyping] = useState(false);
  const outline = useRef<NoteOutlineHandle>(null),
    titleInput = useRef<TextInput>(null);
  // While the keyboard is up, "…" turns into Done and the Speak button gives
  // its place to the keyboard.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setTyping(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setTyping(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const current = useRef({ title: "", body: "" }),
    saved = useRef(""),
    queue = useRef(Promise.resolve()),
    loaded = useRef(false),
    alive = useRef(true),
    speaking = useRef(false);
  const load = useCallback(async () => {
    try {
      const n = await loadNote(id);
      const local = await AsyncStorage.getItem(draftKey);
      if (!alive.current) return;
      let restored: { title: string; body: string } | null = null;
      try {
        const parsed = local ? JSON.parse(local) : null;
        if (
          parsed &&
          typeof parsed.title === "string" &&
          typeof parsed.body === "string"
        )
          restored = parsed;
      } catch {}
      current.current = restored ?? { title: n.title, body: n.body };
      saved.current = JSON.stringify({ title: n.title, body: n.body });
      loaded.current = true;
      setNote(n);
      setTitle(current.current.title);
      setBody(current.current.body);
      setStatus(restored ? "Restored unsaved changes" : "All changes saved");
      setError(null);
      // A brand-new note opens ready to type, title first — like a new note
      // anywhere else. (After this render: the title field mounts with it.)
      if (isBlankNote(current.current.title, current.current.body))
        setTimeout(() => titleInput.current?.focus(), 0);
    } catch (e) {
      if (alive.current) setError(message(e));
    }
  }, [id, draftKey]);
  useEffect(() => {
    alive.current = true;
    void Promise.resolve().then(load);
    return () => {
      alive.current = false;
    };
  }, [load]);
  const flush = useCallback(() => {
    const snapshot = { ...current.current };
    const key = JSON.stringify(snapshot);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (key === saved.current) return;
        if (alive.current) setStatus("Saving…");
        await saveNote(id, snapshot.title, snapshot.body);
        saved.current = key;
        if (JSON.stringify(current.current) === key)
          await AsyncStorage.removeItem(draftKey);
        nav.invalidateSpeakingData();
        if (alive.current) {
          setStatus(
            JSON.stringify(current.current) === key
              ? "All changes saved"
              : "Unsaved changes",
          );
          setError(null);
        }
      });
    return queue.current;
  }, [id, nav, draftKey]);
  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(
      () =>
        void flush().catch((e) => {
          if (alive.current) {
            setError(message(e));
            setStatus("Not saved · retry");
          }
        }),
      650,
    );
    return () => clearTimeout(timer);
  }, [title, body, flush]);
  // Also flush on route teardown, so a gesture back cannot silently drop edits.
  // "New note" inserts a row up front, so a note left untouched is discarded on
  // the way out instead of piling up as "Untitled note". Talk keeps it: the
  // mirror returns to this note.
  const discardIfBlank = useCallback(async () => {
    const { title, body } = current.current;
    if (!loaded.current || speaking.current || !isBlankNote(title, body))
      return false;
    loaded.current = false;
    await queue.current.catch(() => {});
    await deleteNote(id);
    await AsyncStorage.removeItem(draftKey);
    nav.invalidateSpeakingData();
    return true;
  }, [id, nav, draftKey]);
  const flushRef = useRef(flush),
    discardRef = useRef(discardIfBlank);
  useEffect(() => {
    flushRef.current = flush;
    discardRef.current = discardIfBlank;
  }, [flush, discardIfBlank]);
  useEffect(
    () => () => {
      void discardRef
        .current()
        .then((gone) => {
          if (!gone && loaded.current) return flushRef.current();
        })
        .catch(() => {});
    },
    [],
  );
  const leave = async (talk = false) => {
    try {
      speaking.current = talk;
      if (!talk && (await discardIfBlank())) return nav.pop();
      await flush();
      if (talk)
        nav.startTalk({
          ctx: current.current.title || "Untitled note",
          noteId: id,
          beats: current.current.body.split("\n"),
          from: "topics",
          returnTo: {
            tab: "topics",
            stack: [{ name: "mvpNote", props: { id } }],
          },
        });
      else nav.pop();
    } catch (e) {
      setError(message(e));
    }
  };
  const edited = (patch: Partial<{ title: string; body: string }>) => {
    Object.assign(current.current, patch);
    setStatus("Unsaved changes");
    void AsyncStorage.setItem(draftKey, JSON.stringify(current.current)).catch(() =>
      setError("Couldn’t keep a local draft. Keep this screen open until saved."),
    );
  };
  const remove = () =>
    confirmDelete({
      title: "Delete this note?",
      message: "Your speaking sessions will stay in your profile.",
      onConfirm: () => {
        void queue.current
          .catch(() => {})
          .then(() => deleteNote(id))
          .then(() => {
            loaded.current = false;
            void AsyncStorage.removeItem(draftKey);
            nav.invalidateSpeakingData();
            nav.pop();
          })
          .catch((e) => setError(message(e)));
      },
    });
  return (
    <View style={{ flex: 1 }}>
      {/* The page leaves room for the bars fixed over it: the back bar at the
          top, the Speak button at the bottom. */}
      <Screen bottomPad={note ? NOTE_FOOTER + 32 : 32}>
        <View style={{ height: NOTE_HEADER }} />
        {error ? (
          <ErrorCard
            error={error}
            retry={() =>
              note ? void flush().catch((e) => setError(message(e))) : void load()
            }
          />
        ) : null}
        {note ? (
          <>
            <View style={{ gap: 6 }}>
              <TextInput
                ref={titleInput}
                accessibilityLabel="Note title"
                maxLength={120}
                placeholder="Give this moment a title"
                placeholderTextColor={t.colors.ink3}
                value={title}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => outline.current?.focusStart()}
                onChangeText={(value) => {
                  setTitle(value);
                  edited({ title: value });
                }}
                style={{
                  fontFamily: FONT.display,
                  fontSize: 36,
                  lineHeight: 42,
                  color: t.colors.ink,
                }}
              />
              <Label>{status}</Label>
            </View>
            <NoteOutline
              ref={outline}
              body={body}
              onChangeBody={(value) => {
                setBody(value);
                edited({ body: value });
              }}
            />
          </>
        ) : !error ? (
          <ActivityIndicator />
        ) : null}
      </Screen>
      {/* Fixed, so Done is in reach however far the note has scrolled. The
          page fades out under it instead of running through the title. */}
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, right: 0 }}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[t.colors.bg, t.colors.bg, `${t.colors.bg}00`]}
          locations={[0, 0.8, 1]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: (insets.top + 8 + NOTE_HEADER) / 0.8,
          }}
        />
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18 }}>
          <BackBar
            title="Studio"
            onBack={() => void leave()}
            right={
              typing ? (
                // As wide as the back button in the layout, so the title stays
                // centred; the capsule itself reaches leftwards out of that box.
                <View style={{ width: Motif.tapTarget, alignItems: "flex-end" }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Done, hide keyboard"
                    onPress={() => Keyboard.dismiss()}
                    style={[
                      {
                        width: 74,
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
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 16, fontWeight: "600", color: t.colors.accD }}
                    >
                      Done
                    </Text>
                  </Pressable>
                </View>
              ) : note ? (
                <MoreMenu>
                  <Button
                    label="Delete note"
                    systemImage="trash"
                    role="destructive"
                    onPress={remove}
                  />
                </MoreMenu>
              ) : null
            }
          />
        </View>
      </View>
      {note && !typing ? (
        <View
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[`${t.colors.bg}00`, t.colors.bg]}
            style={{ height: 28 }}
          />
          <View
            style={{
              backgroundColor: t.colors.bg,
              paddingHorizontal: 18,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <Pill
              style={{ alignSelf: "stretch" }}
              icon="mic"
              onPress={() => void leave(true)}
            >
              Speak with this note
            </Pill>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const loadProfile = async () => {
  const [sessions, phrases] = await Promise.all([
    loadMirrorSessions(),
    loadPhraseBank(),
  ]);
  return { sessions, phrases };
};
export function MvpProfile({ nav }: { nav: Nav }) {
  const { session } = useAuth();
  const displayName = session?.user.user_metadata?.display_name;
  const name =
    typeof displayName === "string" && displayName.trim()
      ? displayName.trim()
      : "Your practice";
  const t = useTheme(),
    state = useRefresh(loadProfile, nav.speakingDataRevision),
    sessions = state.data?.sessions ?? [];
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + i);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    return {
      date,
      seconds: sessions
        .filter(
          (s) =>
            new Date(s.created_at) >= date && new Date(s.created_at) < next,
        )
        .reduce((n, s) => n + s.seconds, 0),
    };
  });
  const max = Math.max(1, ...days.map((d) => d.seconds));
  return (
    <Screen>
      <BackBar title="Profile" onBack={nav.pop} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 15,
          paddingVertical: 12,
        }}
      >
        <Avatar s={58} />
        <View style={{ flex: 1 }}>
          <Serif style={{ fontSize: 32 }}>{name}</Serif>
          <Copy>Every minute is yours.</Copy>
        </View>
      </View>
      <ErrorCard error={state.error} retry={() => void state.refresh()} />
      <Pill tone="card" icon="gear" full onPress={() => nav.push("settings")}>
        Settings & account
      </Pill>
      {state.loading ? <ActivityIndicator /> : null}
      {state.data ? (
        <>
          <Card style={{ gap: 18 }}>
            <Label>SPEAKING TIME · LAST 7 DAYS</Label>
            <Serif style={{ fontSize: 39 }}>
              {durationLabel(days.reduce((n, d) => n + d.seconds, 0))}
            </Serif>
            <View
              style={{
                height: 100,
                flexDirection: "row",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              {days.map((d, i) => (
                <View
                  key={d.date.toISOString()}
                  style={{ flex: 1, alignItems: "center", gap: 9 }}
                >
                  <View
                    accessibilityLabel={`${dateLabel(d.date)}: ${durationLabel(d.seconds)}`}
                    style={{
                      height: Math.max(3, (d.seconds / max) * 75),
                      width: "100%",
                      borderRadius: 5,
                      backgroundColor: i === 6 ? t.colors.acc : t.colors.accS,
                    }}
                  />
                  <Label>
                    {d.date.toLocaleDateString(undefined, {
                      weekday: "narrow",
                    })}
                  </Label>
                </View>
              ))}
            </View>
            <Copy>
              {durationLabel(sessions.reduce((n, s) => n + s.seconds, 0))}{" "}
              spoken in total · {sessions.length} sessions
            </Copy>
          </Card>
          <Card>
            <Label>YOUR PHRASES</Label>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 16,
              }}
            >
              {["Collected", "Learning", "Ready"].map((stage) => (
                <View key={stage} style={{ gap: 6 }}>
                  <Serif style={{ fontSize: 29 }}>
                    {
                      state.data!.phrases.filter(
                        (p) => phraseStage(p) === stage,
                      ).length
                    }
                  </Serif>
                  <Copy>{stage}</Copy>
                </View>
              ))}
            </View>
          </Card>
          <Label>RECENT SESSIONS</Label>
          {!sessions.length ? (
            <EmptyState
              art="sessions"
              title="Your first conversation with yourself starts here."
              body="Talk through a thought for a minute. Each session lands here with its speaking time and recording."
              action={{
                label: "Open mirror",
                icon: "mic",
                onPress: () => nav.startTalk({ from: "phrases" }),
              }}
            />
          ) : (
            sessions.slice(0, 20).map((s) => (
              <SwipeRow
                key={s.id}
                onDelete={() =>
                  confirmDelete({
                    title: "Delete this session?",
                    message: `${durationLabel(s.seconds)} of speaking, and its recording, will be removed.`,
                    onConfirm: () =>
                      void deleteMirrorSession(s)
                        .then(() => {
                          nav.invalidateSpeakingData();
                          return state.refresh();
                        })
                        .catch(() => {}),
                  })
                }
              >
              <Card onPress={() => nav.push("mirrorRecord", { session: s })}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: t.colors.ink, fontWeight: "600" }}>
                    {durationLabel(s.seconds)} of speaking
                  </Text>
                  <Label>{dateLabel(s.created_at)}</Label>
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    lineHeight: 21,
                    color: t.colors.ink2,
                  }}
                >
                  {s.transcript || "No transcript captured."}
                </Text>
              </Card>
              </SwipeRow>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
export function MirrorRecord({
  nav,
  session,
}: {
  nav: Nav;
  session: MirrorSession;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  return (
    <Screen>
      <BackBar title="My records" onBack={nav.pop} />
      <Label>{dateTimeLabel(session.created_at)}</Label>
      <SessionStatsCard transcript={session.transcript ?? ""} seconds={session.seconds} />
      <TranscriptCard
        transcript={session.transcript ?? ""}
        onCopied={() => nav.notify("Transcript copied")}
      />
      {session.note_id ? (
        <Pill onPress={() => nav.push("mvpNote", { id: session.note_id })}>
          Open note
        </Pill>
      ) : null}
      <Pill
        tone="danger"
        style={{ alignSelf: "stretch" }}
        onPress={() =>
          confirmDelete({
            title: "Delete this session?",
            message: "Its transcript and recording will be removed.",
            onConfirm: () => {
              setBusy(true);
              void deleteMirrorSession(session)
                .then(() => {
                  nav.invalidateSpeakingData();
                  nav.pop();
                })
                .catch((e) => {
                  setBusy(false);
                  setError(message(e));
                });
            },
          })
        }
      >
        {busy ? "Deleting…" : "Delete session"}
      </Pill>
      <ErrorCard error={error} retry={() => setError(null)} />
    </Screen>
  );
}
