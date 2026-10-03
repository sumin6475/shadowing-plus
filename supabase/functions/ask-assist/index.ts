// Ask: structured English-expression chat for the mobile app. MOBILE-ONLY.
// Two modes (how_to_say, note) share one session; the client keeps the history
// in memory and sends the last turns with every request, so this function is
// stateless. Prompts, schema and parsing live in ./core.ts (shared with the
// golden harness). Every turn is metered in usage_events (kind 'ask'), which is
// also what the daily limit counts.
import { createClient } from "npm:@supabase/supabase-js@2";

import { buildOpenAIRequest, costUsd, DAILY_LIMIT, MODEL, normalizeReply, parseAskBody } from "./core.ts";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed", code: "ask_method" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized", code: "ask_unauthorized" }, 401);

  const parsedBody = parseAskBody(await req.json().catch(() => null));
  if (!parsedBody.ok) return json({ error: parsedBody.error, code: parsedBody.code }, 400);
  const { request } = parsedBody;

  // Rolling 24h window, so there is no timezone question about "today". The
  // user-scoped client is enough: the usage_events owner policy (008) lets a
  // user count and insert their own rows. Concurrent requests can overshoot by
  // a turn or two; that is acceptable for a cost guard.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "ask")
    .gte("created_at", since);
  if (countError) console.error("ask-assist: usage count failed", countError.message);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({ error: "You've used today's questions. More tomorrow.", code: "ask_daily_limit" }, 429);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "Ask is not configured.", code: "ask_unconfigured" }, 500);

  const openai = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(buildOpenAIRequest(request)),
  });
  if (!openai.ok) {
    console.error("ask-assist: OpenAI", openai.status, await openai.text().catch(() => ""));
    return json({ error: `Couldn't answer right now (OpenAI ${openai.status}).`, code: "ask_upstream" }, 502);
  }
  const payload = await openai.json();
  const choice = payload?.choices?.[0];
  const inputTokens = Number(payload?.usage?.prompt_tokens ?? 0);
  const outputTokens = Number(payload?.usage?.completion_tokens ?? 0);

  // Meter before validating: a truncated or refused reply was still billed.
  // Best-effort — a failed insert never costs the learner their answer.
  const { error: usageError } = await supabase.from("usage_events").insert({
    user_id: user.id,
    provider: "openai",
    model: MODEL,
    kind: "ask",
    label: request.mode,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    cost_usd: costUsd(inputTokens, outputTokens),
  });
  if (usageError) console.error("ask-assist: usage insert failed", usageError.message);

  if (choice?.finish_reason === "length") {
    return json({ error: "That answer ran long. Try a shorter question.", code: "ask_truncated" }, 502);
  }
  const reply = normalizeReply(request.mode, choice?.message?.content ?? "");
  if (!reply) return json({ error: "Couldn't understand the answer. Try again.", code: "ask_parse" }, 502);

  return json({ mode: request.mode, reply, remaining: Math.max(0, DAILY_LIMIT - (count ?? 0) - 1) });
});
