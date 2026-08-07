// talk.ts — AI diagnosis for a finished Speak session.
//
// This calls a Supabase Edge Function (`talk-diagnose`), NOT the web Vercel
// route. Reason: the native iOS app's fetch to Vercel fails ("Protocol error"),
// while it reaches supabase.co reliably — and that's the standard place for an
// Expo app's server-side/secret logic anyway. functions.invoke auto-attaches the
// user's Supabase JWT, so auth comes for free. The OpenAI key lives in the
// function's Supabase secret, never in the bundle.
import { supabase } from "./supabase";
import type { StuckHelp, TalkMoment } from "../types/api";

/** One "I'm stuck" note: the timestamp plus the learner's quick memo about what
 *  they wanted to say (may be in their native language). */
export interface StuckMoment {
  at: string;
  note: string;
}

/**
 * Invoke the `talk-diagnose` Edge Function with a finished transcript (+ optional
 * topic) and get back up to 3 improvable moments. Returns [] when the transcript
 * was too short or already natural. Throws on a failed invocation.
 */
export async function diagnoseTalk(input: {
  transcript: string;
  topic?: string | null;
  storyId?: string | null;
}): Promise<TalkMoment[]> {
  const { data, error } = await supabase.functions.invoke<{ moments: TalkMoment[] }>("talk-diagnose", {
    body: { transcript: input.transcript, topic: input.topic ?? null, story_id: input.storyId ?? null },
  });
  if (error) throw new Error(error.message || "Couldn’t analyze this session.");
  return data?.moments ?? [];
}

/**
 * Invoke the `talk-stuck` Edge Function with the notes the learner jotted when
 * they tapped "Stuck" (each note = what they wanted to say but couldn't, often
 * in their native language) and get back the natural English expression for
 * each. A SEPARATE analysis from diagnoseTalk — the two run in parallel on
 * finish. Returns [] when there were no notes. Throws on a failed invocation.
 */
export async function diagnoseStuck(input: {
  stuckMoments: StuckMoment[];
  topic?: string | null;
}): Promise<StuckHelp[]> {
  const { data, error } = await supabase.functions.invoke<{ help: StuckHelp[] }>("talk-stuck", {
    body: { stuckMoments: input.stuckMoments, topic: input.topic ?? null },
  });
  if (error) throw new Error(error.message || "Couldn’t analyze your stuck moments.");
  return data?.help ?? [];
}
