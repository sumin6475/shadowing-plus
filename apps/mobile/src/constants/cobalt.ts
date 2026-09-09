/**
 * Cobalt Editorial — LEGACY compatibility entry point.
 *
 * The canonical mobile token set now lives in `@/design/mobile-tokens.ts`
 * (this app's iOS palette + motif geometry + type scale). `Motif` and
 * `TypeScale` are re-exported from there so existing import paths keep working.
 *
 * `Cobalt` below is the port of the WEB Cobalt Editorial palette from
 * `design-system/tokens.json` (warm paper, Instrument Serif era). It is NOT
 * used by the runtime app — the app renders the iOS system palette by default
 * (see mobile-tokens.ts). It is kept only for parity/reference with the web
 * design baseline and marked legacy; do not let the mobile app render these
 * values.
 */
export { Motif, TypeScale, SERIF } from "@/design/mobile-tokens";

/**
 * Legacy warm Editorial palette (web tokens.json port). 17 slots, warm paper,
 * unused at runtime. Kept verbatim for parity/reference with the web system.
 */
export const Cobalt = {
  light: {
    bg: "#fbf9f4",
    bgElev: "#fdfcf9",
    surface: "#ffffff",
    surface2: "#f6f4ef",
    hairline: "#e6e2da",
    hairlineSoft: "#efece5",
    text: "#2b2620",
    text2: "#524b41",
    text3: "#847c70",
    text4: "#aca596",
    accent: "#3b6ee1",
    accentHover: "#2f5cc8",
    accentSoft: "#e8eefc",
    accentText: "#2a52b8",
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