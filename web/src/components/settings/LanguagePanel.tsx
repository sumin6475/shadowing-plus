"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/home/Icons";
import {
  TRANSLATION_LANGUAGE,
  TRANSLATION_LANGUAGE_OPTIONS,
  TRANSLATION_LANG_PREF_KEY,
} from "@/lib/pipeline/languages";

// Translation preference. Saved to localStorage and read as the default at
// upload time (migration 011 → jobs.target_lang). Audio is always English —
// this panel does not offer a source-language picker. A clip's target is
// fixed at upload; changing this only affects clips uploaded afterward.

const TRANSLATION_OPTIONS = TRANSLATION_LANGUAGE_OPTIONS;
const TRANSLATION_KEY = TRANSLATION_LANG_PREF_KEY;

function readPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function LanguagePanel() {
  // This panel only renders inside the (client-only) modal, so reading
  // localStorage in the lazy initializers is safe and avoids a set-state effect.
  const [translation, setTranslation] = useState<string>(() =>
    readPref(TRANSLATION_KEY, TRANSLATION_LANGUAGE),
  );
  const [base, setBase] = useState(() => translation);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const dirty = translation !== base;

  function save() {
    try {
      localStorage.setItem(TRANSLATION_KEY, translation);
    } catch {
      /* ignore */
    }
    setBase(translation);
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="set-panel">
      <div className="set-field">
        <label className="set-field-label">Audio language</label>
        <p className="set-field-help">
          Clips are transcribed in English. Shadowing+ is for learning English.
        </p>
        <p className="set-field-value">English</p>
      </div>

      <div className="set-field">
        <label htmlFor="translation-lang" className="set-field-label">
          Translation language
        </label>
        <p className="set-field-help">
          Your language — line translations and phrase explanations use this.
        </p>
        <select
          id="translation-lang"
          className="set-select"
          value={translation}
          onChange={(e) => {
            setTranslation(e.target.value);
            setSaved(false);
          }}
        >
          {TRANSLATION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      <div className="set-save-row">
        <button
          type="button"
          className="set-primary-btn"
          onClick={save}
          disabled={!dirty}
        >
          Save changes
        </button>
        <div className={"set-saved" + (saved ? " show" : "")}>
          <CheckIcon /> Saved
        </div>
      </div>

      <p className="set-note">
        Saved as your default for new clips. Existing clips keep the translation
        language they were made with.
      </p>
    </div>
  );
}
