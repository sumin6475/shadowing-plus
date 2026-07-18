import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUserId } from "@/lib/supabase-server";
import {
  ELEVENLABS_USD_PER_MINUTE,
  OPENAI_PRICING,
} from "@/lib/usage";

interface UsageRow {
  id: string;
  job_id: string | null;
  label: string | null;
  provider: "openai" | "elevenlabs";
  model: string;
  kind: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  audio_seconds: number;
  cost_usd: number;
  created_at: string;
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { data, error } = await supabaseAdmin()
      .from("usage_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // Surface a clear hint when the table is missing (migration not applied).
      return NextResponse.json(
        {
          ok: false,
          needsMigration: /usage_events/i.test(error.message),
          error: error.message,
        },
        { status: 200 },
      );
    }

    const rows = (data ?? []) as UsageRow[];
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalCost = 0;
    let monthCost = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    const providers = {
      openai: { cost: 0, inputTokens: 0, outputTokens: 0, calls: 0 },
      elevenlabs: { cost: 0, audioSeconds: 0, calls: 0 },
    };

    const byMonthMap = new Map<string, number>();

    // NUMERIC columns can deserialize as strings depending on the driver;
    // coerce everything to numbers so sums don't silently concatenate.
    const num = (v: unknown): number => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    for (const r of rows) {
      const cost = num(r.cost_usd);
      const inTok = num(r.input_tokens);
      const outTok = num(r.output_tokens);
      const audio = num(r.audio_seconds);

      totalCost += cost;
      const mk = monthKey(r.created_at);
      byMonthMap.set(mk, (byMonthMap.get(mk) ?? 0) + cost);
      if (mk === thisMonth) monthCost += cost;

      if (r.provider === "openai") {
        providers.openai.cost += cost;
        providers.openai.inputTokens += inTok;
        providers.openai.outputTokens += outTok;
        providers.openai.calls += 1;
        inputTokens += inTok;
        outputTokens += outTok;
      } else {
        providers.elevenlabs.cost += cost;
        providers.elevenlabs.audioSeconds += audio;
        providers.elevenlabs.calls += 1;
      }
    }

    const byMonth = [...byMonthMap.entries()]
      .map(([month, cost]) => ({ month, cost }))
      .sort((a, b) => (a.month < b.month ? 1 : -1))
      .slice(0, 6);

    const recent = rows.slice(0, 25).map((r) => ({
      id: r.id,
      label: r.label,
      provider: r.provider,
      model: r.model,
      kind: r.kind,
      totalTokens: num(r.total_tokens),
      audioSeconds: num(r.audio_seconds),
      cost: num(r.cost_usd),
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      ok: true,
      totalCost,
      monthCost,
      eventCount: rows.length,
      tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      providers,
      byMonth,
      recent,
      pricing: {
        openai: OPENAI_PRICING,
        elevenlabsPerMinute: ELEVENLABS_USD_PER_MINUTE,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
