// theme.tsx — Theme context built from the canonical mobile tokens.
//
// The single source of truth for every rendered token is
// `design/mobile-tokens.ts` (iOS palette at runtime, cobalt #3B6EE1 accent,
// Newsreader serif). This file only assembles the Theme object and exposes the
// context; it defines no token values itself.
//
// iOS motif: capsule controls · concentric container radius · single cobalt
// accent · ios/warm palettes · edge-pair elevation approximated with a native
// shadow + hairline ring.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { StyleSheet, useColorScheme, type TextStyle, type ViewStyle } from "react-native";

import {
  MOBILE_R,
  SERIF,
  mobileColors,
  mobileRing,
  mobileShadows,
  mobileSpacing,
  type Density,
  type Palette,
} from "./mobile-tokens";

// Re-exported for backward compatibility (consumers import SERIF from theme).
export { SERIF } from "./mobile-tokens";
export type { Density, Palette } from "./mobile-tokens";

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
  const colors = mobileColors(dark, palette);
  const { padc, gap } = mobileSpacing(density);
  const { shadowCard, shadowLg } = mobileShadows(dark);
  return {
    dark,
    colors,
    padc,
    gap,
    r: MOBILE_R,
    ring: mobileRing(dark),
    shadowCard,
    shadowLg,
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