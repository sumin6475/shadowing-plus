// A mirror session's numbers, laid out after Wispr Flow / SpeakType: one big
// serif figure with its label beside it, a line of copy, then a 2×2 grid of
// small stats. Shared by the result screen and a saved session's record.
import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Text } from "@/design/text";
import { FONT } from "@/design/mobile-tokens";
import { useTheme } from "@/design/theme";
import { Card, Icon } from "@/design/ui";
import { compactDuration, sessionStats } from "@/lib/mvp";

interface Stat {
  symbol: SFSymbol;
  value: string;
  label: string;
}

export function SessionStatsCard({
  transcript,
  seconds,
  phrases,
}: {
  transcript: string;
  seconds: number;
  /** Hint cards used / shown — only a live session knows this. */
  phrases?: { used: number; total: number } | null;
}) {
  const t = useTheme();
  const stats = sessionStats(transcript, seconds);
  const cells: Stat[] = [
    { symbol: "timer", value: compactDuration(seconds), label: "Speaking time" },
    {
      symbol: "speedometer",
      value: stats.wpm === null ? "–" : String(stats.wpm),
      label: "Words per minute",
    },
    ...(phrases
      ? [
          {
            symbol: "checkmark.circle" as const,
            value: `${phrases.used}/${phrases.total}`,
            label: "Phrases used",
          },
        ]
      : []),
    { symbol: "character.book.closed", value: String(stats.distinct), label: "Different words" },
  ];
  return (
    <Card style={{ gap: 18 }}>
      <View style={{ gap: 6 }}>
        <View
          accessible
          accessibilityLabel={`${stats.words} ${stats.words === 1 ? "word" : "words"} spoken`}
          style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: 10 }}
        >
          <Text
            style={{
              fontFamily: FONT.figure,
              fontSize: 64,
              lineHeight: 72,
              letterSpacing: -1.5,
              color: t.colors.ink,
            }}
          >
            {stats.words.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 17, color: t.colors.ink2 }}>
            {stats.words === 1 ? "word" : "words"} spoken
          </Text>
        </View>
        <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2 }}>
          A little more English, in your own voice.
        </Text>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.sep }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 20 }}>
        {cells.map((cell) => (
          <View
            key={cell.label}
            accessible
            accessibilityLabel={`${cell.label}: ${cell.value}`}
            style={{ width: "50%", flexDirection: "row", gap: 10, paddingRight: 8 }}
          >
            <SymbolView
              name={cell.symbol}
              size={19}
              tintColor={t.colors.ink3}
              style={{ width: 22, height: 22, marginTop: 5 }}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontFamily: FONT.figure,
                  fontSize: 28,
                  lineHeight: 33,
                  letterSpacing: -0.4,
                  color: t.colors.ink,
                }}
              >
                {cell.value}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 13, color: t.colors.ink2 }}>
                {cell.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** The transcript, with Copy. `maxHeight` caps the card so a long session
 *  scrolls inside it instead of pushing everything below off the screen. */
export function TranscriptCard({
  transcript,
  label = "TRANSCRIPT",
  empty = "No transcript was captured for this session.",
  maxHeight,
  onCopied,
}: {
  transcript: string;
  label?: string;
  empty?: string;
  maxHeight?: number;
  onCopied?: () => void;
}) {
  const t = useTheme();
  const scroll = useRef<ScrollView>(null);
  const text = transcript.trim();
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: t.colors.ink3,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1,
          }}
        >
          {label}
        </Text>
        {text ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy transcript"
            hitSlop={10}
            onPress={() => void Clipboard.setStringAsync(text).then(() => onCopied?.())}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: t.colors.soft,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <SymbolView name="doc.on.doc" size={13} tintColor={t.colors.ink2} style={{ width: 14, height: 14 }} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.colors.ink2 }}>Copy</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        ref={scroll}
        style={maxHeight ? { maxHeight } : undefined}
        scrollEnabled={!!maxHeight}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        onContentSizeChange={() => scroll.current?.flashScrollIndicators()}
      >
        <Text selectable style={{ fontSize: 17, lineHeight: 28, color: text ? t.colors.ink : t.colors.ink2 }}>
          {text || empty}
        </Text>
      </ScrollView>
    </Card>
  );
}

/** The hint cards a session showed, as chips: a check on the ones said.
 *  Chips, not rows — five phrases stay two or three lines tall. */
export function PhraseChipsCard({
  phrases,
  onOpen,
}: {
  phrases: { id: string; text: string; used: boolean }[];
  onOpen: (id: string) => void;
}) {
  const t = useTheme();
  return (
    <Card style={{ gap: 14 }}>
      <Text style={{ color: t.colors.ink3, fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
        PHRASES YOU TRIED
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {phrases.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.text}, ${p.used ? "used" : "not used"}, open details`}
            onPress={() => onOpen(p.id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              maxWidth: "100%",
              paddingVertical: 8,
              paddingLeft: p.used ? 10 : 14,
              paddingRight: 14,
              borderRadius: 999,
              backgroundColor: p.used ? t.colors.accS : t.colors.soft,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {p.used ? <Icon name="check" s={13} w={2.6} c={t.colors.acc} /> : null}
            <Text
              numberOfLines={1}
              style={{
                flexShrink: 1,
                fontSize: 15,
                fontWeight: p.used ? "600" : "500",
                color: p.used ? t.colors.acc : t.colors.ink2,
              }}
            >
              {p.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
