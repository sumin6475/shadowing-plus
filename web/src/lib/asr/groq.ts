import type { AsrProvider, AsrResult, AsrWord } from "./types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL_ID = "whisper-large-v3";

// Groq's Whisper endpoint speaks the OpenAI audio API, which takes an ISO 639-1
// (2-letter) language hint, while the pipeline stores ISO 639-3 codes. Map the
// languages we route to Groq; anything unmapped is sent without a hint (Whisper
// auto-detects), so an unknown code degrades gracefully rather than erroring.
const ISO3_TO_ISO1: Record<string, string> = {
  eng: "en",
  spa: "es",
  fra: "fr",
  deu: "de",
  ita: "it",
  por: "pt",
  nld: "nl",
  rus: "ru",
  kor: "ko",
  // zh/ja are routed to Scribe, not Groq, so they're intentionally absent.
};

interface GroqWord {
  word: string;
  start: number | null;
  end: number | null;
}

interface GroqVerboseResponse {
  text: string;
  duration?: number;
  words?: GroqWord[];
}

/**
 * Groq Whisper large-v3. Cheaper by an order of magnitude than Scribe, used for
 * everything except zh/ja (see pickAsrProvider). Unlike Scribe's cloud_storage_url,
 * the OpenAI-compatible endpoint wants the audio bytes, so we fetch the signed
 * URL and forward the blob as multipart.
 */
export const groqProvider: AsrProvider = {
  name: "groq",
  async transcribe(signedAudioUrl: string, languageCode: string): Promise<AsrResult> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set");

    // Pull the audio down from R2's signed URL, then re-upload the bytes.
    const audioResp = await fetch(signedAudioUrl);
    if (!audioResp.ok) {
      throw new Error(`Failed to fetch audio for Groq (${audioResp.status})`);
    }
    const audioBlob = await audioResp.blob();

    const form = new FormData();
    form.set("model", GROQ_MODEL_ID);
    form.set("file", audioBlob, "audio.mp3");
    form.set("response_format", "verbose_json");
    // Word-level timestamps drive FocusLine highlighting.
    form.append("timestamp_granularities[]", "word");
    const iso1 = ISO3_TO_ISO1[languageCode];
    if (iso1) form.set("language", iso1);

    const resp = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Groq ${resp.status}: ${errText.slice(0, 500)}`);
    }
    const data = (await resp.json()) as GroqVerboseResponse;

    const words: AsrWord[] = (data.words ?? []).map((w) => ({
      text: w.word,
      start: w.start,
      end: w.end,
      type: "word",
    }));
    return { words, audioDurationSecs: data.duration ?? null };
  },
};

export { GROQ_MODEL_ID };
