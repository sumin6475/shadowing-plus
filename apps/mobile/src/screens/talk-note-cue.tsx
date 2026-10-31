// A Studio Note is a speaking cue, separate from the phrase Hint deck.
// Show one point first; the full outline is available when the learner asks.
import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Text } from "@/design/text";
import { Icon } from "@/design/ui";
import type { OutlinePoint } from "@/lib/mvp";
import { FROST } from "./talk-hints";

const MUTED = "rgba(255,255,255,0.66)";
const ACCENT = "#BBD0FF";

export function TalkNoteCue({
  visible,
  note,
  bottom,
}: {
  visible: boolean;
  note: { title: string; points: OutlinePoint[] };
  bottom: number;
}) {
  const { height } = useWindowDimensions();
  const [selected, setSelected] = useState(0);
  const [allPoints, setAllPoints] = useState(false);
  const points = note.points;
  const current = points[Math.min(selected, points.length - 1)];
  const move = (step: number) => setSelected((i) => Math.max(0, Math.min(points.length - 1, i + step)));

  return (
    <View
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={{ position: "absolute", left: 14, right: 14, bottom, zIndex: 15, opacity: visible ? 1 : 0 }}
    >
      {/* A quiet second sheet gives the cue a paper identity without covering more camera. */}
      <View
        style={{ position: "absolute", top: 5, left: 12, right: 12, bottom: -5, borderRadius: 24, backgroundColor: "rgba(225,233,249,0.20)" }}
      />
      <View style={{ backgroundColor: FROST, borderRadius: 24, paddingTop: 17, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="book" s={16} c={ACCENT} />
            <Text numberOfLines={1} style={{ flex: 1, color: ACCENT, fontSize: 12, fontWeight: "700", letterSpacing: 0.7 }}>
              {note.title.toUpperCase()}
            </Text>
          </View>
          <Text style={{ color: MUTED, fontSize: 12, fontWeight: "700" }}>{selected + 1} / {points.length}</Text>
        </View>

        {allPoints ? (
          <ScrollView style={{ maxHeight: Math.min(330, height * 0.36), marginTop: 15 }} nestedScrollEnabled indicatorStyle="white">
            {points.map((point, i) => (
              <Pressable
                key={`${i}.${point.text}`}
                accessibilityRole="button"
                accessibilityLabel={`Go to point ${i + 1}: ${point.text}`}
                onPress={() => { setSelected(i); setAllPoints(false); }}
                style={{ flexDirection: "row", gap: 12, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: "rgba(255,255,255,0.12)" }}
              >
                <Text style={{ width: 23, color: i === selected ? ACCENT : MUTED, fontSize: 12, fontWeight: "700" }}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <View style={{ flex: 1, gap: 3 }}>
                  {point.section ? (
                    <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>
                      {point.section.toUpperCase()}
                    </Text>
                  ) : null}
                  <Text style={{ color: "#fff", fontSize: 15, lineHeight: 21, fontWeight: i === selected ? "700" : "400" }}>
                    {point.text}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={{ marginTop: 15, minHeight: 60, justifyContent: "center" }}>
            {current.section ? (
              <Text style={{ color: MUTED, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 5 }}>
                {current.section.toUpperCase()}
              </Text>
            ) : null}
            <Text numberOfLines={3} style={{ color: "#fff", fontSize: 20, lineHeight: 27, fontWeight: "600" }}>
              {current.text}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={allPoints ? "Show current point" : "Show full note outline"}
            onPress={() => setAllPoints((open) => !open)}
            style={{ paddingVertical: 8, paddingRight: 14 }}
          >
            <Text style={{ color: ACCENT, fontSize: 13, fontWeight: "700" }}>
              {allPoints ? "Current point" : "All points"}
            </Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous note point"
              accessibilityState={{ disabled: selected === 0 }}
              disabled={selected === 0}
              onPress={() => move(-1)}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.10)", opacity: selected === 0 ? 0.35 : 1 }}
            >
              <Icon name="back" s={17} c="#fff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next note point"
              accessibilityState={{ disabled: selected === points.length - 1 }}
              disabled={selected === points.length - 1}
              onPress={() => move(1)}
              style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.10)", opacity: selected === points.length - 1 ? 0.35 : 1, transform: [{ rotate: "180deg" }] }}
            >
              <Icon name="back" s={17} c="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
