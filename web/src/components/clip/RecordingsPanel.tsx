"use client";

import { formatExportTime } from "@/lib/transcript-export";
import type { PracticeRecording } from "@/lib/usePracticeRecordings";

function formatTakeWhen(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const delta = Date.now() - t;
  if (delta < 45_000) return "just now";
  if (delta < 3_600_000) return `${Math.max(1, Math.round(delta / 60_000))}m ago`;
  if (delta < 86_400_000) return `${Math.max(1, Math.round(delta / 3_600_000))}h ago`;
  return new Date(t).toLocaleDateString();
}

interface Props {
  items: PracticeRecording[];
  playingId: string | null;
  saving: boolean;
  error: string | null;
  onPlay: (item: PracticeRecording) => void;
  onDelete: (id: string) => void;
  variant?: "desktop" | "mobile";
}

export default function RecordingsPanel({
  items,
  playingId,
  saving,
  error,
  onPlay,
  onDelete,
  variant = "desktop",
}: Props) {
  if (items.length === 0 && !saving && !error) return null;

  return (
    <div className={"takes-panel" + (variant === "mobile" ? " is-mobile" : "")}>
      <div className="takes-head">Takes</div>
      {saving ? <div className="takes-status">Saving…</div> : null}
      {error ? <div className="takes-error">{error}</div> : null}
      {items.length > 0 ? (
        <ul className="takes-list">
          {items.map((item) => {
            const playing = playingId === item.id;
            return (
              <li key={item.id} className="takes-row">
                <div className="takes-meta">
                  <span className="takes-dur">
                    {formatExportTime(item.duration_seconds)}
                  </span>
                  <span className="takes-when">{formatTakeWhen(item.created_at)}</span>
                </div>
                <div className="takes-actions">
                  <button
                    type="button"
                    className={"takes-btn" + (playing ? " is-on" : "")}
                    onClick={() => onPlay(item)}
                  >
                    {playing ? "Pause" : "Play"}
                  </button>
                  <button
                    type="button"
                    className="takes-btn takes-btn-danger"
                    onClick={() => onDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="takes-privacy">
        Recordings stay in your account. You can delete them anytime.
      </p>
    </div>
  );
}
