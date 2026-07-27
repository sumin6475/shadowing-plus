import { useColorScheme } from "react-native";

import { Cobalt, type CobaltColors } from "@/constants/cobalt";

/** Return the Cobalt palette for the active color scheme (light default). */
export function useCobalt(): CobaltColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? Cobalt.dark : Cobalt.light;
}
