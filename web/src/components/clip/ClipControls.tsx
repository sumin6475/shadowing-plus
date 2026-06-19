"use client";

import { useEffect, useRef, useState } from "react";
import type { LoopMode } from "@/lib/types";
import { NextIcon, PrevIcon, ReplayIcon } from "./Icons";

interface Props {
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
  abActive: boolean;
  onToggleAB: () => void;
  loopMode: LoopMode;
  onToggleLoop: () => void;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  speed: number;
  speeds: readonly number[];
  onSelectSpeed: (s: number) => void;
}

function formatSpeed(s: number): string {
  return s.toFixed(2).replace(/\.?0+$/, "") + "×";
}

function SpeedMenu({
  speed,
  speeds,
  onSelect,
}: {
  speed: number;
  speeds: readonly number[];
  onSelect: (s: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="speed-wrap" ref={wrapRef}>
      <button
        type="button"
        className={"ctl speed-btn" + (open ? " is-open" : "")}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Playback speed"
      >
        {formatSpeed(speed)}
        <svg
          className="speed-caret"
          width="9"
          height="6"
          viewBox="0 0 9 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l3.5 3.5L8 1" />
        </svg>
      </button>
      {open && (
        <div className="speed-menu" role="listbox">
          <div className="speed-menu-head">Speed</div>
          {speeds.map((s) => {
            const isActive = Math.abs(s - speed) < 0.001;
            const isNormal = Math.abs(s - 1.0) < 0.001;
            return (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={isActive}
                className={"speed-opt" + (isActive ? " is-active" : "")}
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
              >
                <span className="speed-opt-check" aria-hidden="true">
                  {isActive ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 6.2l2.4 2.4L9.8 3.5" />
                    </svg>
                  ) : null}
                </span>
                <span className="speed-opt-val">{formatSpeed(s)}</span>
                {isNormal && <span className="speed-opt-tag">Normal</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClipControls({
  onPrev,
  onNext,
  onReplay,
  abActive,
  onToggleAB,
  loopMode,
  onToggleLoop,
  showTranslation,
  onToggleTranslation,
  speed,
  speeds,
  onSelectSpeed,
}: Props) {
  return (
    <div className="controls">
      <div className="control-bar" role="toolbar">
        <button type="button" className="ctl" onClick={onPrev}>
          <PrevIcon />
          <span className="key">A</span>
        </button>
        <button type="button" className="ctl primary" onClick={onReplay}>
          <ReplayIcon />
          <span>Shadow line</span>
          <span className="key">S</span>
        </button>
        <button type="button" className="ctl" onClick={onNext}>
          <span className="key">D</span>
          <NextIcon />
        </button>

        <div className="ctl-sep" />

        <button
          type="button"
          className={"ctl toggle" + (showTranslation ? " active" : "")}
          onClick={onToggleTranslation}
        >
          <span>Trans</span>
          <span className="key">T</span>
        </button>
        <button
          type="button"
          className={"ctl toggle" + (abActive ? " active" : "")}
          onClick={onToggleAB}
        >
          <span>A–B</span>
          <span className="key">R</span>
        </button>
        <button
          type="button"
          className={"ctl toggle" + (loopMode !== "off" ? " active" : "")}
          onClick={onToggleLoop}
          title="Loop: off → whole clip → current sentence"
        >
          <span>{loopMode === "sentence" ? "Loop line" : "Loop"}</span>
          <span className="key">L</span>
        </button>

        <div className="ctl-sep" />

        <SpeedMenu speed={speed} speeds={speeds} onSelect={onSelectSpeed} />
      </div>

      <div className="shortcuts">
        <span><b>Space</b> Play / Pause</span>
        <span><b>← →</b> Skip 3s</span>
        <span><b>R</b> AB Repeat</span>
        <span><b>L</b> Loop clip / line</span>
      </div>
    </div>
  );
}
