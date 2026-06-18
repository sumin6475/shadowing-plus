"use client";

import { useEffect, useRef, useState } from "react";
import type { Video } from "@/lib/types";
import { PencilIcon, TrashIcon } from "./Icons";

type Step = "menu" | "rename" | "confirm-delete";

interface Props {
  target: Video | null;
  onClose: () => void;
  onRename: (videoId: string, title: string) => void;
  onDelete: (video: Video) => void;
}

export default function MobileClipSheet({
  target,
  onClose,
  onRename,
  onDelete,
}: Props) {
  const open = !!target;
  const [step, setStep] = useState<Step>("menu");
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset to the menu and reseed the rename field whenever a new clip opens
  // (and clear the marker on close so reopening the same clip resets too).
  // Adjusting state during render is React's sanctioned alternative to an
  // effect here — see https://react.dev/learn/you-might-not-need-an-effect.
  const [seededId, setSeededId] = useState<string | null>(null);
  const curId = target?.id ?? null;
  if (curId !== seededId) {
    setSeededId(curId);
    if (target) {
      setStep("menu");
      setTitle(target.title);
    }
  }

  // Focus the rename field once it's on screen.
  useEffect(() => {
    if (step === "rename") {
      const t = setTimeout(() => inputRef.current?.select(), 60);
      return () => clearTimeout(t);
    }
  }, [step]);

  const saveRename = () => {
    if (!target) return;
    const trimmed = title.trim();
    if (trimmed && trimmed !== target.title) onRename(target.id, trimmed);
    onClose();
  };

  const confirmDelete = () => {
    if (target) onDelete(target);
    onClose();
  };

  return (
    <>
      <div
        className={"m-sheet-backdrop" + (open ? " is-open" : "")}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        className={"m-sheet" + (open ? " is-open" : "")}
        role="dialog"
        aria-modal="true"
        aria-label="Clip options"
      >
        <div className="m-sheet-grip" />

        {step === "menu" && (
          <>
            <div className="m-sheet-title">Clip</div>
            {target && <div className="m-sheet-sub">{target.title}</div>}
            <div className="m-sheet-opts">
              <button
                type="button"
                className="m-sheet-opt"
                onClick={() => setStep("rename")}
              >
                <span className="m-sheet-opt-glyph none">
                  <PencilIcon />
                </span>
                <span className="m-sheet-opt-text">
                  <span className="m-sheet-opt-label">Rename</span>
                  <span className="m-sheet-opt-desc">Change the clip title</span>
                </span>
              </button>
              <button
                type="button"
                className="m-sheet-opt danger"
                onClick={() => setStep("confirm-delete")}
              >
                <span className="m-sheet-opt-glyph danger">
                  <TrashIcon />
                </span>
                <span className="m-sheet-opt-text">
                  <span className="m-sheet-opt-label">Delete clip</span>
                  <span className="m-sheet-opt-desc">
                    Removes the clip, transcript &amp; bookmarks
                  </span>
                </span>
              </button>
            </div>
          </>
        )}

        {step === "rename" && (
          <>
            <div className="m-sheet-title">Rename clip</div>
            <input
              ref={inputRef}
              className="m-sheet-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveRename();
                }
              }}
              placeholder="Clip title"
              aria-label="Clip title"
            />
            <div className="m-sheet-actions">
              <button
                type="button"
                className="m-sheet-btn ghost"
                onClick={() => setStep("menu")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="m-sheet-btn primary"
                onClick={saveRename}
                disabled={!title.trim()}
              >
                Save
              </button>
            </div>
          </>
        )}

        {step === "confirm-delete" && (
          <>
            <div className="m-sheet-title">Delete clip?</div>
            {target && <div className="m-sheet-sub">{target.title}</div>}
            <p className="m-sheet-warn">
              This removes the clip and everything you&apos;ve built around it —
              the transcript, bookmarks, and practice progress.
            </p>
            <div className="m-sheet-actions">
              <button
                type="button"
                className="m-sheet-btn ghost"
                onClick={() => setStep("menu")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="m-sheet-btn danger"
                onClick={confirmDelete}
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
