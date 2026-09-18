// ui.tsx — shared primitives ported from sp-theme.jsx: Card, Hero, Block, Pill,
// Chip, Badge, Avatar, Header, BackBar, Sect, Screen, Wave, StatTile, TabBar.
import { Children as ReactChildren, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type Ref } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

import { Image } from "expo-image";

import { useAuth } from "@/lib/auth";
import { avatarInitialFromMetadata, avatarUrlFromMetadata } from "@/lib/profile-photo";
import { statusStageLabel } from "@/lib/phrases";
import { firstLanguage } from "@/lib/first-language";

import { Icon, type IconName } from "./icon";
import { BRAND, Gradients, Motif, TypeScale } from "./mobile-tokens";
import { SERIF, hairline, statusColors, useTheme, type Theme } from "./theme";

export { Icon } from "./icon";
export type { IconName } from "./icon";

export type Tone = "butter" | "sky" | "sage" | "blush" | "acc" | "accS" | "soft";

/** LinearGradient's `colors` needs a >=2 tuple, but the shared `Gradients.*`
 *  ramps are plain string[] — re-form the two required stops instead of casting. */
export function gradientStops(colors: string[]): readonly [string, string, ...string[]] {
  const [first, second, ...rest] = colors;
  return [first, second, ...rest];
}

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

// Newsreader draws Latin only (564 glyphs). For text in another script, use a
// serif that actually has the glyphs instead of letting iOS cascade that line
// into the system SANS. Both faces below ship with iOS, so they cost no bundle
// size. Korean and Chinese have no serif on iOS (a free one is 16–23 MB to
// bundle), so they keep today's behavior: Newsreader, cascading to the system
// font. Measured and decided in docs/release/first-language-readiness.md §3.4.
const SERIF_SYSTEM = "ui-serif"; // New York: Latin, Cyrillic, Vietnamese
const SERIF_MINCHO = "Hiragino Mincho ProN"; // Japanese
const KANA = /[\u3040-\u30ff\u31f0-\u31ff]/;
const CYRILLIC = /[\u0400-\u04ff]/;
const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

interface SerifFace {
  fontFamily: string;
  /** Newsreader's small x-height needs SERIF_SCALE; the other faces don't. */
  scale: number;
  /** Negative tracking suits a Latin serif; it crowds CJK. */
  tracking: boolean;
}

const NEWSREADER_FACE: SerifFace = { fontFamily: SERIF, scale: SERIF_SCALE, tracking: true };

/** The serif that can draw `text`. Han without kana is ambiguous — Chinese and
 *  Japanese share those code points but not their glyph shapes — so the
 *  learner's first language decides. Mincho on Chinese text would show a
 *  Taiwanese learner Japanese letterforms. */
function serifFace(text: string): SerifFace {
  if (Platform.OS !== "ios") return NEWSREADER_FACE;
  if (KANA.test(text) || (HAN.test(text) && firstLanguage() === "ja")) {
    return { fontFamily: SERIF_MINCHO, scale: 1, tracking: false };
  }
  if (CYRILLIC.test(text)) return { fontFamily: SERIF_SYSTEM, scale: 1, tracking: true };
  return NEWSREADER_FACE;
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/** Font family + tracking for a serif TextInput, following what the learner
 *  types — a note title can be in any language. */
export function serifInputFace(text: string, tracking: number): TextStyle {
  const face = serifFace(text);
  return { fontFamily: face.fontFamily, letterSpacing: face.tracking ? tracking : 0 };
}

/**
 * `strong` is not a style flag, it is a different face. Only
 * Newsreader36pt-Regular is bundled, so fontWeight on a Newsreader run matches
 * nothing and iOS quietly draws Regular — the bold never arrives and nothing
 * warns you. The system serif (New York) ships every weight, costs no bundle,
 * and is already this design system's serif for Cyrillic, so a bold serif run
 * goes there instead. It needs no SERIF_SCALE: its x-height is not Newsreader's
 * small one. Text that Newsreader cannot draw at all still routes by script.
 */
export function Serif({
  children,
  style,
  numberOfLines,
  strong,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  strong?: boolean;
}) {
  const text = textOf(children);
  const natural = serifFace(text);
  const face: SerifFace = strong && natural === NEWSREADER_FACE ? { fontFamily: SERIF_SYSTEM, scale: 1, tracking: true } : natural;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const scaled: TextStyle = {};
  if (face.scale !== 1) {
    if (typeof flat?.fontSize === "number") scaled.fontSize = Math.round(flat.fontSize * face.scale);
    if (typeof flat?.lineHeight === "number") scaled.lineHeight = Math.round(flat.lineHeight * face.scale);
  }
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ fontFamily: face.fontFamily, letterSpacing: face.tracking ? -0.2 : 0 }, style, scaled, strong ? { fontWeight: "700" } : null]}
    >
      {children}
    </Text>
  );
}

// ── Press feedback ─────────────────────────────────────────────────────────
// iOS-style tactile press: a quick spring scale-down on touch, springing back
// with a little bounce on release. Native-driver transform, so it never blocks
// JS. Shared by Card / Block / Pill (and the capture FAB).
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function usePressFx(depth = 0.975) {
  // useMemo (not a ref) keeps the Animated.Value off the render-time ref-read
  // path, same as Wave below.
  const scale = useMemo(() => new Animated.Value(1), []);
  const pressIn = () =>
    Animated.spring(scale, { toValue: depth, speed: 40, bounciness: 0, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, speed: 22, bounciness: 7, useNativeDriver: true }).start();
  return { scale, pressIn, pressOut };
}

// ── Entrance stagger ───────────────────────────────────────────────────────
// iOS-style cascade: sections fade in and rise, top to bottom. Wrap each
// section and pass its index; remount (new key) replays the cascade — screens
// that live inside the kept-alive native tabs key this off a focus counter.
export function EnterStagger({
  i = 0,
  children,
  style,
}: {
  i?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  // Cap the delay so long lists don't keep trickling in forever.
  return (
    <Reanimated.View
      entering={FadeInDown.delay(70 * Math.min(i, 8)).springify().damping(17).stiffness(160)}
      style={style}
    >
      {children}
    </Reanimated.View>
  );
}

/** Wraps each direct child in an EnterStagger with its index, so a screen's
 * sections cascade top-to-bottom without hand-numbering. Conditional/null
 * children are skipped (Children.toArray drops them). Pass `replayKey` to
 * replay the cascade (e.g. a focus counter on kept-alive tab screens). */
export function Stagger({
  children,
  startIndex = 0,
  replayKey,
}: {
  children: ReactNode;
  startIndex?: number;
  replayKey?: string | number;
}) {
  return (
    <>
      {ReactChildren.toArray(children).map((child, idx) => (
        <EnterStagger key={`${replayKey ?? "s"}-${idx}`} i={startIndex + idx}>
          {child}
        </EnterStagger>
      ))}
    </>
  );
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
  const fx = usePressFx();
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
      <AnimatedPressable
        onPress={onPress}
        onPressIn={fx.pressIn}
        onPressOut={fx.pressOut}
        style={[base, style, { transform: [{ scale: fx.scale }] }]}
      >
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/** Transcript / long copy that stays a fixed height until the learner asks for more. */
export function ExpandableCopy({
  text,
  empty = "No words were captured this time.",
  collapsedLines = 6,
  style,
}: {
  text: string;
  empty?: string;
  collapsedLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const trimmed = text.replace(/\s+/g, " ").trim() ? text.trim() : "";
  if (!trimmed) {
    return (
      <Text style={[{ fontSize: 15, lineHeight: 23, color: t.colors.ink3, fontStyle: "italic" }, style]}>{empty}</Text>
    );
  }
  return (
    <View>
      <Text
        style={[{ fontSize: 15, lineHeight: 23, color: t.colors.ink }, style]}
        numberOfLines={expanded ? undefined : collapsedLines}
        onTextLayout={(event) => {
          if (!expanded && event.nativeEvent.lines.length >= collapsedLines) setOverflows(true);
        }}
      >
        {trimmed}
      </Text>
      {overflows ? (
        <Pressable onPress={() => setExpanded((value) => !value)} style={{ marginTop: 8, alignSelf: "flex-start" }}>
          <Text style={{ fontSize: 13.5, fontWeight: "700", color: t.colors.accD }}>{expanded ? "Show less" : "Show more"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
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
  const fx = usePressFx();
  const base: ViewStyle = {
    borderRadius: t.r,
    padding: t.padc + 9,
    overflow: "hidden",
    // Dark mode only: the navy ramp would otherwise melt into the #000 page.
    ...(t.dark ? { borderWidth: hairline, borderColor: "rgba(255,255,255,0.10)" } : null),
    ...t.shadowLg,
  };
  const inner = (
    <>
      <LinearGradient
        colors={gradientStops(Gradients.brand)}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Bloom only — the old bottom-left navy lobe (#142878) sat between the
          two brand darks and was invisible against them. */}
      <View
        style={{
          position: "absolute",
          right: -36,
          top: -40,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: "rgba(255,255,255,0.11)",
        }}
      />
      {children}
    </>
  );
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={fx.pressIn}
        onPressOut={fx.pressOut}
        style={[base, style, { transform: [{ scale: fx.scale }] }]}
      >
        {inner}
      </AnimatedPressable>
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
  const fx = usePressFx();
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
      <AnimatedPressable
        onPress={onPress}
        onPressIn={fx.pressIn}
        onPressOut={fx.pressOut}
        style={[base, style, { transform: [{ scale: fx.scale }] }]}
      >
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ── Pill (capsule button) ──────────────────────────────────────────────────
type PillTone = "acc" | "dark" | "soft" | "white" | "card" | "ghost" | "tint";
// Scheme-independent light capsule used by tone="white". Kept off the theme on
// purpose: this capsule is drawn on the brand gradient, which is the same navy
// ramp in light and dark, so its fill must not track the color scheme.
const PILL_LIGHT_BG = "#FFFFFF";
const PILL_LIGHT_FG = BRAND.dark;
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
    acc: { bg: t.colors.acc, fg: t.colors.onAcc },
    dark: { bg: t.colors.pill, fg: "#fff" },
    soft: { bg: t.colors.accS, fg: t.colors.accD },
    // `white` means "a light capsule sitting on a brand surface" — it must NOT
    // follow t.colors.card into dark mode (#1C1C1E), which measures 1.16:1 on
    // the Hero's #0D1A3B end and 2.14:1 on its #344E91 end and simply vanishes.
    // Fixed pair in both schemes: #FFFFFF fill (17.1:1 on #0D1A3B, 7.5:1 on
    // #344E91) with BRAND.dark label on it (17.1:1).
    white: { bg: PILL_LIGHT_BG, fg: PILL_LIGHT_FG, shadow: true },
    // What `white` used to be. For a raised capsule on the ordinary page
    // background, where a fixed #FFFFFF fill would shout in dark mode.
    card: { bg: t.colors.card, fg: t.colors.ink, shadow: true },
    ghost: { bg: "transparent", fg: t.colors.ink2 },
    tint: { bg: t.colors.soft, fg: t.colors.ink },
  };
  const tv = tones[tone];
  const h = small ? Motif.buttonHeight.medium : Motif.buttonHeight.large;
  const fs = small ? 15 : 17;
  const fx = usePressFx(0.955);
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={fx.pressIn}
      onPressOut={fx.pressOut}
      style={[
        {
          height: h,
          borderRadius: Motif.radius.pill,
          paddingHorizontal: small ? 16 : 24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          backgroundColor: tv.bg,
          flex: full ? 1 : undefined,
          alignSelf: full ? "stretch" : "flex-start",
        },
        tv.shadow ? t.shadowCard : null,
        style,
        { transform: [{ scale: fx.scale }] },
      ]}
    >
      {/* `tv.fg` reaches a string child only — RN does not cascade color across a
          View. A non-string child must color itself, and must be re-checked when
          a tone's foreground changes. */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}>
        {icon ? <Icon name={icon} s={small ? 15 : 17} w={2} c={tv.fg} /> : null}
        {typeof children === "string" ? (
          <Text style={[{ color: tv.fg, fontSize: fs, fontWeight: "600", letterSpacing: -0.1 }, textStyle]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </AnimatedPressable>
  );
}

// ── Chip ────────────────────────────────────────────────────────────────────
export function Chip({
  children,
  active,
  onPress,
  style,
  icon,
  accessibilityLabel,
}: {
  children?: ReactNode;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const color = active ? "#fff" : t.colors.ink2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: Motif.buttonHeight.medium,
          borderRadius: Motif.radius.pill,
          paddingHorizontal: icon && !children ? 10 : 15,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: active ? t.colors.pill : t.colors.card,
          borderWidth: active ? 0 : hairline,
          borderColor: t.ring,
          opacity: pressed ? 0.8 : 1,
        },
        active ? null : t.shadowCard,
        style,
      ]}
    >
      {icon ? <Icon name={icon} s={14} c={color} /> : null}
      {children ? (
        <Text style={{ color, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {children}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ── Badge (status) ──────────────────────────────────────────────────────────
export function Badge({ s, style }: { s: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [bg, cl] = statusColors(t)[s] ?? [t.colors.soft, t.colors.ink2];
  return (
    <View
      style={[{ backgroundColor: bg, borderRadius: Motif.radius.pill, paddingHorizontal: 10, paddingVertical: 4 }, style]}
    >
      <Text style={{ color: cl, fontSize: 11, fontWeight: "700", letterSpacing: 0.1 }}>{statusStageLabel(s)}</Text>
    </View>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ s = 44, onPress }: { s?: number; onPress?: () => void }) {
  const t = useTheme();
  const { session } = useAuth();
  const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const uri = avatarUrlFromMetadata(meta);
  const initial = avatarInitialFromMetadata(meta, session?.user?.email);
  const inner = (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: s / 2,
        backgroundColor: t.colors.pill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: s, height: s }} contentFit="cover" />
      ) : (
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: s * 0.38 }}>{initial}</Text>
      )}
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
            minHeight: Motif.tapTarget,
            marginBottom: 22,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>{eyebrow}</Text>
          {right}
        </View>
      ) : null}
      {typeof title === "string" ? (
        <Serif style={{ fontSize: TypeScale.largeTitle, lineHeight: 37, color: t.colors.ink }}>{title}</Serif>
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
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4, minHeight: Motif.tapTarget }}>
      <Pressable
        onPress={onBack}
        style={[
          {
            width: Motif.tapTarget,
            height: Motif.tapTarget,
            borderRadius: Motif.tapTarget / 2,
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
      {title ? (
        <Text style={{ flex: 1, textAlign: "center", fontSize: TypeScale.headline, fontWeight: "700", color: t.colors.ink }} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ minWidth: Motif.tapTarget, minHeight: Motif.tapTarget, alignItems: "flex-end", justifyContent: "center" }}>{right}</View>
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
  // With the native tab bar, insets.bottom already includes the bar height, so
  // this is just breathing room past the last card (was 120 for the old
  // floating custom bar).
  bottomPad = 32,
  style,
  refreshControl,
  scrollEnabled = true,
  onScroll,
  scrollRef,
}: {
  children: ReactNode;
  noPad?: boolean;
  bottomPad?: number;
  style?: StyleProp<ViewStyle>;
  /** Optional <RefreshControl> for pull-to-refresh (data-backed screens). */
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Set false while a nested drag-reorder is active so the page doesn't scroll. */
  scrollEnabled?: boolean;
  /** Scroll events (throttled) — e.g. incremental list loading near the end. */
  onScroll?: ScrollViewProps["onScroll"];
  /** Handle on the underlying ScrollView — e.g. the product tour scrolling a
   *  coach-mark target into view. Purely additive; nothing else reads it. */
  scrollRef?: Ref<ScrollView>;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Progressive top frost: full (translucent) over the status bar, then a long,
  // gentle multi-stop fade to nothing well below it so there's no visible edge.
  const frostH = insets.top + 40;
  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        ref={scrollRef}
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
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Focused inputs sit above the keyboard: iOS insets the scroll view for
        // the keyboard and scrolls the focused field into view automatically.
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={onScroll ? 120 : undefined}
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
            borderRadius: Motif.radius.pill,
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
  chevron,
}: {
  tone: string;
  label: string;
  value: string;
  unit: string;
  foot: string;
  span?: boolean;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const t = useTheme();
  const showChevron = chevron ?? Boolean(onPress);
  return (
    <Block tone={tone} onPress={onPress} style={{ flex: span ? undefined : 1, width: span ? "100%" : undefined, gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: t.colors.onB }}>{label}</Text>
        {showChevron ? <Icon name="chev" s={13} w={2.2} c={t.colors.onB2} /> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text style={{ fontSize: TypeScale.largeTitle, fontWeight: "800", letterSpacing: -1, color: t.colors.onB, fontVariant: ["tabular-nums"] }}>
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
//   • right→left drag reveals a red action, labelled "Delete" by default —
//     pass `deleteLabel` when the handler is not destructive (e.g. "Archive"),
//     so the panel's wording matches the confirm dialog that follows
//   • left→right drag reveals a brand-accent Favorite (onFavorite)
// Each side is opt-in — pass only the handlers a row supports. Tapping an action
// closes the row first, then runs the handler. The wrapped child still taps
// through for navigation. Requires GestureHandlerRootView (see _layout).
// Deeper than the #E5484D used elsewhere, because this panel is the one place
// red carries TEXT: white on #E5484D is 3.91:1, on #D70015 it is 5.38:1. The
// panel itself stays above the 3:1 non-text floor on both grounds.
const DELETE_RED = "#D70015";
export function SwipeRow({
  children,
  onDelete,
  deleteLabel = "Delete",
  onFavorite,
  favorited,
}: {
  children: ReactNode;
  onDelete?: () => void;
  /** Label on the red right-hand panel. Defaults to "Delete"; override it when
   *  `onDelete` performs something softer (archive, hide) so the panel does not
   *  promise a destructive action it will not take. */
  deleteLabel?: string;
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
            <Animated.Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: -0.1, transform: [{ scale }] }}>{deleteLabel}</Animated.Text>
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
              <Icon name="star" s={19} c={t.colors.onAcc} />
              <Text style={{ color: t.colors.onAcc, fontSize: 11, fontWeight: "700", marginTop: 3 }}>{favorited ? "Unfave" : "Favorite"}</Text>
            </Animated.View>
          </Pressable>
        );
      }
    : undefined;

  return (
    // Swipeable's container is overflow:hidden with SQUARE bounds, which used
    // to clip the row card's shadow into a visible gray box. The shadow lives
    // on this outer rounded wrapper instead (outside the clip), and the
    // Swipeable clips to the same rounded shape so revealed actions match.
    <View style={[{ borderRadius: t.r, backgroundColor: t.colors.card }, t.shadowCard]}>
      <Swipeable
        ref={ref}
        containerStyle={{ borderRadius: t.r, overflow: "hidden" }}
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
    </View>
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

// Native iOS text field alert (Alert.prompt). Cancel leaves the previous
// state; Save returns a trimmed note, which may be empty.
export function promptFeedbackNote(opts: {
  title: string;
  message?: string;
  onSave: (note: string) => void;
  onCancel?: () => void;
}) {
  const prompt = (Alert as typeof Alert & {
    prompt?: (
      title: string,
      message?: string,
      callbackOrButtons?: { text: string; style?: "cancel" | "default" | "destructive"; onPress?: (value?: string) => void }[],
      type?: "plain-text",
    ) => void;
  }).prompt;
  if (typeof prompt !== "function") {
    Alert.alert(opts.title, opts.message, [
      { text: "Cancel", style: "cancel", onPress: opts.onCancel },
      { text: "Save", onPress: () => opts.onSave("") },
    ]);
    return;
  }
  prompt(
    opts.title,
    opts.message,
    [
      { text: "Cancel", style: "cancel", onPress: opts.onCancel },
      {
        text: "Save",
        onPress: (value?: string) => opts.onSave((value ?? "").replace(/\s+/g, " ").trim().slice(0, 500)),
      },
    ],
    "plain-text",
  );
}


// The tab bar is native now (expo-router NativeTabs in src/app/(app)/_layout);
// only the shared tab id type remains here so screens keep a single import.
export type TabId = "today" | "phrases" | "speak" | "topics";
