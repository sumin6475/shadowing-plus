// auth-palette.ts — palette slots for the auth surfaces (sign-in, password
// reset), derived from the canonical Theme (design/mobile-tokens.ts) so they
// match the iOS-gray design. No token values are defined here: every slot maps
// to a buildTheme() token. The submit button swaps its FILL between `accent`
// and `accentSoft`, so it has two legal foregrounds: `onAccent` on `accent`
// (dark-mode accent is the light navy, where white fails AA) and
// `onAccentSoft` on `accentSoft` — the same pairing ui.tsx's `soft` Pill tone
// uses. `danger` is the AA-safe `warn` token because it renders as error text.
import { useColorScheme } from "react-native";

import { buildTheme } from "./theme";

export function useAuthPalette() {
  const scheme = useColorScheme();
  const t = buildTheme(scheme === "dark");
  return {
    bg: t.colors.bg,
    surface: t.colors.card,
    hairline: t.ring,
    text: t.colors.ink,
    text3: t.colors.ink2,
    text4: t.colors.ink3,
    accent: t.colors.acc,
    accentSoft: t.colors.accS,
    onAccent: t.colors.onAcc,
    onAccentSoft: t.colors.accD,
    danger: t.colors.warn,
  };
}
