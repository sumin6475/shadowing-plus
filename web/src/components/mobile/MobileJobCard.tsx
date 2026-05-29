"use client";

import { useState } from "react";
import type { Job, StageName } from "@/lib/types";
import { CheckIcon } from "@/components/home/Icons";

const STAGES: StageName[] = [
  "extract",
  "transcribe",
  "postprocess",
  "translate",
  "persist",
];

// Friendly mobile labels — short label under the step dot, long "doing" line
// shown as the active-stage status text.
const STAGE_LABEL: Record<StageName, string> = {
  extract: "Extract",
  transcribe: "Transcribe",
  postprocess: "Refine",
  translate: "Translate",
  persist: "Save",
};

const STAGE_DOING: Record<StageName, string> = {
  extract: "Extracting audio",
  transcribe: "Transcribing speech",
  postprocess: "Cleaning up transcript",
  translate: "Translating to Korean",
  persist: "Saving to library",
};

function XIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

interface Props {
  job: Job;
  onChanged: () => void;
}

export default function MobileJobCard({ job, onChanged }: Props) {
  const [busy, setBusy] = useState(false);

  const isFailed = job.status === "failed";
  const isReady = job.status === "ready";
  const currentIdx = job.current_stage ? STAGES.indexOf(job.current_stage) : 0;

  const pct = isReady ? 100 : Math.max(0, Math.min(100, Math.round(job.progress)));

  const statusText = isFailed
    ? "Failed — tap retry"
    : isReady
      ? "Ready to shadow"
      : job.current_stage
        ? STAGE_DOING[job.current_stage] + "…"
        : "Queued";

  async function dismiss() {
    if (!confirm(`Remove "${job.title}"? Source file will be deleted.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!job.current_stage) return;
    setBusy(true);
    try {
      await fetch(`/api/jobs/${job.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: job.current_stage }),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const cardCls =
    "m-upload" +
    (isReady ? " is-done" : "") +
    (isFailed ? " is-failed" : "");

  return (
    <div className={cardCls}>
      <div className="m-upload-head">
        <span className="m-upload-thumb">
          {isReady ? (
            <CheckIcon width="18" height="18" />
          ) : isFailed ? (
            <XIcon />
          ) : (
            <span className="m-upload-spin" aria-hidden="true" />
          )}
        </span>
        <div className="m-upload-info">
          <div className="m-upload-name">{job.title}</div>
          <div className="m-upload-status">
            <span
              className={
                "m-upload-status-text" + (isReady ? " is-done" : "")
              }
            >
              {statusText}
            </span>
            <span className="m-upload-pct">{isReady ? "" : pct + "%"}</span>
          </div>
        </div>
        {isFailed ? (
          <button
            type="button"
            className="m-upload-cancel"
            onClick={retry}
            disabled={busy}
            aria-label="Retry"
          >
            {busy ? "…" : "Retry"}
          </button>
        ) : (
          <button
            type="button"
            className="m-upload-cancel"
            onClick={dismiss}
            disabled={busy}
            aria-label={isReady ? "Dismiss" : "Cancel upload"}
          >
            <XIcon />
          </button>
        )}
      </div>

      <div className="m-upload-track">
        <div className="m-upload-fill" style={{ width: pct + "%" }} />
      </div>

      <ol className="m-upload-steps">
        {STAGES.map((s, i) => {
          const state =
            isReady || i < currentIdx
              ? "done"
              : isFailed && i === currentIdx
                ? "failed"
                : i === currentIdx
                  ? "active"
                  : "pending";
          return (
            <li key={s} className={"m-upload-step is-" + state}>
              <span className="m-upload-step-dot">
                {state === "done" ? <CheckIcon width="11" height="11" /> : null}
              </span>
              <span className="m-upload-step-label">{STAGE_LABEL[s]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
