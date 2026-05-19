"use client";

import { useEffect, useRef, useState } from "react";

const FOLDER_COLORS = [
  { key: "terracotta", oklch: "oklch(0.62 0.155 38)",  name: "Terracotta" },
  { key: "amber",      oklch: "oklch(0.65 0.13 75)",   name: "Amber" },
  { key: "moss",       oklch: "oklch(0.55 0.10 155)",  name: "Moss" },
  { key: "teal",       oklch: "oklch(0.58 0.09 200)",  name: "Teal" },
  { key: "cobalt",     oklch: "oklch(0.58 0.16 258)",  name: "Cobalt" },
  { key: "iris",       oklch: "oklch(0.58 0.18 290)",  name: "Iris" },
  { key: "rose",       oklch: "oklch(0.62 0.15 5)",    name: "Rose" },
  { key: "graphite",   oklch: "oklch(0.45 0.01 60)",   name: "Graphite" },
] as const;

const MAX_NAME = 48;

interface Props {
  open: boolean;
  onCancel: () => void;
  onCreate: (input: { name: string; color: string }) => void | Promise<void>;
  existingNames?: string[];
}

export default function NewFolderModal({
  open,
  onCancel,
  onCreate,
  existingNames = [],
}: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(FOLDER_COLORS[0].oklch);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setColor(FOLDER_COLORS[0].oklch);
      setSubmitting(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = name.trim();
  const dupe =
    trimmed.length > 0 &&
    existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !dupe && !submitting;

  const submit = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    try {
      await onCreate({ name: trimmed, color });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="nf-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="nf-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nf-title"
      >
        <header className="nf-head">
          <div>
            <h2 id="nf-title" className="nf-title">New folder</h2>
            <p className="nf-sub">
              Group your clips by show, topic, or skill level.
            </p>
          </div>
          <button
            type="button"
            className="nf-close"
            onClick={onCancel}
            aria-label="Close"
            title="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>

        <div className="nf-body">
          <div className="nf-preview">
            <span className="nf-preview-dot" style={{ color }} />
            <span className="nf-preview-name">
              {trimmed || (
                <em className="nf-preview-empty">Untitled folder</em>
              )}
            </span>
            <span className="nf-preview-count">0</span>
          </div>

          <label className="nf-field">
            <span className="nf-label">Name</span>
            <input
              ref={inputRef}
              className="nf-input"
              type="text"
              placeholder="e.g. The Office, Pronunciation drills"
              value={name}
              maxLength={MAX_NAME}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="nf-field-foot">
              {dupe ? (
                <span className="nf-error">
                  A folder with this name already exists.
                </span>
              ) : (
                <span className="nf-hint">
                  {trimmed.length}/{MAX_NAME}
                </span>
              )}
            </div>
          </label>

          <div className="nf-field">
            <span className="nf-label">Color</span>
            <div className="nf-swatches" role="radiogroup" aria-label="Folder color">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  className={
                    "nf-swatch" + (color === c.oklch ? " is-selected" : "")
                  }
                  style={{ color: c.oklch }}
                  title={c.name}
                  aria-label={c.name}
                  aria-checked={color === c.oklch}
                  onClick={() => setColor(c.oklch)}
                >
                  <span className="nf-swatch-dot" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className="nf-foot">
          <span className="nf-foot-hint">
            <kbd>Esc</kbd> to cancel · <kbd>↵</kbd> to create
          </span>
          <div className="nf-foot-actions">
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={submit}
              disabled={!canCreate}
            >
              {submitting ? "Creating…" : "Create folder"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
