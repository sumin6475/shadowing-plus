// mobile-tokens.ts — canonical mobile design tokens for the iOS app.
//
// THIS FILE IS THE MOBILE RUNTIME SOURCE OF TRUTH. Every token the app
// actually renders (theme, auth palette, motif geometry, type scale, shadows)
// is defined here once and consumed by `theme.tsx`, `cobalt.ts`,
// `auth-palette.ts`, and `ui.tsx`.
//
// Relationship to `design-system/tokens.json`:
//   • tokens.json = the WEB (Cobalt Editorial) design baseline — warm paper
//     backgrounds (#fbf9f4), Instrument Serif, Pretendard UI, 8px rhythm,
//     12–16px radius, layered warm-black shadows.
//   • The mobile app renders the iOS SYSTEM palette by default (light
//     #F2F2F7 / dark #000 base) with the BRAND navy ramp (#0D1A3B dark →
//     #162555 main → #344E91 light — one OKLCH hue family, 265–267) and the
//     Newsreader serif. It keeps its own numeric geometry (26pt card radius,
//     13pt gaps) that intentionally differs from the web scale.
//   • `PALETTES.warm` below is the legacy Cobalt Editorial port kept only for
//     parity/reference with tokens.json. It is NOT used by the runtime app.
//   • Do NOT copy web values here and do not copy mobile values into tokens.json.

import type { ViewStyle } from "react-native";

// ── Fonts ─────────────────────────────────────────────────────────────────
/** Brand serif (Figma, 2026-09-18) — replaced Newsreader app-wide. */
export const SERIF = "InstrumentSerif";
/** Default UI face; applied to every Text/TextInput by design/text.tsx. */
export const FONT_UI = "Pretendard";
/** Figma faces for the MVP screens (Phrases, Studio): Pretendard for UI,
 *  Instrument Serif for display lines. Set the family, never fontWeight —
 *  a weight on a static face makes iOS fall back to the system font. */
export const FONT = {
  regular: "Pretendard",
  medium: "Pretendard-Medium",
  semibold: "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
  display: "InstrumentSerif",
  /** Numbers set as display (stats, big counts). Instrument Serif draws "1"
   *  exactly like "l", so figures use the iOS system serif (New York), whose
   *  1 has a flag and a foot. */
  figure: "ui-serif",
} as const;

// ── oklch → sRGB ───────────────────────────────────────────────────────────
// Standard OKLab → linear sRGB → gamma. Deterministic (no Date/Math.random).
function oklchToRgb(L: number, C: number, Hdeg: number): string {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gamma = (x: number) => {
    const v = x <= 0 ? 0 : x;
    return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };
  const to255 = (x: number) => Math.max(0, Math.min(255, Math.round(gamma(x) * 255)));
  return `rgb(${to255(r)},${to255(g)},${to255(bl)})`;
}

// Stays 262 though the brand moved to navy: it feeds 12 derived tone slots behind
// statusColors/toneColor, and the navies sit ~4° away — moving it only costs chip separation.
const SP_H = 262;

export type Palette = "ios" | "warm";
export type Density = "regular" | "compact";

export interface ColorSlots {
  bg: string;
  card: string;
  soft: string;
  sep: string;
  ink: string;
  ink2: string;
  ink3: string;
  acc: string;
  accD: string;
  accS: string;
  // Foreground on top of `acc`: dark mode's lighter navy needs ink, not white.
  onAcc: string;
  // Error/destructive TEXT. Replaces #E5484D, which measured 3.91:1 on the light
  // card and 4.35:1 on the dark card — both under the 4.5:1 WCAG AA floor for
  // normal text, i.e. the one string explaining a failure was the least legible
  // on screen. These pass on card AND page bg: #D70015 = 5.38:1 on #ffffff /
  // 4.83:1 on #F2F2F7; #FF6961 = 6.03:1 on #1C1C1E / 7.45:1 on #000.
  warn: string;
  butter: string;
  sky: string;
  sage: string;
  blush: string;
  onB: string;
  onB2: string;
  pill: string;
}

const P = (l: number, c: number) => oklchToRgb(l, c, SP_H);
const W = (dark: boolean, hh: number) => (dark ? oklchToRgb(0.33, 0.045, hh) : oklchToRgb(0.92, 0.062, hh));

/** Runtime palettes keyed by palette → color scheme. `warm` is the legacy
 *  Cobalt Editorial port from tokens.json — kept for reference, never rendered. */
export const PALETTES: Record<Palette, Record<"light" | "dark", ColorSlots>> = {
  ios: {
    light: {
      bg: "#F2F2F7",
      card: "#ffffff",
      soft: "rgba(118,118,128,0.12)",
      sep: "#C6C6C8",
      ink: "#111114",
      ink2: "rgba(60,60,67,0.6)",
      ink3: "rgba(60,60,67,0.3)",
      acc: "#162555",
      accD: "#344E91",
      accS: "rgba(22,37,85,0.11)",
      onAcc: "#FFFFFF",
      warn: "#D70015",
      butter: P(0.94, 0.045),
      sky: P(0.965, 0.025),
      sage: P(0.915, 0.06),
      blush: P(0.885, 0.075),
      onB: P(0.32, 0.09),
      onB2: P(0.45, 0.09),
      pill: "#1C1C1E",
    },
    dark: {
      bg: "#000000",
      card: "#1C1C1E",
      soft: "rgba(118,118,128,0.24)",
      sep: "rgba(84,84,88,0.6)",
      ink: "#ffffff",
      ink2: "rgba(235,235,245,0.6)",
      ink3: "rgba(235,235,245,0.3)",
      acc: "#6E8DD5",
      accD: "#8FACEF",
      accS: "rgba(110,141,213,0.28)",
      onAcc: "#0D1A3B",
      warn: "#FF6961",
      butter: P(0.33, 0.07),
      sky: P(0.29, 0.05),
      sage: P(0.37, 0.085),
      blush: P(0.41, 0.1),
      onB: P(0.93, 0.04),
      onB2: P(0.78, 0.05),
      pill: "#2C2C2E",
    },
  },
  // LEGACY / OPTIONAL (web Cobalt Editorial port). Not used by the runtime app.
  warm: {
    light: {
      bg: oklchToRgb(0.973, 0.012, 85),
      card: "#ffffff",
      soft: oklchToRgb(0.955, 0.014, 85),
      sep: oklchToRgb(0.885, 0.016, 80),
      ink: oklchToRgb(0.25, 0.015, 60),
      ink2: oklchToRgb(0.45, 0.012, 60),
      ink3: oklchToRgb(0.6, 0.01, 65),
      acc: oklchToRgb(0.62, 0.155, 38),
      accD: oklchToRgb(0.53, 0.155, 38),
      accS: oklchToRgb(0.945, 0.034, 38),
      onAcc: "#FFFFFF",
      warn: "#D70015",
      butter: W(false, 92),
      sky: W(false, 240),
      sage: W(false, 140),
      blush: W(false, 20),
      onB: oklchToRgb(0.3, 0.03, 60),
      onB2: oklchToRgb(0.45, 0.035, 60),
      pill: oklchToRgb(0.24, 0.015, 50),
    },
    dark: {
      bg: oklchToRgb(0.205, 0.012, 60),
      card: oklchToRgb(0.265, 0.014, 60),
      soft: oklchToRgb(0.31, 0.014, 60),
      sep: oklchToRgb(0.38, 0.014, 60),
      ink: oklchToRgb(0.94, 0.008, 80),
      ink2: oklchToRgb(0.78, 0.01, 75),
      ink3: oklchToRgb(0.62, 0.01, 70),
      acc: oklchToRgb(0.62, 0.155, 38),
      accD: oklchToRgb(0.72, 0.132, 38),
      accS: oklchToRgb(0.32, 0.062, 38),
      onAcc: "#FFFFFF",
      warn: "#FF6961",
      butter: W(true, 92),
      sky: W(true, 240),
      sage: W(true, 140),
      blush: W(true, 20),
      onB: oklchToRgb(0.93, 0.015, 80),
      onB2: oklchToRgb(0.75, 0.02, 80),
      pill: oklchToRgb(0.3, 0.015, 55),
    },
  },
};

/** Active color slots for a scheme + palette ('ios' is the default runtime). */
export function mobileColors(dark: boolean, palette: Palette = "ios"): ColorSlots {
  return PALETTES[palette][dark ? "dark" : "light"];
}

// ── Brand ramp ────────────────────────────────────────────────────────────
export const BRAND = { dark: "#0D1A3B", main: "#162555", light: "#344E91" } as const;

// Not `as const`: expo-linear-gradient's `colors` wants a mutable string[].
export const Gradients = {
  /** Hero and any full-bleed brand surface. Dark -> main -> light. */
  brand: ["#0D1A3B", "#162555", "#344E91"],
  /** Secondary brand cards — lighter than the hero so they do not compete with it. */
  brandLift: ["#162555", "#344E91"],
  /** The 1.5pt lifted border around a brand card. Stays light on purpose. */
  brandEdge: ["#A9C7FF", "#D5E3FF", "#7BA7F6"],
};

// ── Motif geometry (design-system/ios-motif-spec.md) ─────────────────────
// Controls are always full capsules; rows are 52pt; three button heights only.
export const Motif = {
  radius: {
    pill: 9999,
    card: 16,
    cardLg: 20,
  },
  buttonHeight: {
    small: 28,
    medium: 34,
    large: 50,
  },
  row: 52,
  tapTarget: 44,
  separatorInset: 16,
} as const;

/** Type scale (pt), from ios-motif-spec.md §5. */
export const TypeScale = {
  largeTitle: 34,
  title1: 28,
  title2: 22,
  title3: 20,
  headline: 17,
  body: 17,
  callout: 16,
  subheadline: 15,
  footnote: 13,
  caption1: 12,
  caption2: 11,
} as const;

// ── Runtime geometry (what the current app renders) ──────────────────────
export const MOBILE_R = 26; // card radius (concentric container radius)
export const MOBILE_RING: Record<"light" | "dark", string> = {
  light: "#ECECEC",
  dark: "rgba(255,255,255,0.07)",
};
export const MOBILE_PADC: Record<Density, number> = { regular: 19, compact: 14 };
export const MOBILE_GAP: Record<Density, number> = { regular: 13, compact: 9 };

export function mobileRing(dark: boolean): string {
  return MOBILE_RING[dark ? "dark" : "light"];
}

export function mobileSpacing(density: Density): { padc: number; gap: number } {
  return { padc: MOBILE_PADC[density], gap: MOBILE_GAP[density] };
}

// ── Shadow / elevation presets (current runtime values) ──────────────────
// Edge-pair elevation approximated with a native shadow + hairline ring.
function shadowCard(dark: boolean): ViewStyle {
  return {
    shadowColor: "#000",
    shadowOpacity: dark ? 0.3 : 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  };
}

function shadowLg(dark: boolean): ViewStyle {
  return {
    shadowColor: "#000",
    shadowOpacity: dark ? 0.4 : 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  };
}

export function mobileShadows(dark: boolean): { shadowCard: ViewStyle; shadowLg: ViewStyle } {
  return { shadowCard: shadowCard(dark), shadowLg: shadowLg(dark) };
}