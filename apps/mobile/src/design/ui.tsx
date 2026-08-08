// ui.tsx — shared primitives ported from sp-theme.jsx: Card, Hero, Block, Pill,
// Chip, Badge, Avatar, Header, BackBar, Sect, Screen, Wave, StatTile, TabBar.
import { useEffect, useMemo, useRef, type ReactElement, type ReactNode } from "react";
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

import { Icon, type IconName } from "./icon";
import { SERIF, hairline, statusColors, useTheme, type Theme } from "./theme";

export { Icon } from "./icon";
export type { IconName } from "./icon";

export type Tone = "butter" | "sky" | "sage" | "blush" | "acc" | "accS" | "soft";

export function toneColor(t: Theme, name: string): string {
  const map: Record<string, string> = {
    butter: t.colors.butter,
    sky: t.colors.sky,
    sage: t.colors.sage,
    blush: t.colors.blush,
    acc: t.colors.acc,
    accS: t.colors.accS,
    soft: t.colors.soft,
  };
  return map[name] ?? t.colors.soft;
}

// ── Text ─────────────────────────────────────────────────────────────────
// Newsreader reads ~10% smaller than the Georgia it replaced, so scale every
// serif's fontSize + lineHeight once here — the whole app compensates uniformly
// without editing each call site. Per-site fontSize still sets relative size;
// this only nudges the overall serif scale up.
const SERIF_SCALE = 1.1;

export function Serif({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const scaled: TextStyle = {};
  if (typeof flat?.fontSize === "number") scaled.fontSize = Math.round(flat.fontSize * SERIF_SCALE);
  if (typeof flat?.lineHeight === "number") scaled.lineHeight = Math.round(flat.lineHeight * SERIF_SCALE);
  return <Text style={[{ fontFamily: SERIF, letterSpacing: -0.2 }, style, scaled]}>{children}</Text>;
}

// ── Card ─────────────────────────────────────────────────────────────────
export function Card({
  children,
  onPress,
  lg,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  lg?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.colors.card,
    borderRadius: t.r,
    padding: t.padc,
    borderWidth: hairline,
    borderColor: t.ring,
    ...(lg ? t.shadowLg : t.shadowCard),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ── Hero (accent) ──────────────────────────────────────────────────────────
export function Hero({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.colors.acc,
    borderRadius: t.r,
    padding: t.padc + 9,
    overflow: "hidden",
    ...t.shadowCard,
  };
  const inner = (
    <>
      <View
        style={{
          position: "absolute",
          right: -30,
          top: -30,
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: "rgba(255,255,255,0.09)",
        }}
      />
      {children}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.92 : 1 }, style]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{inner}</View>;
}

// ── Block (tinted tone) ────────────────────────────────────────────────────
export function Block({
  tone = "butter",
  children,
  onPress,
  style,
}: {
  tone?: string;
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: toneColor(t, tone),
    borderRadius: t.r,
    padding: t.padc,
    borderWidth: hairline,
    borderColor: t.ring,
    ...t.shadowCard,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.88 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ── Pill (capsule button) ──────────────────────────────────────────────────
type PillTone = "acc" | "dark" | "soft" | "white" | "ghost" | "tint";
export function Pill({
  children,
  onPress,
  tone = "acc",
  full,
  small,
  icon,
  style,
  textStyle,
}: {
  children?: ReactNode;
  onPress?: () => void;
  tone?: PillTone;
  full?: boolean;
  small?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  const tones: Record<PillTone, { bg: string; fg: string; shadow?: boolean }> = {
    acc: { bg: t.colors.acc, fg: "#fff" },
    dark: { bg: t.colors.pill, fg: "#fff" },
    soft: { bg: t.colors.accS, fg: t.colors.accD },
    white: { bg: t.colors.card, fg: t.colors.ink, shadow: true },
    ghost: { bg: "transparent", fg: t.colors.ink2 },
    tint: { bg: t.colors.soft, fg: t.colors.ink },
  };
  const tv = tones[tone];
  const h = small ? 34 : 50;
  const fs = small ? 15 : 17;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: h,
          borderRadius: 9999,
          paddingHorizontal: small ? 16 : 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          backgroundColor: tv.bg,
          flex: full ? 1 : undefined,
          alignSelf: full ? undefined : "flex-start",
          opacity: pressed ? 0.85 : 1,
        },
        tv.shadow ? t.shadowCard : null,
        style,
      ]}
    >
      {icon ? <Icon name={icon} s={small ? 15 : 17} w={2} c={tv.fg} /> : null}
      {typeof children === "string" ? (
        <Text style={[{ color: tv.fg, fontSize: fs, fontWeight: "600", letterSpacing: -0.1 }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

// ── Chip ────────────────────────────────────────────────────────────────────
export function Chip({
  children,
  active,
  onPress,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 34,
          borderRadius: 9999,
          paddingHorizontal: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? t.colors.pill : t.colors.card,
          borderWidth: active ? 0 : hairline,
          borderColor: t.ring,
          opacity: pressed ? 0.8 : 1,
        },
        active ? null : t.shadowCard,
        style,
      ]}
    >
      <Text style={{ color: active ? "#fff" : t.colors.ink2, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
        {children}
      </Text>
    </Pressable>
  );
}

// ── Badge (status) ──────────────────────────────────────────────────────────
export function Badge({ s, style }: { s: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [bg, cl] = statusColors(t)[s] ?? [t.colors.soft, t.colors.ink2];
  return (
    <View
      style={[{ backgroundColor: bg, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 }, style]}
    >
      <Text style={{ color: cl, fontSize: 11, fontWeight: "700", letterSpacing: 0.1 }}>{s}</Text>
    </View>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ s = 44, onPress }: { s?: number; onPress?: () => void }) {
  const t = useTheme();
  const inner = (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        backgroundColor: t.colors.pill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: s * 0.38 }}>S</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

// ── Header ──────────────────────────────────────────────────────────────────
export function Header({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: string;
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: 2, paddingTop: 4, paddingBottom: 6 }}>
      {eyebrow || right ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 44,
            marginBottom: 22,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>{eyebrow}</Text>
          {right}
        </View>
      ) : null}
      {typeof title === "string" ? (
        <Serif style={{ fontSize: 34, lineHeight: 37, color: t.colors.ink }}>{title}</Serif>
      ) : (
        title
      )}
      {sub ? <Text style={{ fontSize: 15, color: t.colors.ink2, marginTop: 10, lineHeight: 21 }}>{sub}</Text> : null}
    </View>
  );
}

// ── BackBar ─────────────────────────────────────────────────────────────────
export function BackBar({
  title,
  onBack,
  right,
}: {
  title?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, minHeight: 44 }}>
      <Pressable
        onPress={onBack}
        style={[
          {
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: t.colors.card,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: hairline,
            borderColor: t.ring,
          },
          t.shadowCard,
        ]}
      >
        <Icon name="back" s={18} w={2.2} c={t.colors.ink} />
      </Pressable>
      <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", letterSpacing: -0.1, color: t.colors.ink }} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

// ── Sect ────────────────────────────────────────────────────────────────────
export function Sect({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 2, paddingTop: 6 },
        style,
      ]}
    >
      <Serif style={{ fontSize: 22, color: t.colors.ink }}>{title}</Serif>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Screen (scroll container) ───────────────────────────────────────────────
export function Screen({
  children,
  noPad,
  bottomPad = 120,
  style,
  refreshControl,
}: {
  children: ReactNode;
  noPad?: boolean;
  bottomPad?: number;
  style?: StyleProp<ViewStyle>;
  /** Optional <RefreshControl> for pull-to-refresh (data-backed screens). */
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Progressive top frost: full (translucent) over the status bar, then a long,
  // gentle multi-stop fade to nothing well below it so there's no visible edge.
  const frostH = insets.top + 40;
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: t.colors.bg }}
        contentContainerStyle={[
          {
            paddingTop: insets.top + 8,
            paddingBottom: bottomPad + insets.bottom,
            paddingHorizontal: noPad ? 0 : 18,
            gap: t.gap,
          },
          style,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Focused inputs sit above the keyboard: iOS insets the scroll view for
        // the keyboard and scrolls the focused field into view automatically.
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
      {/* Progressive top frost: a BlurView masked by a vertical gradient, so the
          blur is present (translucent, ~55%) over the status bar and fades fully
          to nothing just below it — no hard boundary line. Purely visual. */}
      {insets.top > 0 ? (
        <MaskedView
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: frostH }}
          maskElement={
            <LinearGradient
              colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.14)", "transparent"]}
              locations={[0, 0.45, 0.8, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{ flex: 1 }}
            />
          }
        >
          <BlurView tint="systemUltraThinMaterial" style={{ flex: 1 }} />
        </MaskedView>
      ) : null}
    </View>
  );
}

// ── Wave (animated bars) ────────────────────────────────────────────────────
export function Wave({
  n = 26,
  active,
  h = 30,
  color,
}: {
  n?: number;
  active?: boolean;
  h?: number;
  color?: string;
}) {
  const t = useTheme();
  const c = color ?? t.colors.accD;
  // Deterministic per-index heights (pure — no Math.random during render), so
  // the bars keep stable resting heights across re-renders. useMemo (not a ref)
  // keeps the Animated.Values off the render-time ref-read path.
  const bars = useMemo(() => Array.from({ length: n }, (_, i) => 0.3 + (((i * 2654435761) % 100) / 100) * 0.7), [n]);
  const anims = useMemo(() => bars.map((b) => new Animated.Value(b)), [bars]);

  useEffect(() => {
    if (!active) {
      anims.forEach((a, i) => a.setValue(bars[i]));
      return;
    }
    const loops = anims.map((a, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(a, {
            toValue: 0.35,
            duration: 350 + (i % 5) * 65,
            delay: i * 40,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(a, {
            toValue: 1,
            duration: 350 + (i % 5) * 65,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <View style={{ flexDirection: "row", gap: 3, alignItems: "center", height: h }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 9999,
            backgroundColor: c,
            height: h,
            opacity: active ? 1 : 0.55,
            transform: [{ scaleY: a }],
          }}
        />
      ))}
    </View>
  );
}

// ── StatTile ────────────────────────────────────────────────────────────────
export function StatTile({
  tone,
  label,
  value,
  unit,
  foot,
  span,
  onPress,
}: {
  tone: string;
  label: string;
  value: string;
  unit: string;
  foot: string;
  span?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Block tone={tone} onPress={onPress} style={{ flex: span ? undefined : 1, width: span ? "100%" : undefined, gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: t.colors.onB }}>{label}</Text>
        <Icon name="chev" s={13} w={2.2} c={t.colors.onB2} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -1, color: t.colors.onB, fontVariant: ["tabular-nums"] }}>
          {value}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "600", color: t.colors.onB2 }}>{unit}</Text>
      </View>
      <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: "600", color: t.colors.onB2, lineHeight: 17 }}>
        {foot}
      </Text>
    </Block>
  );
}

// ── Row helper (for pill groups) ────────────────────────────────────────────
export function Row({ children, gap, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ flexDirection: "row", gap: gap ?? t.gap, alignItems: "center" }, style]}>{children}</View>;
}

// ── SwipeRow ─────────────────────────────────────────────────────────────────
// Wrap a list row (usually a <Card>) with iOS swipe actions:
//   • right→left drag reveals a red Delete (onDelete)
//   • left→right drag reveals a cobalt Favorite (onFavorite)
// Each side is opt-in — pass only the handlers a row supports. Tapping an action
// closes the row first, then runs the handler. The wrapped child still taps
// through for navigation. Requires GestureHandlerRootView (see _layout).
const DELETE_RED = "#E5484D";
export function SwipeRow({
  children,
  onDelete,
  onFavorite,
  favorited,
}: {
  children: ReactNode;
  onDelete?: () => void;
  onFavorite?: () => void;
  favorited?: boolean;
}) {
  const t = useTheme();
  const ref = useRef<Swipeable>(null);
  const run = (fn: () => void) => {
    ref.current?.close();
    fn();
  };

  const renderRight = onDelete
    ? (_p: Animated.AnimatedInterpolation<number>, drag: Animated.AnimatedInterpolation<number>) => {
        const scale = drag.interpolate({ inputRange: [-88, -32, 0], outputRange: [1, 0.85, 0.5], extrapolate: "clamp" });
        return (
          <Pressable onPress={() => run(onDelete)} style={{ width: 84, marginLeft: 8, borderRadius: t.r, backgroundColor: DELETE_RED, alignItems: "center", justifyContent: "center" }}>
            <Animated.Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: -0.1, transform: [{ scale }] }}>Delete</Animated.Text>
          </Pressable>
        );
      }
    : undefined;

  const renderLeft = onFavorite
    ? (_p: Animated.AnimatedInterpolation<number>, drag: Animated.AnimatedInterpolation<number>) => {
        const scale = drag.interpolate({ inputRange: [0, 32, 88], outputRange: [0.5, 0.85, 1], extrapolate: "clamp" });
        return (
          <Pressable onPress={() => run(onFavorite)} style={{ width: 88, marginRight: 8, borderRadius: t.r, backgroundColor: t.colors.acc, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={{ alignItems: "center", transform: [{ scale }] }}>
              <Icon name="star" s={19} c="#fff" />
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", marginTop: 3 }}>{favorited ? "Unfave" : "Favorite"}</Text>
            </Animated.View>
          </Pressable>
        );
      }
    : undefined;

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRight}
      renderLeftActions={renderLeft}
      overshootRight={false}
      overshootLeft={false}
      rightThreshold={40}
      leftThreshold={40}
      friction={2}
    >
      {children}
    </Swipeable>
  );
}

// ── confirmDelete ────────────────────────────────────────────────────────────
// Native iOS confirmation alert with a red destructive "Delete" and Cancel. Used
// as the final gate before any destructive action (swipe-to-delete, the "…"
// menu). onConfirm runs only if the user taps the destructive button.
export function confirmDelete(opts: { title: string; message?: string; deleteLabel?: string; onConfirm: () => void }) {
  Alert.alert(opts.title, opts.message, [
    { text: "Cancel", style: "cancel" },
    { text: opts.deleteLabel ?? "Delete", style: "destructive", onPress: opts.onConfirm },
  ]);
}


// ── TabBar (floating cobalt capsule) ────────────────────────────────────────
export type TabId = "today" | "phrases" | "speak" | "topics" | "sessions";
export function TabBar({ tab, go }: { tab: TabId; go: (id: TabId) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const item = (id: TabId, icon: IconName, label: string) => {
    const on = tab === id;
    return (
      <Pressable
        key={id}
        onPress={() => go(id)}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3, minHeight: 44 }}
      >
        <Icon name={icon} s={22} w={on ? 2 : 1.7} c={on ? "#fff" : "rgba(255,255,255,0.55)"} />
        <Text style={{ fontSize: 11, fontWeight: "600", color: on ? "#fff" : "rgba(255,255,255,0.55)" }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View
      style={[
        {
          position: "absolute",
          left: 22,
          right: 22,
          bottom: Math.max(insets.bottom, 12),
          height: 64,
          borderRadius: 9999,
          backgroundColor: t.colors.pill,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
        },
        styles.tabShadow,
      ]}
    >
      {item("today", "sun", "Today")}
      {item("phrases", "bank", "Phrases")}
      <Pressable
        onPress={() => go("speak")}
        style={[
          {
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: t.colors.acc,
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: 6,
            borderWidth: tab === "speak" ? 3 : 0,
            borderColor: "rgba(255,255,255,0.35)",
          },
          styles.tabShadow,
        ]}
      >
        <Icon name="mic" s={24} w={1.9} c="#fff" />
      </Pressable>
      {item("topics", "map", "Topics")}
      {item("sessions", "wave2", "Sessions")}
    </View>
  );
}

const styles = StyleSheet.create({
  tabShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
