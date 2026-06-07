"use client";

import { useEffect, useState } from "react";
import { UndoIcon } from "./Icons";

interface Props {
  open: boolean;
  label: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({
  open,
  label,
  onUndo,
  onDismiss,
  duration = 6000,
}: Props) {
  // Parent passes a fresh `key` per delete, so this state always starts at
  // 100 on mount — no in-effect reset needed.
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!open) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed >= duration) {
        onDismiss();
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, duration, onDismiss]);

  if (!open) return null;

  return (
    <div className="undo-toast" role="status">
      <span className="undo-toast-dot" aria-hidden="true" />
      <span className="undo-toast-label">{label}</span>
      <button type="button" className="undo-toast-btn" onClick={onUndo}>
        <UndoIcon />
        Undo
      </button>
      <button
        type="button"
        className="undo-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
      <div className="undo-toast-progress" style={{ width: progress + "%" }} />
    </div>
  );
}
