// The mode used when Ask opens from a global header. A note editor always
// opens Ask in Note mode, regardless of this preference.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AskMode } from "./ask-model";

const STORAGE_KEY = "ask_default_mode";
let mode: AskMode = "how_to_say";

const isAskMode = (value: unknown): value is AskMode => value === "how_to_say" || value === "note";

export const askDefaultMode = (): AskMode => mode;

export async function loadAskDefaultMode(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isAskMode(saved)) mode = saved;
  } catch {
    // Keep the default when local storage is unavailable.
  }
}

export async function persistAskDefaultMode(next: AskMode): Promise<void> {
  mode = next;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The new mode still applies for this session.
  }
}
