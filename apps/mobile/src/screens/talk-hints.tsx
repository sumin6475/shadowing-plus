// Mirror hints: phrase cards to try while speaking. The live transcript checks
// a card off the moment its phrase is said (see lib/phrase-use), and the deck
// moves on to the next one. The learner can also tick a card by hand — speech
// recognition does not catch every phrase. A note's outline rides along as the first card,
// its points ticked by hand. Everything here draws over the camera.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Text } from "@/design/text";
import { Icon } from "@/design/ui";
import type { HintPhrase, OutlinePoint } from "@/lib/mvp";

export const FROST = "rgba(20,22,28,0.65)";
/** iOS system green: "done" reads the same over any camera frame. */
export const USED = "#34C759";
const LABEL = {
  color: "#BCC9DF",
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 1,
} as const;
const MARK = 28;
/** How long a freshly used card stays up before the deck moves on. */
const ADVANCE_MS = 900;

type Page =
  | { kind: "note" }
  | { kind: "phrase"; card: HintPhrase }
  | { kind: "empty" };

const pageKey = (p: Page) => (p.kind === "phrase" ? p.card.id : p.kind);

/** A card's check, popping in at the moment it turns on. */
function UsedMark({ used }: { used: boolean }) {
  const scale = useMemo(() => new Animated.Value(1), []);
  const was = useRef(used);
  // Layout effect: shrink before the first frame of the check is painted.
  useLayoutEffect(() => {
    if (used && !was.current) {
      scale.setValue(0.4);
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
    }
    was.current = used;
  }, [used, scale]);
  if (!used)
    return (
      <View
        style={{
          width: MARK,
          height: MARK,
          borderRadius: MARK / 2,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.55)",
        }}
      />
    );
  return (
    <Animated.View
      style={{
        width: MARK,
        height: MARK,
        borderRadius: MARK / 2,
        backgroundColor: USED,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale }],
      }}
    >
      <Icon name="check" s={15} w={2.8} c="#fff" />
    </Animated.View>
  );
}

function PhrasePage({
  card,
  used,
  usedCount,
  total,
  open,
  toggle,
  toggleUsed,
}: {
  card: HintPhrase;
  used: boolean;
  usedCount: number;
  total: number;
  open: boolean;
  toggle: () => void;
  toggleUsed: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.text}. ${used ? "Used." : "Not used yet."}`}
      accessibilityHint={open ? "Hides the meaning" : "Shows the meaning and your sentence"}
      onPress={toggle}
      style={{ gap: 12 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={LABEL}>TRY USING</Text>
        <Text style={[LABEL, usedCount ? { color: USED } : null]}>
          {usedCount} OF {total} USED
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Text
          style={{ flex: 1, color: "#fff", fontSize: 22, lineHeight: 28, fontWeight: "600" }}
        >
          {card.text}
        </Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: used }}
          accessibilityLabel={`Mark ${card.text} as used`}
          hitSlop={12}
          onPress={toggleUsed}
        >
          <UsedMark used={used} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ gap: 6 }}>
          {card.translation ? (
            <Text style={{ color: "#D6DEEC", fontSize: 15, lineHeight: 21 }}>
              {card.translation}
            </Text>
          ) : null}
          <Text
            numberOfLines={3}
            style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, lineHeight: 21 }}
          >
            {card.sentence ? `“${card.sentence}”` : "No sentence of yours yet."}
          </Text>
        </View>
      ) : (
        <Text style={{ color: used ? USED : "rgba(255,255,255,0.6)", fontSize: 13 }}>
          {used ? "You used it. Nice." : "Say it or tap the circle to check it off · Tap for meaning"}
        </Text>
      )}
    </Pressable>
  );
}

/** A note's outline, as tall as its points up to `maxHeight`. Past that it
 *  scrolls, and its bottom edge fades out to say there is more below. */
function NotePage({
  title,
  points,
  covered,
  toggle,
  maxHeight,
}: {
  title: string;
  points: OutlinePoint[];
  covered: number[];
  toggle: (i: number) => void;
  maxHeight: number;
}) {
  const box = useRef({ view: 0, content: 0, y: 0 });
  const [more, setMore] = useState(false);
  const measure = (patch: Partial<typeof box.current>) => {
    Object.assign(box.current, patch);
    const { view, content, y } = box.current;
    setMore(view > 0 && content - view - y > 4);
  };
  return (
    <View style={{ gap: 10 }}>
      <Text numberOfLines={1} style={LABEL}>
        YOUR NOTE · {title.toUpperCase()}
      </Text>
      {/* The card is see-through, so the fade is a mask on the list itself —
          a painted gradient would show as a darker band over the camera. */}
      <MaskedView
        maskElement={
          <LinearGradient
            colors={["#000", "#000", more ? "transparent" : "#000"]}
            locations={[0, 0.82, 1]}
            style={{ flex: 1 }}
          />
        }
      >
        <ScrollView
          style={{ maxHeight }}
          nestedScrollEnabled
          indicatorStyle="white"
          scrollEventThrottle={32}
          onLayout={(e) => measure({ view: e.nativeEvent.layout.height })}
          onContentSizeChange={(_, h) => measure({ content: h })}
          onScroll={(e) => measure({ y: e.nativeEvent.contentOffset.y })}
        >
          {points.map((point, i) => {
            const done = covered.includes(i);
            const heading = point.section && point.section !== points[i - 1]?.section;
            return (
              <View key={`${i}.${point.text}`}>
                {heading ? (
                  <Text style={[LABEL, { marginTop: i ? 10 : 2, marginBottom: 4, color: "#8FA0BD" }]}>
                    {point.section!.toUpperCase()}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  onPress={() => toggle(i)}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 5 }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      marginTop: 1,
                      borderRadius: 10,
                      borderWidth: done ? 0 : 1.6,
                      borderColor: "rgba(255,255,255,0.55)",
                      backgroundColor: done ? USED : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {done ? <Icon name="check" s={11} w={2.8} c="#fff" /> : null}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      color: done ? "rgba(255,255,255,0.55)" : "#fff",
                      fontSize: 16,
                      lineHeight: 22,
                      textDecorationLine: done ? "line-through" : "none",
                    }}
                  >
                    {point.text}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </MaskedView>
    </View>
  );
}

/** The frosted card deck above the mirror's controls. It stays mounted while
 *  hidden, so the page, an opened card and ticked note points survive the
 *  Hint button. */
export function HintDeck({
  visible,
  cards,
  usedIds,
  onToggleUsed,
  latestId,
  note,
  bottom,
}: {
  visible: boolean;
  cards: HintPhrase[];
  usedIds: Set<string>;
  /** A tap on a card's circle: ticks it by hand, or takes a hand tick back. */
  onToggleUsed: (id: string) => void;
  /** The phrase used most recently — the deck moves on from it. */
  latestId: string | null;
  note: { title: string; points: OutlinePoint[] } | null;
  bottom: number;
}) {
  const { width, height } = useWindowDimensions();
  const pageW = width - 28;
  // Room for a three-part note without scrolling, while the mirror above the
  // deck stays in view.
  const noteMax = Math.round(Math.min(340, Math.max(200, height * 0.36)));
  const pages = useMemo<Page[]>(
    () => [
      ...(note ? [{ kind: "note" as const }] : []),
      ...cards.map((card) => ({ kind: "phrase" as const, card })),
      ...(!note && !cards.length ? [{ kind: "empty" as const }] : []),
    ],
    [cards, note],
  );
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  // The deck is as tall as the page it shows, not as its tallest page — a
  // long note would otherwise leave every phrase card half empty.
  const [heights, setHeights] = useState<Record<string, number>>({});
  const shown = pages[Math.min(page, pages.length - 1)];
  const deck = useRef<ScrollView>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [covered, setCovered] = useState<number[]>([]);
  const handled = useRef(latestId);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!latestId || handled.current === latestId) return;
    handled.current = latestId;
    const at = pages.findIndex((p) => p.kind === "phrase" && p.card.id === latestId);
    // Only move on from the card being looked at; leave any other page be.
    if (at < 0 || at !== pageRef.current) return;
    const open = (i: number) => {
      const p = pages[i];
      return p?.kind === "phrase" && !usedIds.has(p.card.id);
    };
    let target = pages.findIndex((_, i) => i > at && open(i));
    if (target < 0) target = pages.findIndex((_, i) => open(i));
    if (target < 0) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => deck.current?.scrollTo({ x: target * pageW, animated: true }),
      ADVANCE_MS,
    );
  }, [latestId, pages, usedIds, pageW]);
  const usedCount = cards.filter((c) => usedIds.has(c.id)).length;
  return (
    <View
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={{
        position: "absolute",
        left: 14,
        right: 14,
        bottom,
        zIndex: 15,
        backgroundColor: FROST,
        borderRadius: 24,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
      }}
    >
      <ScrollView
        ref={deck}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        style={{ height: shown ? heights[pageKey(shown)] : undefined }}
        contentContainerStyle={{ alignItems: "flex-start" }}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
          if (i !== pageRef.current && i >= 0 && i < pages.length) {
            pageRef.current = i;
            LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
            setPage(i);
            setOpenId(null);
          }
        }}
      >
        {pages.map((p) => (
          <View
            key={pageKey(p)}
            onLayout={(e) => {
              const key = pageKey(p);
              const h = Math.ceil(e.nativeEvent.layout.height);
              setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h }));
            }}
            style={{ width: pageW, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 }}
          >
            {p.kind === "phrase" ? (
              <PhrasePage
                card={p.card}
                used={usedIds.has(p.card.id)}
                usedCount={usedCount}
                total={cards.length}
                open={openId === p.card.id}
                toggle={() => setOpenId(openId === p.card.id ? null : p.card.id)}
                toggleUsed={() => onToggleUsed(p.card.id)}
              />
            ) : p.kind === "note" && note ? (
              <NotePage
                title={note.title}
                points={note.points}
                covered={covered}
                toggle={(i) =>
                  setCovered((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))
                }
                maxHeight={noteMax}
              />
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={LABEL}>TRY USING</Text>
                <Text style={{ color: "#fff", fontSize: 16, lineHeight: 23 }}>
                  Save a phrase and it shows up here, to try while you talk.
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      {pages.length > 1 ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingBottom: 12 }}
        >
          {pages.map((p, i) => (
            <View
              key={pageKey(p)}
              style={{
                width: i === page ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  p.kind === "phrase" && usedIds.has(p.card.id)
                    ? USED
                    : i === page
                      ? "#fff"
                      : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** With the deck hidden, a used phrase still gets its moment: a pill that
 *  fades in over the controls and away again. Mounted for the whole session
 *  and keyed on the phrase, so toggling the deck never replays an old one. */
export function UsedToast({
  phrase,
  hidden,
  bottom,
}: {
  phrase: HintPhrase | null;
  /** True while the deck is showing — the card itself carries the moment. */
  hidden: boolean;
  bottom: number;
}) {
  const opacity = useMemo(() => new Animated.Value(0), []);
  const run = useRef<Animated.CompositeAnimation | null>(null);
  const hiddenNow = useRef(hidden);
  useEffect(() => {
    hiddenNow.current = hidden;
    if (hidden) {
      run.current?.stop();
      opacity.setValue(0);
    }
  }, [hidden, opacity]);
  const id = phrase?.id;
  useEffect(() => {
    if (!id || hiddenNow.current) return;
    opacity.setValue(0);
    run.current = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]);
    run.current.start();
  }, [id, opacity]);
  useEffect(() => () => run.current?.stop(), []);
  if (!phrase) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 28,
        right: 28,
        bottom,
        zIndex: 16,
        alignItems: "center",
        opacity,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          backgroundColor: FROST,
          borderRadius: 999,
          paddingVertical: 9,
          paddingLeft: 10,
          paddingRight: 16,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: USED,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" s={11} w={2.8} c="#fff" />
        </View>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: "#fff", fontSize: 15, fontWeight: "600" }}>
          Used · {phrase.text}
        </Text>
      </View>
    </Animated.View>
  );
}
