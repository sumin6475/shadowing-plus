"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { PracticeStatus } from "@/lib/types";
import { CheckIcon, CircleDashedIcon } from "./Icons";

export const STATUS_LABEL: Record<Exclude<PracticeStatus, "none">, string> = {
  focusing: "Focusing",
  done: "Completed",
};

interface Option {
  key: PracticeStatus;
  label: string;
  desc: string;
}

const OPTIONS: Option[] = [
  { key: "focusing", label: "Focusing", desc: "Working on this now" },
  { key: "done", label: "Completed", desc: "Finished practicing" },
  { key: "none", label: "Not started", desc: "Clear status" },
];

function StatusGlyph({ status }: { status: PracticeStatus }) {
  if (status === "focusing") return <span className="status-dot" aria-hidden="true" />;
  if (status === "done") return <CheckIcon />;
  return <CircleDashedIcon />;
}

interface Props {
  status: PracticeStatus;
  onSet: (next: PracticeStatus) => void;
  // "row" hides the "Set status" affordance until the row hovers; "static"
  // keeps it visible (used in the clip-page header).
  variant?: "row" | "static";
}

export default function StatusControl({ status, onSet, variant = "row" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: globalThis.MouseEvent) {
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

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((o) => !o);
  };
  const pick = (e: MouseEvent, key: PracticeStatus) => {
    e.preventDefault();
    e.stopPropagation();
    onSet(key);
    setOpen(false);
  };

  const isSet = status === "focusing" || status === "done";
  const triggerCls =
    (isSet ? "status-pill " + status : "status-set") +
    (variant === "static" ? " status-set--static" : "") +
    (open ? " is-open" : "");

  return (
    <div className="status-control" ref={wrapRef}>
      <button
        type="button"
        className={triggerCls}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Set status"
      >
        <StatusGlyph status={status} />
        <span>{isSet ? STATUS_LABEL[status] : "Set status"}</span>
      </button>
      {open && (
        <div className="status-menu" role="menu" onClick={(e) => e.stopPropagation()}>
          <div className="status-menu-head">Practice status</div>
          {OPTIONS.map((opt) => {
            const selected = (status || "none") === opt.key;
            const cls =
              "status-opt" +
              (selected ? " selected" : "") +
              (opt.key === "none" ? " clear" : "");
            return (
              <button
                key={opt.key}
                type="button"
                className={cls}
                role="menuitemradio"
                aria-checked={selected}
                onClick={(e) => pick(e, opt.key)}
              >
                <span className={"status-opt-glyph " + opt.key}>
                  <StatusGlyph status={opt.key} />
                </span>
                <span className="status-opt-text">
                  <span className="status-opt-label">{opt.label}</span>
                  <span className="status-opt-desc">{opt.desc}</span>
                </span>
                {selected && (
                  <span className="status-opt-check">
                    <CheckIcon width="13" height="13" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
