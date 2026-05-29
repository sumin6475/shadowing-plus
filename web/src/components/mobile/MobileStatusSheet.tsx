"use client";

import type { PracticeStatus } from "@/lib/types";
import { CheckIcon, CircleDashedIcon } from "@/components/home/Icons";

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

interface Target {
  id: string;
  title: string;
  status: PracticeStatus;
}

interface Props {
  target: Target | null;
  onPick: (next: PracticeStatus) => void;
  onClose: () => void;
}

function Glyph({ status }: { status: PracticeStatus }) {
  if (status === "focusing") return <span className="status-dot" aria-hidden="true" />;
  if (status === "done") return <CheckIcon width="13" height="13" />;
  return <CircleDashedIcon width="14" height="14" />;
}

export default function MobileStatusSheet({ target, onPick, onClose }: Props) {
  const open = !!target;
  const current: PracticeStatus = target?.status ?? "none";

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
        aria-label="Practice status"
      >
        <div className="m-sheet-grip" />
        <div className="m-sheet-title">Practice status</div>
        {target && <div className="m-sheet-sub">{target.title}</div>}
        <div className="m-sheet-opts">
          {OPTIONS.map((opt) => {
            const selected = current === opt.key;
            const cls =
              "m-sheet-opt" +
              (selected ? " selected" : "") +
              (opt.key === "none" ? " clear" : "");
            return (
              <button
                key={opt.key}
                type="button"
                className={cls}
                onClick={() => onPick(opt.key)}
              >
                <span className={"m-sheet-opt-glyph " + opt.key}>
                  <Glyph status={opt.key} />
                </span>
                <span className="m-sheet-opt-text">
                  <span className="m-sheet-opt-label">{opt.label}</span>
                  <span className="m-sheet-opt-desc">{opt.desc}</span>
                </span>
                {selected && (
                  <span className="m-sheet-opt-check">
                    <CheckIcon width="14" height="14" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
