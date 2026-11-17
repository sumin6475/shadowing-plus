// A Studio Note is a speaking cue, separate from the phrase Hint deck.
// Show one point first; the full outline is available when the learner asks.
//
// The card is one flat surface with an outer shadow. Color belongs to the
// talk's three parts and nothing else: Opening mint, Body amber, Closing rose.
// The strip under the title is the whole talk in those colors, the section
// label repeats the color of the point on screen, and in the outline the
// current point sits on its own lighter row with a bar in its color.
//
// One point at a time is a pager: swipe to move. The arrows stay for anyone
// who doesn't find the swipe, and for VoiceOver.
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutAnimation, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Text } from "@/design/text";
import { hairline } from "@/design/theme";
import { Icon } from "@/design/ui";
import type { OutlinePoint } from "@/lib/mvp";
import { sectionTones, type SectionTone } from "@/lib/note-sections";

const CARD = "rgba(26,28,36,0.94)";
const MUTED = "rgba(255,255,255,0.58)";
const QUIET = "rgba(255,255,255,0.62)";
const LINK = "#BBD0FF";
const TONE: Record<SectionTone, string> = { opening: "#5FD4A6", body: "#F5B555", closing: "#F28BA8" };
const NO_TONE = "rgba(255,255,255,0.8)";
const SIDE = 20;

const sectionLabel = { fontSize: 11.5, lineHeight: 15, fontWeight: "700", letterSpacing: 1 } as const;

export function TalkNoteCue({
  visible,
  note,
  bottom,
}: {
  visible: boolean;
  note: { title: string; points: OutlinePoint[] };
  bottom: number;
}) {
  const { width, height } = useWindowDimensions();
  // The pager is as wide as the card inside its hairline border.
  const pageW = width - 28 - hairline * 2;
  const points = note.points;
  const tones = useMemo(() => sectionTones(points), [points]);
  const color = (i: number) => {
    const tone = tones[i];
    return tone ? TONE[tone] : NO_TONE;
  };

  const [selected, setSelected] = useState(0);
  const [allPoints, setAllPoints] = useState(false);
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const at = Math.min(selected, points.length - 1);
  const pager = useRef<ScrollView>(null);
  const list = useRef<ScrollView>(null);
  const rowY = useRef<Record<number, number>>({});
  // Where the pager opens. Set only when it mounts (coming back from the
  // outline): a contentOffset that follows `at` would fight the finger mid-swipe.
  const [pagerStart, setPagerStart] = useState({ x: 0, y: 0 });

  const move = (step: number) => {
    const next = Math.max(0, Math.min(points.length - 1, at + step));
    if (next === at) return;
    // In the pager the scroll is the source of truth: it reports the new page.
    if (!allPoints) pager.current?.scrollTo({ x: next * pageW, animated: true });
    else setSelected(next);
  };

  // The outline follows the current point as the arrows move it.
  useEffect(() => {
    if (!allPoints) return;
    const y = rowY.current[at];
    if (y !== undefined) list.current?.scrollTo({ y: Math.max(0, y - 6), animated: true });
  }, [allPoints, at]);

  const arrow = (dir: -1 | 1) => {
    const off = dir < 0 ? at === 0 : at === points.length - 1;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dir < 0 ? "Previous note point" : "Next note point"}
        accessibilityState={{ disabled: off }}
        disabled={off}
        onPress={() => move(dir)}
        hitSlop={4}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)",
          opacity: off ? 0.32 : 1,
          transform: dir > 0 ? [{ rotate: "180deg" }] : undefined,
        })}
      >
        <Icon name="back" s={17} c="#fff" />
      </Pressable>
    );
  };

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
        opacity: visible ? 1 : 0,
        borderRadius: 26,
        backgroundColor: CARD,
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 12,
      }}
    >
      {/* The shadow lives on the outer view; this one clips the pager to the card's corners. */}
      <View
        style={{
          borderRadius: 26,
          overflow: "hidden",
          borderWidth: hairline,
          borderColor: "rgba(255,255,255,0.10)",
          paddingTop: 20,
          paddingBottom: 14,
        }}
      >
      <View style={{ paddingHorizontal: SIDE }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="book" s={15} c="rgba(255,255,255,0.72)" />
          <Text numberOfLines={1} style={{ flex: 1, color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 17, fontWeight: "600" }}>
            {note.title}
          </Text>
          <Text style={{ color: MUTED, fontSize: 12.5, lineHeight: 17, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
            {at + 1} / {points.length}
          </Text>
        </View>

        {/* The whole talk, one segment per point, in the colors of its parts. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", gap: 4, marginTop: 14 }}>
          {points.map((_, i) => (
            <View
              key={i}
              style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: color(i), opacity: i === at ? 1 : i < at ? 0.5 : 0.22 }}
            />
          ))}
        </View>
      </View>

      {allPoints ? (
        <ScrollView
          ref={list}
          style={{ maxHeight: Math.min(340, height * 0.38), marginTop: 14 }}
          contentContainerStyle={{ paddingHorizontal: SIDE - 8, gap: 4 }}
          nestedScrollEnabled
          indicatorStyle="white"
        >
          {points.map((point, i) => {
            const on = i === at;
            return (
              <Pressable
                key={`${i}.${point.text}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Go to point ${i + 1}: ${point.text}`}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  rowY.current[i] = y;
                  // The outline opens already showing the current point.
                  if (on) list.current?.scrollTo({ y: Math.max(0, y - 6), animated: false });
                }}
                onPress={() => {
                  setSelected(i);
                  setPagerStart({ x: i * pageW, y: 0 });
                  setAllPoints(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  gap: 12,
                  paddingVertical: 12,
                  paddingLeft: 14,
                  paddingRight: 12,
                  borderRadius: 16,
                  backgroundColor: on ? "rgba(255,255,255,0.10)" : pressed ? "rgba(255,255,255,0.05)" : "transparent",
                })}
              >
                {on ? (
                  <View style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, backgroundColor: color(i) }} />
                ) : null}
                <Text style={{ width: 20, color: on ? "#fff" : MUTED, fontSize: 12, lineHeight: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <View style={{ flex: 1, gap: 5 }}>
                  {point.section ? (
                    <Text style={[sectionLabel, { color: color(i), opacity: on ? 1 : 0.62 }]}>{point.section.toUpperCase()}</Text>
                  ) : null}
                  <Text style={{ color: on ? "#fff" : QUIET, fontSize: 15, lineHeight: 22, fontWeight: on ? "600" : "400" }}>
                    {point.text}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentOffset={pagerStart}
          style={{ marginTop: 18, height: pageHeights[at] }}
          contentContainerStyle={{ alignItems: "flex-start" }}
          onScroll={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
            if (i !== at && i >= 0 && i < points.length) {
              LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
              setSelected(i);
            }
          }}
        >
          {points.map((point, i) => (
            <View
              key={`${i}.${point.text}`}
              accessible
              accessibilityLabel={`Point ${i + 1} of ${points.length}${point.section ? `, ${point.section}` : ""}: ${point.text}`}
              onLayout={(e) => {
                const h = Math.ceil(e.nativeEvent.layout.height);
                setPageHeights((prev) => (prev[i] === h ? prev : { ...prev, [i]: h }));
              }}
              style={{ width: pageW, paddingHorizontal: SIDE, minHeight: 68, gap: 8 }}
            >
              {point.section ? <Text style={[sectionLabel, { color: color(i) }]}>{point.section.toUpperCase()}</Text> : null}
              <Text numberOfLines={4} style={{ color: "#fff", fontSize: 20, lineHeight: 28, fontWeight: "600" }}>
                {point.text}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingHorizontal: SIDE }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={allPoints ? "Show current point" : "Show full note outline"}
          onPress={() => {
            setPagerStart({ x: at * pageW, y: 0 });
            setAllPoints((open) => !open);
          }}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: 40, justifyContent: "center", paddingRight: 14, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ color: LINK, fontSize: 14, fontWeight: "600" }}>{allPoints ? "Current point" : "All points"}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {arrow(-1)}
          {arrow(1)}
        </View>
      </View>
      </View>
    </View>
  );
}
