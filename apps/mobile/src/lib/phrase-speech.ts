import { supabase } from "./supabase";

export interface PhraseSpeechAudio {
  audioUrl: string;
  cached: boolean;
}

const pendingRequests = new Map<string, Promise<PhraseSpeechAudio>>();

/** Resolve or generate private AI pronunciation for an owned Phrase Bank row. */
export async function fetchPhraseSpeech(phraseId: string): Promise<PhraseSpeechAudio> {
  const current = pendingRequests.get(phraseId);
  if (current) return current;

  const request = (async () => {
    const { data, error } = await supabase.functions.invoke<{
      audio_url?: string;
      cached?: boolean;
    }>("phrase-tts", { body: { phrase_id: phraseId } });
    if (error) throw new Error(error.message || "Couldn’t load the AI voice.");
    const audioUrl = data?.audio_url?.trim() ?? "";
    if (!audioUrl.startsWith("https://")) throw new Error("The AI voice returned an invalid audio URL.");
    return { audioUrl, cached: Boolean(data?.cached) };
  })();

  pendingRequests.set(phraseId, request);
  const clear = () => pendingRequests.delete(phraseId);
  request.then(clear, clear);
  return request;
}

/** Best-effort cache warm-up; callers should not block phrase saving on it. */
export async function prewarmPhraseSpeech(phraseId: string): Promise<void> {
  await fetchPhraseSpeech(phraseId);
}
