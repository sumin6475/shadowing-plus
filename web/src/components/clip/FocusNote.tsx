"use client";

import { useEffect, useRef, useState } from "react";
import FocusList, { StarGlyph } from "@/components/focus/FocusList";
import { useWeakPoints } from "@/lib/useWeakPoints";

export default function FocusNote() {
  const { starred, loading, error, add, update, remove } = useWeakPoints();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const count = starred.length;
  const preview = starred.find((item) => !item.completed)?.text;

  return (
    <div className={"focus-note" + (open ? " is-open" : "")} ref={wrapRef}>
      <button
        type="button"
        className={"focus-note-chip" + (count > 0 ? " has-items" : "")}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Weak points you're focusing on"
      >
        <StarGlyph filled={count > 0} />
        <span className="focus-note-label">
          {count > 0 ? (preview ?? `${count} starred`) : "Focus notes"}
        </span>
        {count > 0 ? <span className="focus-note-count">{count}</span> : null}
      </button>
      {open && (
        <div className="focus-note-panel" role="dialog" aria-label="Focus notes">
          <div className="focus-note-head">
            Starred while you shadow
            <span>Star more on the Weak points page</span>
          </div>
          {error ? <p className="focus-note-error">{error}</p> : null}
          {loading && starred.length === 0 ? (
            <p className="wp-empty">Loading…</p>
          ) : (
            <FocusList
              items={starred}
              compact
              starOnAdd
              emptyLabel="Star a weak point to pin it here."
              onAdd={add}
              onUpdate={update}
              onDelete={remove}
            />
          )}
        </div>
      )}
    </div>
  );
}
