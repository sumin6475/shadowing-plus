// use-cobalt.ts — LEGACY. Returns the warm Editorial (Cobalt) palette ported
// from design-system/tokens.json. The runtime app does NOT use this palette —
// it renders the iOS system palette via useTheme()/useAuthPalette(). Kept for
// compatibility with the unused Cobalt port; do not build new UI on it.
import { useColorScheme } from "react-native";

import { Cobalt, type CobaltColors } from "@/constants/cobalt";

/** Return the Cobalt palette for the active color scheme (light default). */
export function useCobalt(): CobaltColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? Cobalt.dark : Cobalt.light;
}
