// talk.ts — the AI diagnosis call for a finished Speak session. The OpenAI key
// lives on the server (apps/mobile/CLAUDE.md: no secrets in the bundle), so the
// app never calls the model directly — it POSTs the transcript to the web API
// and gets back up to 3 improvable "moments". apiJson attaches the Bearer token.
import { apiJson } from "./api";
import type { TalkMoment } from "../types/api";

/**
 * POST /api/talk/diagnose — send a finished Speak transcript (+ optional topic
 * for grounding) and get back the AI's improvable moments. Returns [] when the
 * transcript was too short or already natural. Throws ApiError on a failed
 * request so the caller can show the server's message.
 */
export async function diagnoseTalk(input: {
  transcript: string;
  topic?: string | null;
}): Promise<TalkMoment[]> {
  const { moments } = await apiJson<{ moments: TalkMoment[] }>("/api/talk/diagnose", {
    method: "POST",
    body: JSON.stringify({ transcript: input.transcript, topic: input.topic ?? null }),
  });
  return moments ?? [];
}
