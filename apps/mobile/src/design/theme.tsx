// theme.tsx — Shadowing Plus design tokens ported from the Claude Design
// prototype (sp-theme.jsx) to React Native.
//
// iOS motif: capsule controls · concentric container radius · single cobalt
// accent #3B6EE1 · warm/ios palettes · edge-pair elevation approximated with a
// native shadow + hairline ring.
//
// The web prototype expresses several tones in oklch(), which RN cannot parse,
// so `oklchToRgb` converts them at build-time into rgb() strings. This keeps the
// palette byte-for-byte faithful (including dark mode + the warm palette).

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { StyleSheet, useColorScheme, type TextStyle, type ViewStyle } from "react-native";

// ── Fonts ────────────────────────────────────────────────────────────────
// Newsreader — the editorial serif hero face from the Saylo design system,
// loaded at runtime in the root _layout via expo-font. Used for hero + focus
// transcript only ("serif = hero only"). UI text stays on the system font for
// now; Inter (also loaded) can be adopted per-weight later.
export const SERIF = "Newsreader";

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

const SP_H = 262; // cobalt hue

export type Palette = "ios" | "warm";
export type Density = "regular" | "compact";

export interface Theme {
  dark: boolean;
  colors: {
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
    butter: string;
    sky: string;
    sage: string;
    blush: string;
    onB: string;
    onB2: string;
    pill: string;
  };
  padc: number;
  gap: number;
  r: number;
  /** Card elevation (edge-pair approximation). */
  shadowCard: ViewStyle;
  shadowLg: ViewStyle;
  /** Hairline ring color that sits under the shadow. */
  ring: string;
}

export function buildTheme(dark: boolean, palette: Palette = "ios", density: Density = "regular"): Theme {
  const P = (l: number, c: number) => oklchToRgb(l, c, SP_H);
  const W = (hh: number) => (dark ? oklchToRgb(0.33, 0.045, hh) : oklchToRgb(0.92, 0.062, hh));

  const colors =
    palette === "warm"
      ? {
          bg: dark ? oklchToRgb(0.205, 0.012, 60) : oklchToRgb(0.973, 0.012, 85),
          card: dark ? oklchToRgb(0.265, 0.014, 60) : "#ffffff",
          soft: dark ? oklchToRgb(0.31, 0.014, 60) : oklchToRgb(0.955, 0.014, 85),
          sep: dark ? oklchToRgb(0.38, 0.014, 60) : oklchToRgb(0.885, 0.016, 80),
          ink: dark ? oklchToRgb(0.94, 0.008, 80) : oklchToRgb(0.25, 0.015, 60),
          ink2: dark ? oklchToRgb(0.78, 0.01, 75) : oklchToRgb(0.45, 0.012, 60),
          ink3: dark ? oklchToRgb(0.62, 0.01, 70) : oklchToRgb(0.6, 0.01, 65),
          acc: oklchToRgb(0.62, 0.155, 38),
          accD: dark ? oklchToRgb(0.72, 0.132, 38) : oklchToRgb(0.53, 0.155, 38),
          accS: dark ? oklchToRgb(0.32, 0.062, 38) : oklchToRgb(0.945, 0.034, 38),
          butter: W(92),
          sky: W(240),
          sage: W(140),
          blush: W(20),
          onB: dark ? oklchToRgb(0.93, 0.015, 80) : oklchToRgb(0.3, 0.03, 60),
          onB2: dark ? oklchToRgb(0.75, 0.02, 80) : oklchToRgb(0.45, 0.035, 60),
          pill: dark ? oklchToRgb(0.3, 0.015, 55) : oklchToRgb(0.24, 0.015, 50),
        }
      : {
          bg: dark ? "#000000" : "#F2F2F7",
          card: dark ? "#1C1C1E" : "#ffffff",
          soft: dark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
          sep: dark ? "rgba(84,84,88,0.6)" : "#C6C6C8",
          ink: dark ? "#ffffff" : "#111114",
          ink2: dark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)",
          ink3: dark ? "rgba(235,235,245,0.3)" : "rgba(60,60,67,0.3)",
          acc: "#3B6EE1",
          accD: dark ? "#8FACEF" : "#2E56BC",
          accS: dark ? "rgba(59,110,225,0.28)" : "rgba(59,110,225,0.11)",
          butter: dark ? P(0.33, 0.07) : P(0.94, 0.045),
          sky: dark ? P(0.29, 0.05) : P(0.965, 0.025),
          sage: dark ? P(0.37, 0.085) : P(0.915, 0.06),
          blush: dark ? P(0.41, 0.1) : P(0.885, 0.075),
          onB: dark ? P(0.93, 0.04) : P(0.32, 0.09),
          onB2: dark ? P(0.78, 0.05) : P(0.45, 0.09),
          pill: dark ? "#2C2C2E" : "#1C1C1E",
        };

  return {
    dark,
    colors,
    padc: density === "compact" ? 14 : 19,
    gap: density === "compact" ? 9 : 13,
    r: 26,
    ring: dark ? "rgba(255,255,255,0.07)" : "#ECECEC",
    shadowCard: {
      shadowColor: "#000",
      shadowOpacity: dark ? 0.22 : 0.05,
      shadowRadius: 9,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    shadowLg: {
      shadowColor: "#000",
      shadowOpacity: dark ? 0.28 : 0.07,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
  };
}

const ThemeContext = createContext<Theme>(buildTheme(false));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => buildTheme(scheme === "dark"), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Status-tone → [background, text] tokens, keyed off theme colors. */
export function statusColors(t: Theme): Record<string, [string, string]> {
  return {
    New: [t.colors.sky, t.colors.onB],
    Recognizing: [t.colors.blush, t.colors.onB],
    Practicing: [t.colors.butter, t.colors.onB],
    "Ready to use": [t.colors.sage, t.colors.onB],
    "Needs refresh": [t.colors.accS, t.colors.accD],
  };
}

/** Shared text helpers so screens read like the prototype. */
export const font = {
  serif: (size: number, extra?: TextStyle): TextStyle => ({
    fontFamily: SERIF,
    fontSize: size,
    letterSpacing: -0.2,
    ...extra,
  }),
};

export const hairline = StyleSheet.hairlineWidth;
