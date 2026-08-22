export type ExportSegment = {
  start_time: number;
  text: string;
  translation: string | null;
};

export type TranscriptExportDoc = {
  title: string;
  languageLine: string;
  lines: Array<{
    timestamp: string;
    text: string;
    translation: string | null;
  }>;
};

/** `m:ss` (minutes may exceed 59 on long clips). */
export function formatExportTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function slugFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "transcript";
}

export function buildTranscriptExport(opts: {
  title: string;
  targetLang: string;
  includeTranslation: boolean;
  segments: ExportSegment[];
}): TranscriptExportDoc {
  const title = opts.title.trim() || "Untitled clip";
  const target = opts.targetLang.trim() || "Korean";
  return {
    title,
    languageLine: opts.includeTranslation ? `English → ${target}` : "English",
    lines: opts.segments.map((seg) => ({
      timestamp: formatExportTime(seg.start_time),
      text: seg.text.trim(),
      translation:
        opts.includeTranslation && seg.translation?.trim()
          ? seg.translation.trim()
          : null,
    })),
  };
}

export function transcriptToMarkdown(opts: {
  title: string;
  targetLang: string;
  includeTranslation: boolean;
  segments: ExportSegment[];
}): string {
  const doc = buildTranscriptExport(opts);
  const parts = [`# ${doc.title}`, "", doc.languageLine, ""];
  for (const line of doc.lines) {
    parts.push(`[${line.timestamp}]`, line.text);
    if (line.translation) parts.push(line.translation);
    parts.push("");
  }
  return parts.join("\n").trimEnd() + "\n";
}

export function downloadTextFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
