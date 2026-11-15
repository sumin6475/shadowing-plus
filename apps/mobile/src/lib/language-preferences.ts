import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { firstLanguage, type L1 } from "./first-language";
import { normalizeLanguagePreferences, resolveSurfaceLanguage, type LanguagePreferences, type LanguageSurface } from "./language-policy";

const STORAGE_KEY = "first_language_surfaces.v1";
let preferences = normalizeLanguagePreferences(null);
const listeners = new Set<() => void>();
let writes: Promise<void> = Promise.resolve();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const languagePreferences = () => preferences;
export function useLanguagePreferences(): LanguagePreferences {
  return useSyncExternalStore(subscribe, languagePreferences, languagePreferences);
}
export function surfaceLanguage(surface: LanguageSurface): L1 {
  return resolveSurfaceLanguage(firstLanguage(), preferences, surface);
}
export async function loadLanguagePreferences(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    preferences = normalizeLanguagePreferences(saved ? JSON.parse(saved) : null);
    listeners.forEach((listener) => listener());
  } catch { /* Keep defaults if offline storage is unavailable or malformed. */ }
}
export async function persistLanguagePreferences(next: LanguagePreferences): Promise<void> {
  preferences = normalizeLanguagePreferences(next);
  listeners.forEach((listener) => listener());
  const saved = JSON.stringify(preferences);
  // Serialize rapid individual/all changes so the latest choice survives a restart.
  const write = writes.then(() => AsyncStorage.setItem(STORAGE_KEY, saved));
  writes = write.catch(() => {});
  await write;
}
