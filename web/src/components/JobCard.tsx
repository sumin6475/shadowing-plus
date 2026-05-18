"use client";

import { useState } from "react";
import type { Job, StageName } from "@/lib/types";

const STAGE_LABELS: Record<StageName, string> = {
  extract: "Extracting audio",
  transcribe: "Transcribing",
  postprocess: "Cleaning up segments",
  translate: "Translating",
  persist: "Saving",
};

const STAGES: StageName[] = [
  "extract",
  "transcribe",
  "postprocess",
  "translate",
  "persist",
];

function stageIndex(stage: StageName | null): number {
  if (!stage) return -1;
  return STAGES.indexOf(stage);
}

interface Props {
  job: Job;
  onChanged: () => void;
}

export default function JobCard({ job, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const isFailed = job.status === "failed";
  const isReady = job.status === "ready";
  const isRunning =
    job.status !== "ready" && job.status !== "failed" && job.status !== "pending";

  const stageLabel = job.current_stage
    ? STAGE_LABELS[job.current_stage]
    : isReady
      ? "Ready"
      : "Queued";

  async function retry(stage: StageName) {
    setBusy(stage);
    try {
      await fetch(`/api/jobs/${job.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete job "${job.title}"? Source file will be removed too.`)) {
      return;
    }
    setBusy("delete");
    try {
      await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{job.title}</p>
          <p className="text-xs text-muted-foreground">{stageLabel}</p>
        </div>
        <button
          onClick={remove}
          disabled={busy !== null}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-50"
        >
          {busy === "delete" ? "…" : "Remove"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isFailed
              ? "bg-destructive"
              : isReady
                ? "bg-emerald-500"
                : "bg-primary"
          } ${isRunning ? "animate-pulse" : ""}`}
          style={{
            width: `${isFailed ? Math.max(job.progress, 10) : job.progress}%`,
          }}
        />
      </div>

      {/* Stage chips */}
      <div className="flex gap-1.5 flex-wrap text-[10px] uppercase tracking-wider">
        {STAGES.map((s) => {
          const cur = stageIndex(job.current_stage);
          const sIdx = STAGES.indexOf(s);
          const done = isReady || sIdx < cur || (isFailed && sIdx < cur);
          const active = !isFailed && !isReady && sIdx === cur;
          const failedHere = isFailed && sIdx === cur;
          return (
            <span
              key={s}
              className={`px-1.5 py-0.5 rounded ${
                failedHere
                  ? "bg-destructive/20 text-destructive"
                  : active
                    ? "bg-primary/20 text-primary"
                    : done
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </span>
          );
        })}
      </div>

      {/* Error + retry */}
      {isFailed && job.current_stage && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-destructive break-all line-clamp-3">
            {job.error}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => retry(job.current_stage!)}
              disabled={busy !== null}
              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy === job.current_stage ? "Retrying…" : `Retry "${job.current_stage}"`}
            </button>
            {STAGES.filter((s) => s !== job.current_stage).map((s) => (
              <button
                key={s}
                onClick={() => retry(s)}
                disabled={busy !== null}
                className="text-xs px-2 py-1 rounded border border-border hover:bg-accent disabled:opacity-50"
              >
                from {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
