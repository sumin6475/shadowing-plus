// Best-effort metering for mobile Edge Functions. No learner text is stored.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const TEXT_PRICES: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
};

export function textCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = TEXT_PRICES[model];
  return price ? (inputTokens * price.input + outputTokens * price.output) / 1_000_000 : 0;
}

export function estimatedTtsSeconds(text: string): number {
  // Speech API returns MP3 bytes without usage or duration. Assume 150 English
  // words/minute; this is only an operating estimate, never a billed duration.
  return Math.max(1, text.trim().split(/\s+/).filter(Boolean).length / 2.5);
}

export async function recordMobileUsage(
  supabase: SupabaseClient,
  userId: string,
  input: { kind: string; model: string; inputTokens?: number; outputTokens?: number; audioSeconds?: number; estimatedCostUsd?: number },
): Promise<void> {
  const inputTokens = Math.max(0, Math.round(input.inputTokens ?? 0));
  const outputTokens = Math.max(0, Math.round(input.outputTokens ?? 0));
  const cost = input.estimatedCostUsd ?? textCostUsd(input.model, inputTokens, outputTokens);
  try {
    const { error } = await supabase.from("usage_events").insert({
      user_id: userId,
      provider: "openai",
      model: input.model,
      kind: input.kind,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      audio_seconds: input.audioSeconds ?? 0,
      cost_usd: Number(cost.toFixed(6)),
    });
    if (error) console.error("mobile usage insert failed", input.kind, error.message);
  } catch (error) {
    console.error("mobile usage insert failed", input.kind, error);
  }
}
