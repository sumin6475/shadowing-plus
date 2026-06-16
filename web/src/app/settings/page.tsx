"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Folder, Video } from "@/lib/types";
import Sidebar, { type ActiveSection } from "@/components/home/Sidebar";
import NewFolderModal from "@/components/home/NewFolderModal";
import MobileTabBar from "@/components/mobile/MobileTabBar";

import "../home.css";
import "./settings.css";

const ACTIVE_SECTION_KEY = "sp:home:section";

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

function UsagePanel({
  data,
  loading,
  error,
  onRetry,
}: {
  data: UsageSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="usage"><div className="usage-empty">Loading…</div></div>;
  }
  if (error) {
    return (
      <div className="usage">
        <div className="usage-empty">
          Couldn&apos;t load usage · {error}{" "}
          <button type="button" className="usage-link" onClick={onRetry}>
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

export default function SettingsPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      .from("folders")
      .select("*")
      .order("created_at")
      .then(({ data }) => setFolders((data ?? []) as Folder[]));
    supabase
      .from("videos")
      .select("id, folder_id, created_at")
      .then(({ data }) => setVideos((data ?? []) as Video[]));
  }, []);

  const handleSidebarSelect = useCallback(
    (section: ActiveSection) => {
      try {
        localStorage.setItem(ACTIVE_SECTION_KEY, JSON.stringify(section));
      } catch {
        /* ignore */
      }
      router.push("/");
    },
    [router],
  );

  const openNewFolder = useCallback(() => setNewFolderOpen(true), []);

  const createFolder = useCallback(
    async (input: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from("folders")
        .insert({ name: input.name, color: input.color })
        .select()
        .single();
      if (error) {
        alert(`Failed to create folder: ${error.message}`);
        return;
      }
      if (data) {
        setNewFolderOpen(false);
        handleSidebarSelect({ kind: "folder", id: data.id });
      }
    },
    [handleSidebarSelect],
  );

  const renameFolder = useCallback(async (id: string, name: string) => {
    await supabase.from("folders").update({ name }).eq("id", id);
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const deleteFolder = useCallback(async (folder: Folder) => {
    if (!confirm(`Delete folder "${folder.name}"?`)) return;
    await supabase.from("folders").delete().eq("id", folder.id);
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
  }, []);

  const setFolderColor = useCallback(async (id: string, color: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, color } : f)));
    await supabase.from("folders").update({ color }).eq("id", id);
  }, []);

  const recentCount = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 3600 * 1000;
    return videos.filter((v) => new Date(v.created_at).getTime() >= cutoff).length;
  }, [videos]);

  return (
    <>
      <div className="home-app">
        <Sidebar
          active={{ kind: "all" }}
          onSelect={handleSidebarSelect}
          folders={folders}
          videos={videos.map((v) => ({ id: v.id, folder_id: v.folder_id }))}
          allCount={videos.length}
          recentCount={recentCount}
          onCreateFolder={openNewFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onSetFolderColor={setFolderColor}
        />

        <NewFolderModal
          open={newFolderOpen}
          onCancel={() => setNewFolderOpen(false)}
          onCreate={createFolder}
          existingNames={folders.map((f) => f.name)}
        />

        <main className="main">
          <div className="main-inner">
            <header className="page-head">
              <div>
                <h1 className="page-title">Settings</h1>
                <p className="page-sub">Track your token usage and estimated cost.</p>
              </div>
              <div className="page-actions">
                <button type="button" className="btn ghost" onClick={loadUsage}>
                  Refresh
                </button>
              </div>
            </header>

            <UsagePanel data={data} loading={loading} error={error} onRetry={loadUsage} />
          </div>
        </main>
      </div>

      <div className="m-app">
        <header className="m-settings-top">
          <Link href="/" className="m-settings-back" aria-label="Back">
            ‹ Library
          </Link>
          <span className="m-settings-title">Settings</span>
          <button type="button" className="m-settings-refresh" onClick={loadUsage}>
            Refresh
          </button>
        </header>
        <div className="m-settings-body">
          <UsagePanel data={data} loading={loading} error={error} onRetry={loadUsage} />
        </div>
        <MobileTabBar active="settings" />
      </div>
    </>
  );
}
