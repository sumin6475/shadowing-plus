import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Provider pricing in USD. Update these when the providers change their rates.
 *
 * Sources (verify against your own billing dashboard — plans differ):
 *  - OpenAI gpt-4o-mini: $0.15 / 1M input tokens, $0.60 / 1M output tokens.
 *  - ElevenLabs Scribe v2: audio is billed by duration. The per-minute figure
 *    below is an ESTIMATE; tune it to match your ElevenLabs plan.
 */
export const OPENAI_PRICING: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
};

/** Estimated ElevenLabs Scribe cost per minute of audio (USD). */
export const ELEVENLABS_USD_PER_MINUTE = 0.4 / 60; // ~$0.40/hour estimate

export function openaiCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = OPENAI_PRICING[model];
  if (!p) return 0;
  return (
    (inputTokens / 1_000_000) * p.inputPerMillion +
    (outputTokens / 1_000_000) * p.outputPerMillion
  );
}

export function elevenlabsCostUsd(audioSeconds: number): number {
  return (audioSeconds / 60) * ELEVENLABS_USD_PER_MINUTE;
}

export interface RecordUsageInput {
  jobId?: string | null;
  // Owner (migration 008). Denormalized onto usage_events so per-user spend
  // survives job deletion (job_id is ON DELETE SET NULL). Optional so legacy
  // callers don't break, but the pipeline always passes it.
  userId?: string | null;
  label?: string | null;
  provider: "openai" | "elevenlabs";
  model: string;
  kind: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
}

/**
 * Persist one usage row. Cost is computed and stored here so the Settings page
 * can SUM `cost_usd` directly. Best-effort: a failure here must NEVER break the
 * pipeline, so it only logs.
 */
export async function recordUsage(input: RecordUsageInput): Promise<void> {
  try {
    const inputTokens = Math.max(0, Math.round(input.inputTokens ?? 0));
    const outputTokens = Math.max(0, Math.round(input.outputTokens ?? 0));
    const audioSeconds = Math.max(0, input.audioSeconds ?? 0);
    const cost =
      input.provider === "openai"
        ? openaiCostUsd(input.model, inputTokens, outputTokens)
        : elevenlabsCostUsd(audioSeconds);

    const { error } = await supabaseAdmin()
      .from("usage_events")
      .insert({
        job_id: input.jobId ?? null,
        user_id: input.userId ?? null,
        label: input.label ?? null,
        provider: input.provider,
        model: input.model,
        kind: input.kind,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        audio_seconds: audioSeconds,
        cost_usd: Number(cost.toFixed(6)),
      });
    if (error) {
      // Most likely cause: migration 006 not applied yet.
      console.error("recordUsage insert failed (non-fatal):", error.message);
    }
  } catch (e) {
    console.error("recordUsage failed (non-fatal):", e);
  }
}
