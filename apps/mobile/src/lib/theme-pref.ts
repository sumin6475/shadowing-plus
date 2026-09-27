// theme-pref.ts — System / Light / Dark appearance override.
//
// Appearance.setColorScheme (RN 0.72+) overrides the scheme for the whole
// window on iOS — useColorScheme, ThemeProvider, and native chrome (the
// native tab bar, sheets) all follow it, so no custom hook plumbing is needed.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

export type ThemePref = "system" | "light" | "dark";

const SUPPORTED: readonly ThemePref[] = ["system", "light", "dark"];
const STORAGE_KEY = "theme_pref";

let pref: ThemePref = "system";

export const THEME_PREF_LABEL: Record<ThemePref, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export const THEME_PREF_OPTIONS: { value: ThemePref; label: string }[] = (
  ["system", "light", "dark"] as const
).map((value) => ({ value, label: THEME_PREF_LABEL[value] }));

function isPref(value: unknown): value is ThemePref {
  return typeof value === "string" && (SUPPORTED as readonly string[]).includes(value);
}

function apply(next: ThemePref): void {
  // RN 0.86 takes "unspecified" (not null) to clear the override back to system.
  Appearance.setColorScheme(next === "system" ? "unspecified" : next);
}

export function themePref(): ThemePref {
  return pref;
}

export async function loadThemePref(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isPref(saved)) {
      pref = saved;
      apply(saved);
    }
  } catch {
    // Stay on System.
  }
}

export async function persistThemePref(next: ThemePref): Promise<void> {
  pref = next;
  apply(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Applied for this session even if the write failed.
  }
}
