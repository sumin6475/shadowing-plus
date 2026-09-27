import type { Segment } from "@/lib/types";
import { formatExportTime } from "@/lib/transcript-export";

interface Props {
  title: string;
  targetLang: string;
  includeTranslation: boolean;
  segments: Segment[];
}

export default function TranscriptPrint({
  title,
  targetLang,
  includeTranslation,
  segments,
}: Props) {
  return (
    <article className="transcript-print" aria-hidden>
      <h1>{title.trim() || "Untitled clip"}</h1>
      <p className="transcript-print-meta">
        {includeTranslation ? `English → ${targetLang}` : "English"}
      </p>
      {segments.map((seg) => (
        <section key={seg.id} className="transcript-print-line">
          <time>{formatExportTime(seg.start_time)}</time>
          <p className="transcript-print-en">{seg.text}</p>
          {includeTranslation && seg.translation ? (
            <p className="transcript-print-tr">{seg.translation}</p>
          ) : null}
        </section>
      ))}
    </article>
  );
}
