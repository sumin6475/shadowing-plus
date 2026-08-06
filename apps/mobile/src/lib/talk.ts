// talk.ts — AI diagnosis for a finished Speak session.
//
// This calls a Supabase Edge Function (`talk-diagnose`), NOT the web Vercel
// route. Reason: the native iOS app's fetch to Vercel fails ("Protocol error"),
// while it reaches supabase.co reliably — and that's the standard place for an
// Expo app's server-side/secret logic anyway. functions.invoke auto-attaches the
// user's Supabase JWT, so auth comes for free. The OpenAI key lives in the
// function's Supabase secret, never in the bundle.
import { supabase } from "./supabase";
import type { TalkMoment } from "../types/api";

/**
 * Invoke the `talk-diagnose` Edge Function with a finished transcript (+ optional
 * topic) and get back up to 3 improvable moments. Returns [] when the transcript
 * was too short or already natural. Throws on a failed invocation.
 */
export async function diagnoseTalk(input: {
  transcript: string;
  topic?: string | null;
}): Promise<TalkMoment[]> {
  const { data, error } = await supabase.functions.invoke<{ moments: TalkMoment[] }>("talk-diagnose", {
    body: { transcript: input.transcript, topic: input.topic ?? null },
  });
  if (error) throw new Error(error.message || "Couldn’t analyze this session.");
  return data?.moments ?? [];
}
