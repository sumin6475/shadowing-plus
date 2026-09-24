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
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Text, TextInput } from "@/design/text";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { SEARCH_ENABLED } from "@/lib/release-flags";
import { FONT } from "@/design/mobile-tokens";
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
function SectionCard({ label, children }: { label: string; children: ReactNode }) {
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
function Row({ last, children }: { last: boolean; children: ReactNode }) {
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
/** First real line of a note — headings and bullet markers dropped. */
const notePreview = (body: string) =>
  body
    .replace(/Opening|Body|Closing/g, "")
    .split("\n")
    .map((l) => l.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean)
    .join(" · ") || "A blank page for your next conversation.";
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
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={state.loading && !!state.data}
          onRefresh={() => void state.refresh()}
        />
      }
    >
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
        <Card>
          <Serif style={{ fontSize: 26 }}>
            {phrases.length ? "Nothing here yet." : "Good words find you."}
          </Serif>
          <Copy>
            {phrases.length
              ? "Try another filter or search."
              : "Save an expression from a conversation, a video, or your day. Learn it when you have a moment."}
          </Copy>
          {!phrases.length ? (
            <Pill onPress={() => nav.push("capture")}>
              Save your first phrase
            </Pill>
          ) : null}
        </Card>
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
  return (
    <Screen>
      <BackBar title="Phrases" onBack={nav.pop} />
      <ErrorCard error={state.error} retry={() => void state.refresh()} />
      {!p ? (
        state.loading ? (
          <ActivityIndicator />
        ) : null
      ) : (
        <>
          <Label>
            {phraseStage(p).toUpperCase()} · {completedSteps(p)} OF 3
          </Label>
          <Serif style={{ fontSize: 43 }}>{p.text}</Serif>
          <Copy>{p.translation || "An expression to make your own."}</Copy>
          <Label>
            {p.source} · {dateLabel(p.createdAt)}
          </Label>
          <View style={{ flexDirection: "row", gap: 5, marginVertical: 10 }}>
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
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: !!p[step],
                  disabled:
                    busy || (index === 2 && !state.data?.sentences.length),
                }}
                onPress={() => {
                  if (
                    index === 2 &&
                    !p[step] &&
                    !state.data?.sentences.length
                  ) {
                    setError(
                      "Save at least one sentence before completing this step.",
                    );
                    return;
                  }
                  void mutate(() => setStep(id, step, !p[step]));
                }}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                  minHeight: 44,
                }}
              >
                <View
                  style={{
                    height: 26,
                    width: 26,
                    borderRadius: 13,
                    borderWidth: 1.5,
                    borderColor: p[step] ? t.colors.acc : t.colors.ink3,
                    backgroundColor: p[step] ? t.colors.acc : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {p[step] ? (
                    <Icon name="check" s={16} c={t.colors.onAcc} />
                  ) : null}
                </View>
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
                  <Label>
                    {p[step]
                      ? `DONE · ${dateLabel(p[step]!)}`
                      : [
                          "Listen, repeat, then check",
                          "Find a voice and a context",
                          "At least one saved sentence",
                        ][index]}
                  </Label>
                </View>
              </Pressable>
              {index === 0 ? (
                <>
                  <Pill
                    icon={voice.speakingId === id ? "pause" : "speaker"}
                    onPress={() => void voice.toggle(id, p.text)}
                  >
                    {voice.loadingId === id
                      ? "Loading voice…"
                      : voice.speakingId === id
                        ? "Stop"
                        : "Play pronunciation"}
                  </Pill>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pill
                      tone="tint"
                      small
                      onPress={() => {
                        void voice.stop();
                        setRate(rate === 1 ? 0.75 : 1);
                      }}
                    >
                      {rate}× speed
                    </Pill>
                    <Pill
                      tone="tint"
                      small
                      icon="repeat"
                      onPress={() => {
                        void voice.stop();
                        setRepeat(repeat === 1 ? 5 : 1);
                      }}
                    >
                      {repeat === 1 ? "Play once" : "Repeat 5×"}
                    </Pill>
                  </View>
                  <Copy>
                    {voice.fallbackId === id
                      ? "Playing device voice. Tap again to repeat."
                      : "Listen and repeat as often as you like."}
                  </Copy>
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
                    onPress={() =>
                      void WebBrowser.openBrowserAsync(
                        `https://youglish.com/pronounce/${encodeURIComponent(p.text)}/english`,
                        { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET },
                      ).catch((e) => setError(message(e)))
                    }
                  >
                    Open YouGlish
                  </Pill>
                  <Copy>
                    Real videos from youglish.com, opened in a browser inside Saylo.
                  </Copy>
                </>
              ) : (
                <>
                  {state.data?.sentences.map((s: Sentence) => (
                    <View
                      key={s.id}
                      style={{
                        backgroundColor: t.colors.soft,
                        borderRadius: 14,
                        padding: 13,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 15,
                          lineHeight: 22,
                          color: t.colors.ink,
                        }}
                      >
                        {s.text}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete sentence"
                        style={{ padding: 10 }}
                        onPress={() =>
                          Alert.alert(
                            "Delete this sentence?",
                            "Removing the last sentence resets this step.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: () =>
                                  void mutate(() => deleteSentence(s.id)),
                              },
                            ],
                          )
                        }
                      >
                        <Icon name="x" s={14} c={t.colors.ink3} />
                      </Pressable>
                    </View>
                  ))}
                  <Field
                    accessibilityLabel="Your sentence"
                    multiline
                    placeholder={`Use “${p.text}” in your own sentence…`}
                    value={draft}
                    onChangeText={setDraft}
                  />
                  <Pill
                    tone="soft"
                    onPress={() =>
                      void mutate(async () => {
                        await addSentence(id, draft);
                        setDraft("");
                      })
                    }
                  >
                    {busy ? "Saving…" : "Save sentence"}
                  </Pill>
                </>
              )}
            </Card>
          ))}
          <ErrorCard error={error} retry={() => setError(null)} />
          {phraseStage(p) === "Ready" ? (
            <Pill
              full
              icon="mic"
              onPress={() => nav.startTalk({ from: "phrases" })}
            >
              Use it in the mirror
            </Pill>
          ) : null}
          <Pill
            tone="ghost"
            onPress={() =>
              Alert.alert(
                "Delete this phrase?",
                "Its saved sentences will also be removed.",
                [
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
                ],
              )
            }
          >
            Delete phrase
          </Pill>
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
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={state.loading}
          onRefresh={() => void state.refresh()}
        />
      }
    >
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
        <Card>
          <Serif style={{ fontSize: 28 }}>
            {query ? "No matching notes." : "Start with a real moment."}
          </Serif>
          <Copy>
            {query
              ? "Try a different word."
              : "Tomorrow’s meeting. A catch-up with a friend. Something you want to explain. Give your thoughts a place to begin."}
          </Copy>
        </Card>
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

export function NoteEditor({ nav, id }: { nav: Nav; id: string }) {
  const { session } = useAuth();
  const draftKey = `saylo.note-draft.${session?.user.id}.${id}`;
  const t = useTheme(),
    [note, setNote] = useState<Note | null>(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [status, setStatus] = useState("Loading…"),
    [error, setError] = useState<string | null>(null);
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
  return (
    <Screen>
      <BackBar title="Studio" onBack={() => void leave()} />
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
          <TextInput
            accessibilityLabel="Note title"
            maxLength={120}
            placeholder="Give this moment a title"
            placeholderTextColor={t.colors.ink3}
            value={title}
            onChangeText={(value) => {
              current.current.title = value;
              setTitle(value);
              setStatus("Unsaved changes");
              void AsyncStorage.setItem(
                draftKey,
                JSON.stringify(current.current),
              ).catch(() =>
                setError(
                  "Couldn’t keep a local draft. Keep this screen open until saved.",
                ),
              );
            }}
            style={{
              fontFamily: FONT.display,
              fontSize: 36,
              lineHeight: 42,
              color: t.colors.ink,
            }}
          />
          <Label>{status}</Label>
          <TextInput
            accessibilityLabel="Note outline"
            multiline
            textAlignVertical="top"
            value={body}
            onChangeText={(value) => {
              current.current.body = value;
              setBody(value);
              setStatus("Unsaved changes");
              void AsyncStorage.setItem(
                draftKey,
                JSON.stringify(current.current),
              ).catch(() =>
                setError(
                  "Couldn’t keep a local draft. Keep this screen open until saved.",
                ),
              );
            }}
            style={{
              minHeight: 360,
              fontSize: 18,
              lineHeight: 29,
              color: t.colors.ink,
              paddingVertical: 20,
            }}
          />
          <Pill full icon="mic" onPress={() => void leave(true)}>
            Speak with this note
          </Pill>
          <Pill full tone="soft" onPress={() => void leave()}>
            Done
          </Pill>
          <Pill
            tone="ghost"
            style={{ alignSelf: "stretch" }}
            onPress={() =>
              Alert.alert(
                "Delete this note?",
                "Your speaking sessions will stay in your profile.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
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
                  },
                ],
              )
            }
          >
            Delete note
          </Pill>
        </>
      ) : !error ? (
        <ActivityIndicator />
      ) : null}
    </Screen>
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
            <Card>
              <Copy>Your first conversation with yourself starts here.</Copy>
              <Pill
                icon="mic"
                onPress={() => nav.startTalk({ from: "phrases" })}
              >
                Open mirror
              </Pill>
            </Card>
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
      <Serif style={{ fontSize: 40 }}>
        {durationLabel(session.seconds)} of speaking.
      </Serif>
      <Card>
        <Label>TRANSCRIPT</Label>
        <Copy>
          {session.transcript || "No transcript was captured for this session."}
        </Copy>
      </Card>
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
