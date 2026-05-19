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

interface Props {
  job: Job;
  onChanged: () => void;
}

export default function JobCard({ job, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const isFailed = job.status === "failed";
  const isReady = job.status === "ready";
  const isRunning = !isFailed && !isReady && job.status !== "pending";

  const stageLabel = job.current_stage
    ? STAGE_LABELS[job.current_stage]
    : isReady
      ? "Ready"
      : "Queued";

  const currentIdx = job.current_stage ? STAGES.indexOf(job.current_stage) : -1;

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

  const fillCls =
    "job-progress-fill" +
    (isFailed ? " is-failed" : isReady ? " is-ready" : isRunning ? " is-running" : "");
  const fillWidth = isFailed ? Math.max(job.progress, 10) : job.progress;

  return (
    <div className="job-card">
      <div className="job-card-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="job-title">{job.title}</div>
          <div className="job-stage">{stageLabel}</div>
        </div>
        <button
          type="button"
          className="job-remove"
          onClick={remove}
          disabled={busy !== null}
        >
          {busy === "delete" ? "…" : "Remove"}
        </button>
      </div>

      <div className="job-progress">
        <div className={fillCls} style={{ width: `${fillWidth}%` }} />
      </div>

      <div className="stage-chips">
        {STAGES.map((s) => {
          const sIdx = STAGES.indexOf(s);
          const done = isReady || sIdx < currentIdx;
          const active = !isFailed && !isReady && sIdx === currentIdx;
          const failedHere = isFailed && sIdx === currentIdx;
          let cls = "stage-chip";
          if (failedHere) cls += " is-failed";
          else if (active) cls += " is-active";
          else if (done) cls += " is-done";
          return (
            <span key={s} className={cls}>
              {s}
            </span>
          );
        })}
      </div>

      {isFailed && job.current_stage && (
        <>
          <div className="job-error">{job.error}</div>
          <div className="job-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => retry(job.current_stage!)}
              disabled={busy !== null}
            >
              {busy === job.current_stage
                ? "Retrying…"
                : `Retry "${job.current_stage}"`}
            </button>
            {STAGES.filter((s) => s !== job.current_stage).map((s) => (
              <button
                key={s}
                type="button"
                className="btn"
                onClick={() => retry(s)}
                disabled={busy !== null}
              >
                from {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
