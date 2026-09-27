import OpenAI from "openai";
import { recordUsage } from "@/lib/usage";
import { MAX_MOMENTS, clamp, parseMoments, type TalkMoment } from "@/lib/talk-diagnose";

// Server-only: the GPT call that surfaces a few improvable "moments" from a
// Speak session's real (on-device) transcript. Kept out of any client bundle so
// the OpenAI SDK / key never ship to the mobile app — the app calls the
// /api/talk/diagnose route instead. Sibling of island-speak-ai.ts, which
// diagnoses ONE gap for the web island flow; this returns a short list.

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are a speaking coach for a non-native English speaker who just did a short, unscripted 'talk to yourself' session. " +
  "You get the on-device transcript of what they actually said (English only; stalls and rough grammar included) and, optionally, the topic they were talking about. " +
  "Find UP TO 3 moments where they could say something more naturally — the highest-leverage spots, not every small slip. " +
  "For each moment: (1) copy a VERBATIM span from their transcript into `said`; " +
  "(2) give ONE natural, simple rephrasing in their own voice in `want` (max 10 words); " +
  "(3) write ONE short example sentence in `example` that uses `want`; " +
  "(4) give a `label` (max 4 words) for what the moment is about. " +
  "Hard rules: never invent facts, numbers, names, or claims they did not make. " +
  "If the transcript is too short or already natural, return fewer moments — or none. " +
  "Return JSON only.";

/**
 * Surface a few improvable moments from a Speak transcript. Stateless: the route
 * supplies the transcript (+ optional topic); nothing is persisted here. A
 * missing key throws; the route surfaces it as a 500.
 */
export async function diagnoseTalk(
  transcript: string,
  topic: string | null,
  userId: string,
): Promise<TalkMoment[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");
  const said = clamp(transcript, 4000);

  const response = await new OpenAI({ apiKey }).chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          (topic ? `Topic I was talking about: ${topic}\n\n` : "") +
          `My transcript (verbatim, ums and stalls included):\n"""${said}"""\n\n` +
          `Return JSON only: {"moments":[{"label":"max 4 words","said":"verbatim span from my transcript","want":"natural rephrasing, max 10 words","example":"one short example sentence"}]}. ` +
          `At most ${MAX_MOMENTS} moments; fewer or none if the transcript is short or already natural.`,
      },
    ],
  });

  // Cost tracking is best-effort and never throws (see recordUsage).
  await recordUsage({
    userId,
    label: "Talk: diagnose session",
    provider: "openai",
    model: MODEL,
    kind: "talk_diagnose",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  });

  return parseMoments(response.choices[0]?.message?.content ?? "{}");
}
