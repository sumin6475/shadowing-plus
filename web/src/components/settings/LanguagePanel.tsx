"use client";

import { useState } from "react";
import { AUDIO_LANGUAGE, TRANSLATION_LANGUAGE } from "@/lib/pipeline/languages";

// Language preference UI. NOTE: the pipeline currently reads a fixed pair from
// languages.ts (eng → Korean), server-side. This tab lets the user pick and
// SAVES the choice (localStorage for now); wiring it into the pipeline is
// Phase 3 work (per-video source_lang/target_lang, per the ver2.0 phase-0
// plan). Until then this records intent and shows the current default.

const AUDIO_OPTIONS: { code: string; name: string }[] = [
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "cmn", name: "Chinese (Mandarin)" },
];

const TRANSLATION_OPTIONS: string[] = [
  "Korean",
  "English",
  "Japanese",
  "Spanish",
  "French",
  "German",
  "Chinese",
];

const AUDIO_KEY = "sp:pref:audioLang";
const TRANSLATION_KEY = "sp:pref:translationLang";

function readPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function LanguagePanel() {
  // This panel only renders inside the (client-only) modal, so reading
  // localStorage in the lazy initializer is safe and avoids a set-state effect.
  const [audio, setAudio] = useState<string>(() =>
    readPref(AUDIO_KEY, AUDIO_LANGUAGE.code),
  );
  const [translation, setTranslation] = useState<string>(() =>
    readPref(TRANSLATION_KEY, TRANSLATION_LANGUAGE),
  );
  const [saved, setSaved] = useState(false);

  function persist(nextAudio: string, nextTranslation: string) {
    try {
      localStorage.setItem(AUDIO_KEY, nextAudio);
      localStorage.setItem(TRANSLATION_KEY, nextTranslation);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch {
      /* ignore */
    }
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
            persist(e.target.value, translation);
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
            persist(audio, e.target.value);
          }}
        >
          {TRANSLATION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>

      {saved && <p className="set-saved">Saved</p>}

      <p className="set-note">
        Saved as your preference. New clips use the default pair (English →
        Korean) until per-clip language support ships.
      </p>
    </div>
  );
}
