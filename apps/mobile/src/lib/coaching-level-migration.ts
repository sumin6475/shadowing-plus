import AsyncStorage from "@react-native-async-storage/async-storage";
import { type EnglishLevel, englishLevel } from "./english-level";
const LEGACY_OWNER = "coaching_legacy_level_owner_v1";
let queue: Promise<unknown> = Promise.resolve();
/** Claim the legacy device-only choice once. Never inherit another account's
 * subsequently changed global preference. Server preferences always win. */
export function initialCoachingLevel(userId: string): Promise<EnglishLevel> {
  const operation = queue.then(async () => {
    const saved = await AsyncStorage.getItem(LEGACY_OWNER);
    if (saved) {
      try {
        const value = JSON.parse(saved);
        if (
          value.userId === userId &&
          ["a2", "b1", "b2", "c1"].includes(value.level)
        ) return value.level as EnglishLevel;
      } catch {}
      return "b1";
    }
    const level = englishLevel();
    await AsyncStorage.setItem(LEGACY_OWNER, JSON.stringify({ userId, level }));
    return level;
  });
  queue = operation.catch(() => {});
  return operation;
}
