// auth-palette.ts — palette slots for the auth surfaces (sign-in, password
// reset), mapped from the app theme so they match the iOS-gray design.
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
    danger: "#E5484D",
  };
}
