import type { AsrProvider, AsrResult, AsrWord } from "./types";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ELEVENLABS_MODEL_ID = "scribe_v2";

interface ElevenLabsWord {
  text: string;
  start: number | null;
  end: number | null;
  type?: "word" | "spacing" | "audio_event";
}

interface ElevenLabsResponse {
  text: string;
  language_code: string;
  words: ElevenLabsWord[];
  audio_duration_secs?: number;
}

/**
 * ElevenLabs Scribe v2. The original stage-2 implementation, moved behind the
 * AsrProvider interface unchanged (same request shape and error handling) so
 * routing zh/ja here keeps today's proven quality.
 */
export const scribeProvider: AsrProvider = {
  name: "scribe",
  async transcribe(signedAudioUrl: string, languageCode: string): Promise<AsrResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

    const body = new FormData();
    body.set("model_id", ELEVENLABS_MODEL_ID);
    body.set("timestamps_granularity", "word");
    body.set("language_code", languageCode);
    body.set("tag_audio_events", "false");
    body.set("diarize", "false");
    body.set("cloud_storage_url", signedAudioUrl);

    const resp = await fetch(ELEVENLABS_API_URL, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`ElevenLabs ${resp.status}: ${errText.slice(0, 500)}`);
    }
    const data = (await resp.json()) as ElevenLabsResponse;

    const words: AsrWord[] = (data.words ?? []).map((w) => ({
      text: w.text,
      start: w.start,
      end: w.end,
      type: w.type,
    }));
    return { words, audioDurationSecs: data.audio_duration_secs ?? null };
  },
};

export { ELEVENLABS_MODEL_ID };
