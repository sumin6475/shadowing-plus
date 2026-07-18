"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Video } from "@/lib/types";
import "./usage.css";

// Token/cost/storage dashboard. Self-contained: it fetches its own usage +
// storage data, so the Settings modal's Usage tab just renders <UsagePanel />.
// (Lifted from the former /settings page.)

interface ProviderOpenAI {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}
interface ProviderEleven {
  cost: number;
  audioSeconds: number;
  calls: number;
}
interface RecentEvent {
  id: string;
  label: string | null;
  provider: "openai" | "elevenlabs";
  model: string;
  kind: string;
  totalTokens: number;
  audioSeconds: number;
  cost: number;
  createdAt: string;
}
interface UsageSummary {
  ok: boolean;
  needsMigration?: boolean;
  error?: string;
  totalCost: number;
  monthCost: number;
  eventCount: number;
  tokens: { input: number; output: number; total: number };
  providers: { openai: ProviderOpenAI; elevenlabs: ProviderEleven };
  byMonth: { month: string; cost: number }[];
  recent: RecentEvent[];
}
interface LargestClip {
  id: string;
  title: string;
  bytes: number;
}

function usd(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  if (n > 0 && n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}
function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
function duration(seconds: number): string {
  const m = seconds / 60;
  if (m >= 60) return `${(m / 60).toFixed(1)}h`;
  if (m >= 1) return `${m.toFixed(1)}m`;
  return `${Math.round(seconds)}s`;
}
function bytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const gb = n / 1e9;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = n / 1e6;
  if (mb >= 1) return `${Math.round(mb)} MB`;
  return `${Math.max(1, Math.round(n / 1e3))} KB`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${y}.${m}`;
}
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

const PROVIDER_LABEL: Record<string, string> = {
  openai: "OpenAI",
  elevenlabs: "ElevenLabs",
};
const KIND_LABEL: Record<string, string> = {
  translate: "Translate",
  profile: "Profile",
  transcribe: "Transcribe",
};

export default function UsagePanel() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [videos, setVideos] = useState<Pick<Video, "id" | "title">[]>([]);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usage");
      const json = (await res.json()) as UsageSummary;
      if (!json.ok && !json.needsMigration) {
        throw new Error(json.error || "Failed to load usage");
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  useEffect(() => {
    supabase
      .from("videos")
      .select("id, title")
      .then(({ data }) =>
        setVideos((data ?? []) as Pick<Video, "id" | "title">[]),
      );
  }, []);

  useEffect(() => {
    fetch("/api/storage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.sizes) setSizes(d.sizes as Record<string, number>);
      })
      .catch(() => {});
  }, []);

  const storageTotal = useMemo(
    () => Object.values(sizes).reduce((a, b) => a + (b || 0), 0),
    [sizes],
  );

  const largestClips = useMemo<LargestClip[]>(() => {
    return videos
      .map((v) => ({
        id: v.id,
        title: v.title || "(untitled)",
        bytes: sizes[v.id] ?? 0,
      }))
      .filter((c) => c.bytes > 0)
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);
  }, [videos, sizes]);

  if (loading) {
    return <div className="usage"><div className="usage-empty">Loading…</div></div>;
  }
  if (error) {
    return (
      <div className="usage">
        <div className="usage-empty">
          Couldn&apos;t load usage · {error}{" "}
          <button type="button" className="usage-link" onClick={loadUsage}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (data?.needsMigration) {
    return (
      <div className="usage">
        <div className="usage-warn">
          <div className="usage-warn-title">Usage table not found</div>
          <div>
            Run <code>supabase/migrations/006_usage_events.sql</code> in the
            Supabase SQL Editor, then refresh. Cost is tracked for jobs processed
            after the migration is applied.
          </div>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { providers } = data;
  const hasData = data.eventCount > 0;

  return (
    <div className="usage">
      {!hasData && (
        <div className="usage-note">
          No usage recorded yet. Import or process a clip and your token usage
          and estimated cost will show up here.
        </div>
      )}

      <div className="usage-cards">
        <div className="usage-card hero">
          <div className="usage-card-label">Total spend</div>
          <div className="usage-card-value">{usd(data.totalCost)}</div>
          <div className="usage-card-sub">All time</div>
        </div>
        <div className="usage-card">
          <div className="usage-card-label">This month</div>
          <div className="usage-card-value">{usd(data.monthCost)}</div>
          <div className="usage-card-sub">Current calendar month</div>
        </div>
        <div className="usage-card">
          <div className="usage-card-label">Total tokens</div>
          <div className="usage-card-value">{num(data.tokens.total)}</div>
          <div className="usage-card-sub">
            Input {num(data.tokens.input)} · Output {num(data.tokens.output)}
          </div>
        </div>
        <div className="usage-card">
          <div className="usage-card-label">API calls</div>
          <div className="usage-card-value">{num(data.eventCount)}</div>
          <div className="usage-card-sub">Billable requests</div>
        </div>
        <div className="usage-card">
          <div className="usage-card-label">Storage used</div>
          <div className="usage-card-value">{bytes(storageTotal)}</div>
          <div className="usage-card-sub">Media stored in R2</div>
        </div>
      </div>

      <div className="usage-section-title">By provider</div>
      <div className="usage-providers">
        <div className="usage-prov">
          <div className="usage-prov-head">
            <span className="usage-dot openai" /> OpenAI · Translation
          </div>
          <div className="usage-prov-cost">{usd(providers.openai.cost)}</div>
          <div className="usage-prov-meta">
            <span>{num(providers.openai.inputTokens + providers.openai.outputTokens)} tokens</span>
            <span>{num(providers.openai.calls)} calls</span>
            <span>gpt-4o-mini</span>
          </div>
        </div>
        <div className="usage-prov">
          <div className="usage-prov-head">
            <span className="usage-dot eleven" /> ElevenLabs · Transcription
          </div>
          <div className="usage-prov-cost">{usd(providers.elevenlabs.cost)}</div>
          <div className="usage-prov-meta">
            <span>{duration(providers.elevenlabs.audioSeconds)} audio</span>
            <span>{num(providers.elevenlabs.calls)} calls</span>
            <span>scribe_v2 (est.)</span>
          </div>
        </div>
      </div>

      {data.byMonth.length > 0 && (
        <>
          <div className="usage-section-title">By month</div>
          <div className="usage-months">
            {(() => {
              const max = Math.max(...data.byMonth.map((m) => m.cost), 0.0001);
              return data.byMonth.map((m) => (
                <div key={m.month} className="usage-month-row">
                  <span className="usage-month-key">{monthLabel(m.month)}</span>
                  <span className="usage-month-bar">
                    <span
                      className="usage-month-fill"
                      style={{ width: `${Math.max(3, (m.cost / max) * 100)}%` }}
                    />
                  </span>
                  <span className="usage-month-cost">{usd(m.cost)}</span>
                </div>
              ));
            })()}
          </div>
        </>
      )}

      {largestClips.length > 0 && (
        <>
          <div className="usage-section-title">Storage by clip</div>
          <div className="usage-months">
            {(() => {
              const max = Math.max(...largestClips.map((c) => c.bytes), 1);
              return largestClips.map((c) => (
                <div key={c.id} className="usage-month-row usage-clip-row">
                  <span className="usage-month-key usage-clip-name" title={c.title}>
                    {c.title}
                  </span>
                  <span className="usage-month-bar">
                    <span
                      className="usage-month-fill"
                      style={{ width: `${Math.max(3, (c.bytes / max) * 100)}%` }}
                    />
                  </span>
                  <span className="usage-month-cost">{bytes(c.bytes)}</span>
                </div>
              ));
            })()}
          </div>
        </>
      )}

      {data.recent.length > 0 && (
        <>
          <div className="usage-section-title">Recent activity</div>
          <div className="usage-table">
            <div className="usage-tr usage-th">
              <span>Clip</span>
              <span>Type</span>
              <span className="ta-r">Usage</span>
              <span className="ta-r">Cost</span>
              <span className="ta-r">When</span>
            </div>
            {data.recent.map((r) => (
              <div key={r.id} className="usage-tr">
                <span className="usage-td-label" title={r.label ?? ""}>
                  {r.label ?? "(deleted clip)"}
                </span>
                <span className="usage-td-kind">
                  <span className={"usage-dot " + (r.provider === "openai" ? "openai" : "eleven")} />
                  {PROVIDER_LABEL[r.provider]} · {KIND_LABEL[r.kind] ?? r.kind}
                </span>
                <span className="ta-r usage-mono">
                  {r.provider === "openai" ? `${num(r.totalTokens)} tok` : duration(r.audioSeconds)}
                </span>
                <span className="ta-r usage-mono">{usd(r.cost)}</span>
                <span className="ta-r usage-td-time">{relTime(r.createdAt)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="usage-disclaimer">
        Costs are estimates based on the rates configured in code (OpenAI
        gpt-4o-mini, ElevenLabs Scribe). Check each provider&apos;s dashboard for
        exact billing. Rates can be edited in{" "}
        <code>web/src/lib/usage.ts</code>.
      </div>
    </div>
  );
}
