/** Independent first-language surfaces. Meanings never depend on these switches. */
export type LanguagePreferences = {
  app: boolean;
  assistant: boolean;
  feedback: boolean;
};
export type LanguageSurface = keyof LanguagePreferences | "meaning";
export const DEFAULT_LANGUAGE_PREFERENCES: Readonly<LanguagePreferences> = {
  app: true,
  assistant: true,
  feedback: true,
};

export function normalizeLanguagePreferences(value: unknown): LanguagePreferences {
  const saved = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(DEFAULT_LANGUAGE_PREFERENCES).map(([key, fallback]) =>
    [key, typeof saved[key] === "boolean" ? saved[key] : fallback],
  )) as LanguagePreferences;
}

export function resolveSurfaceLanguage<T extends string>(
  firstLanguage: T, preferences: LanguagePreferences, surface: LanguageSurface,
): T | "en" {
  return surface === "meaning" || preferences[surface] ? firstLanguage : "en";
}
