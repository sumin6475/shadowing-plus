"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/home/Icons";
import {
  AUDIO_LANGUAGE,
  AUDIO_LANGUAGE_OPTIONS,
  AUDIO_LANG_PREF_KEY,
  TRANSLATION_LANGUAGE,
  TRANSLATION_LANGUAGE_OPTIONS,
  TRANSLATION_LANG_PREF_KEY,
} from "@/lib/pipeline/languages";

// Language preference UI. The chosen pair is saved to localStorage and read as
// the DEFAULT in the upload form, which sends it per clip to the pipeline
// (migration 011 → jobs.source_lang/target_lang). A clip's pair is fixed at
// upload time; changing this preference only affects clips uploaded afterward.
// Design: explicit "Save changes" button (enabled only when dirty) + an
// animated "Saved" check, per the settings-modal design handoff.

const AUDIO_OPTIONS = AUDIO_LANGUAGE_OPTIONS;
const TRANSLATION_OPTIONS = TRANSLATION_LANGUAGE_OPTIONS;
const AUDIO_KEY = AUDIO_LANG_PREF_KEY;
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
  const [audio, setAudio] = useState<string>(() =>
    readPref(AUDIO_KEY, AUDIO_LANGUAGE.code),
  );
  const [translation, setTranslation] = useState<string>(() =>
    readPref(TRANSLATION_KEY, TRANSLATION_LANGUAGE),
  );
  const [base, setBase] = useState(() => ({ audio, translation }));
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(savedTimer.current), []);

  const dirty = audio !== base.audio || translation !== base.translation;

  function save() {
    try {
      localStorage.setItem(AUDIO_KEY, audio);
      localStorage.setItem(TRANSLATION_KEY, translation);
    } catch {
      /* ignore */
    }
    setBase({ audio, translation });
    setSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="set-panel">
      <div className="set-field">
        <label htmlFor="audio-lang" className="set-field-label">
          Audio language
        </label>
        <p className="set-field-help">
          What you hear and shadow. Sent to the transcriber.
        </p>
        <select
          id="audio-lang"
          className="set-select"
          value={audio}
          onChange={(e) => {
            setAudio(e.target.value);
            setSaved(false);
          }}
        >
          {AUDIO_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="set-field">
        <label htmlFor="translation-lang" className="set-field-label">
          Translation language
        </label>
        <p className="set-field-help">
          Your native language — subtitles are translated into this.
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
        Saved as your default. New clips you upload use this pair; you can still
        change it per upload. Existing clips keep the pair they were made with.
      </p>
    </div>
  );
}
