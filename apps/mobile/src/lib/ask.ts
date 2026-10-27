// ask.ts — one question to the Ask assistant.
//
// Calls the `ask-assist` Supabase Edge Function (see lib/talk.ts for why the
// app's server logic lives there). ASK_MOCK keeps canned replies available
// for local visual checks without calling the function.
import { requireAiProcessingConsent } from "./ai-consent";
import { mockReply } from "./ask-fixtures";
import { buildAskRequest, type AskMode, type AskReply, type AskTurn } from "./ask-model";
import { firstLanguage } from "./first-language";
import { ASK_MOCK } from "./release-flags";
import { supabase } from "./supabase";

/** The day's questions are used up (server: 50 per rolling 24 hours). */
export class AskLimitError extends Error {
  constructor() {
    super("You’ve used today’s questions. More tomorrow.");
    this.name = "AskLimitError";
  }
}

export interface AskResult {
  reply: AskReply;
  /** Questions left today; null when the server did not say. */
  remaining: number | null;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sends the conversation so far (the last turn is the new question) and
 *  returns the reply. Throws AskLimitError at the daily limit, and an Error
 *  whose message can be shown as is for anything else. */
export async function askAssist(mode: AskMode, turns: AskTurn[], draftNow = false): Promise<AskResult> {
  if (ASK_MOCK) {
    await wait(900);
    const outcome = mockReply(mode, turns, draftNow);
    if ("fail" in outcome) {
      if (outcome.fail === "limit") throw new AskLimitError();
      throw new Error("Couldn’t answer right now. Try again.");
    }
    return { reply: outcome.reply, remaining: null };
  }
  await requireAiProcessingConsent();
  const { data, error } = await supabase.functions.invoke<{ reply: AskReply; remaining: number }>(
    "ask-assist",
    { body: buildAskRequest(mode, turns, firstLanguage(), draftNow) },
  );
  if (error) {
    // A non-2xx reply carries `{ error, code }`; the daily limit is a 429.
    const response = (error as { context?: Response }).context;
    const body = (await response?.json?.().catch(() => null)) as { error?: string; code?: string } | null;
    if (body?.code === "ask_daily_limit") throw new AskLimitError();
    throw new Error(body?.error || "Couldn’t answer right now. Try again.");
  }
  if (!data?.reply) throw new Error("Couldn’t answer right now. Try again.");
  return { reply: data.reply, remaining: data.remaining ?? null };
}
