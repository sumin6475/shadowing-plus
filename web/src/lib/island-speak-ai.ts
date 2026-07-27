import OpenAI from "openai";
import { recordUsage } from "@/lib/usage";
import { asText, parseDiagnosis, type PhraseRef, type Diagnosis } from "@/lib/island-speak";

// Server-only: the GPT call that diagnoses ONE gap from the learner's real
// attempt. Split out from island-speak.ts (which the client imports for the
// pure copy + helpers) so the OpenAI SDK never enters the browser bundle.

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are a speaking coach for a non-native English speaker practicing a short message they wrote. " +
  "They just spoke it once; you get the transcript of that attempt, their intended message beats, and the phrases they have already saved. " +
  "Name EXACTLY ONE gap — the single highest-leverage thing to fix — and classify it as one of: " +
  "'retrieval' (they OWN a saved phrase for this but it didn't come out), " +
  "'new_language' (they needed a way to say something they don't have a phrase for yet), " +
  "'meaning' (one idea didn't come across clearly), or " +
  "'pressure' (they rushed, froze, or dropped a beat). " +
  "Hard rules: (1) Quote a VERBATIM span from their attempt showing the gap. " +
  "(2) Only choose 'retrieval' if you can copy an EXACT phrase from their saved-phrases list; put that exact phrase in phraseText. If none fits, choose a different gap. " +
  "(3) For 'new_language', suggest ONE short phrase (max 8 words) they could save — natural and simple, in their voice. " +
  "(4) Never invent facts, numbers, names, or claims they did not make. " +
  "(5) recapFail and recapChange are ONE short line each: what failed on attempt 1, and what a good second attempt would change.";

/**
 * Diagnose one gap from the learner's real attempt. Returns a bounded Diagnosis;
 * the caller (route) supplies the learner's beats + saved phrases loaded under
 * RLS. A missing key throws; the route surfaces that as a 500.
 */
export async function diagnoseGap(
  attempt: string,
  beats: string[],
  phrases: PhraseRef[],
  userId: string,
): Promise<Diagnosis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");
  const answer = asText(attempt, 4000);

  const beatList = beats.map((b, i) => `${i + 1}. ${b}`).join("\n") || "(no beats)";
  const phraseList = phrases.length
    ? phrases.map((p) => `- "${p.text}"`).join("\n")
    : "(none saved yet — do not choose 'retrieval')";

  const response = await new OpenAI({ apiKey }).chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `My message beats:\n${beatList}\n\n` +
          `Phrases I already saved:\n${phraseList}\n\n` +
          `My attempt 1 (verbatim, ums and stalls included):\n"""${answer}"""\n\n` +
          `Return JSON only: {"gap":"retrieval|new_language|meaning|pressure","quote":"a verbatim span from my attempt","beatIndex":0,"phraseText":"exact saved phrase (retrieval only) or null","suggestion":"one short phrase to save (new_language only) or null","recapFail":"one line","recapChange":"one line"}`,
      },
    ],
  });

  await recordUsage({
    userId,
    label: "Island: diagnose gap",
    provider: "openai",
    model: MODEL,
    kind: "island_diagnose",
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  });

  return parseDiagnosis(JSON.parse(response.choices[0]?.message?.content ?? "{}"), phrases, beats.length);
}
