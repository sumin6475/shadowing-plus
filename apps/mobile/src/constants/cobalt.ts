/**
 * Cobalt Editorial — the app's design tokens, ported for React Native.
 *
 * Source of truth: `design-system/tokens.json` + `design-system/DESIGN.md` in
 * the repo root. The single brand accent is cobalt #3B6EE1 (never terracotta,
 * never Apple blue). Backgrounds are warm paper, never pure white.
 *
 * iOS geometry (capsule controls, 52pt rows, 3-height button ladder) follows
 * `design-system/ios-motif-spec.md`.
 */

export const Cobalt = {
  light: {
    // Background ladder (warm paper → card)
    bg: "#fbf9f4",
    bgElev: "#fdfcf9",
    surface: "#ffffff",
    surface2: "#f6f4ef",
    // Hairlines
    hairline: "#e6e2da",
    hairlineSoft: "#efece5",
    // Text ladder
    text: "#2b2620",
    text2: "#524b41",
    text3: "#847c70",
    text4: "#aca596",
    // Accent (the one brand hue)
    accent: "#3b6ee1",
    accentHover: "#2f5cc8",
    accentSoft: "#e8eefc",
    accentText: "#2a52b8",
    // Status (functional only)
    danger: "#d1503c",
    dangerSoft: "#f8e4e0",
    success: "#3f9d6a",
  },
  dark: {
    bg: "#17150f",
    bgElev: "#1e1b15",
    surface: "#221f18",
    surface2: "#2b271f",
    hairline: "#3a352c",
    hairlineSoft: "#2f2b23",
    text: "#f2ede3",
    text2: "#c8c1b3",
    text3: "#948c7d",
    text4: "#6b6456",
    accent: "#6a93ee",
    accentHover: "#7ea2f1",
    accentSoft: "#22314f",
    accentText: "#9db9f4",
    danger: "#e06b57",
    dangerSoft: "#3a221d",
    success: "#5cb283",
  },
} as const;

// Widen the per-key literals ("#fbf9f4") to `string` so light and dark are the
// same type — otherwise `as const` makes them structurally incompatible.
export type CobaltColors = { [K in keyof typeof Cobalt.light]: string };

/**
 * iOS motif geometry (design-system/ios-motif-spec.md). Controls are always
 * full capsules; rows are 52pt; three button heights only.
 */
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
