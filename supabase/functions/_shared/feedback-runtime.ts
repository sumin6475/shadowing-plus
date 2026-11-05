import { createClient } from "npm:@supabase/supabase-js@2";
import { recordMobileUsage } from "./mobile-usage.ts";
export const CONSENT_VERSION = "2026-11-04";
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,content-type,apikey,x-client-info",
};
export function serveFeedback(
  handler: (
    body: unknown,
    ctx: Awaited<ReturnType<typeof authenticate>>,
  ) => Promise<unknown>,
) {
  Deno.serve(async (req) => {
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return json({ code: "feedback_method" }, 405);
    try {
      return json(await handler(await req.json(), await authenticate(req)));
    } catch (e) {
      const code = e instanceof Error && /^feedback_[a-z_]+$/.test(e.message)
        ? e.message
        : "feedback_unavailable";
      return json(
        { code },
        code === "feedback_unauthorized"
          ? 401
          : code === "feedback_consent_required"
          ? 403
          : code === "feedback_daily_limit"
          ? 429
          : code === "feedback_revision_conflict"
          ? 409
          : 400,
      );
    }
  });
}
async function authenticate(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("feedback_unauthorized");
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  return { client, admin, user };
}
export function consent(user: { user_metadata: Record<string, unknown> }) {
  if (
    user.user_metadata.ai_processing_consent !== true ||
    user.user_metadata.ai_processing_consent_version !== CONSENT_VERSION
  ) throw new Error("feedback_consent_required");
}
export function checked<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw new Error("feedback_storage");
  return data;
}
export async function completion(
  ctx: Awaited<ReturnType<typeof authenticate>>,
  request: Record<string, unknown>,
  kind: string,
) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("feedback_unconfigured");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error("feedback_upstream");
  const payload = await response.json();
  await recordMobileUsage(ctx.admin, ctx.user.id, {
    kind,
    model: String(request.model),
    inputTokens: payload.usage?.prompt_tokens ?? 0,
    outputTokens: payload.usage?.completion_tokens ?? 0,
  });
  const choice = payload.choices?.[0];
  if (
    choice?.finish_reason !== "stop" || choice?.message?.refusal ||
    !choice?.message?.content
  ) throw new Error("feedback_incomplete");
  return choice.message.content as string;
}
export type FeedbackRuntime = Awaited<ReturnType<typeof authenticate>>;
export async function claim(
  ctx: FeedbackRuntime,
  kind: string,
  fingerprint: string,
  requestId: string = crypto.randomUUID(),
) {
  const result = await ctx.admin.rpc("claim_feedback_generation", {
    p_user: ctx.user.id,
    p_kind: kind,
    p_fingerprint: fingerprint,
    p_request_id: requestId,
  });
  if (result.error) {
    if (result.error.message.includes("feedback_daily_limit")) {
      throw new Error("feedback_daily_limit");
    }
    throw new Error("feedback_storage");
  }
  return result.data as {
    id: string;
    token: string;
    busy?: boolean;
    cached?: boolean;
    lease_expires_at: string;
  };
}
export async function finish(
  ctx: FeedbackRuntime,
  attempt: { id: string; token: string },
  payload: Record<string, unknown>,
) {
  return checked(
    await ctx.admin.rpc("complete_feedback_generation", {
      p_attempt: attempt.id,
      p_token: attempt.token,
      p_payload: payload,
    }),
  ) === true;
}
