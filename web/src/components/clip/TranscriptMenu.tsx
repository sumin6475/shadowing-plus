"use client";

import { useEffect, useRef, useState } from "react";
import type { Segment } from "@/lib/types";
import {
  downloadTextFile,
  slugFilename,
  transcriptToMarkdown,
} from "@/lib/transcript-export";
import { DotsIcon } from "./Icons";

interface Props {
  title: string;
  targetLang: string;
  segments: Segment[];
  englishOnly: boolean;
  onEnglishOnlyChange: (next: boolean) => void;
  variant?: "desktop" | "mobile";
}

export default function TranscriptMenu({
  title,
  targetLang,
  segments,
  englishOnly,
  onEnglishOnlyChange,
  variant = "desktop",
}: Props) {
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

  const exportOpts = {
    title,
    targetLang,
    includeTranslation: !englishOnly,
    segments,
  };

  const downloadMarkdown = () => {
    const markdown = transcriptToMarkdown(exportOpts);
    downloadTextFile(
      `${slugFilename(title)}-transcript.md`,
      markdown,
      "text/markdown;charset=utf-8",
    );
    setOpen(false);
  };

  const printPdf = () => {
    setOpen(false);
    window.setTimeout(() => window.print(), 50);
  };

  return (
    <div
      className={"transcript-more" + (variant === "mobile" ? " is-mobile" : "")}
      ref={wrapRef}
    >
      <button
        type="button"
        title="Download transcript"
        aria-label="Download transcript"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {variant === "mobile" ? "Export" : <DotsIcon />}
      </button>
      {open && (
        <div className="transcript-more-menu" role="menu">
          <button type="button" role="menuitem" onClick={downloadMarkdown}>
            Markdown
          </button>
          <button type="button" role="menuitem" onClick={printPdf}>
            PDF
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={englishOnly}
            className={englishOnly ? "is-active" : ""}
            onClick={() => onEnglishOnlyChange(!englishOnly)}
          >
            English only
          </button>
        </div>
      )}
    </div>
  );
}
