import { describe, expect, it } from "vitest";
import {
  buildTranscriptExport,
  formatExportTime,
  slugFilename,
  transcriptToMarkdown,
} from "../transcript-export";

const segments = [
  { start_time: 12, text: "Hello, how are you?", translation: "안녕하세요?" },
  { start_time: 78.4, text: "I'm well.", translation: null },
];

describe("formatExportTime", () => {
  it("formats m:ss including minutes past 59", () => {
    expect(formatExportTime(0)).toBe("0:00");
    expect(formatExportTime(12)).toBe("0:12");
    expect(formatExportTime(78.4)).toBe("1:18");
    expect(formatExportTime(90 * 60)).toBe("90:00");
  });

  it("guards bad numbers", () => {
    expect(formatExportTime(-3)).toBe("0:00");
    expect(formatExportTime(Number.NaN)).toBe("0:00");
  });
});

describe("slugFilename", () => {
  it("slugifies mixed titles and keeps letters", () => {
    expect(slugFilename(" Ted Talk: Hello ")).toBe("ted-talk-hello");
    expect(slugFilename("영어 연습 01")).toBe("영어-연습-01");
  });

  it("falls back when nothing remains", () => {
    expect(slugFilename("   ")).toBe("transcript");
    expect(slugFilename("!!!")).toBe("transcript");
  });
});

describe("transcriptToMarkdown", () => {
  it("writes a bilingual transcript by default", () => {
    const md = transcriptToMarkdown({
      title: "Clip One",
      targetLang: "Korean",
      includeTranslation: true,
      segments,
    });
    expect(md).toBe(
      [
        "# Clip One",
        "",
        "English → Korean",
        "",
        "[0:12]",
        "Hello, how are you?",
        "안녕하세요?",
        "",
        "[1:18]",
        "I'm well.",
        "",
      ].join("\n"),
    );
  });

  it("omits translation lines when English only", () => {
    const md = transcriptToMarkdown({
      title: "Clip One",
      targetLang: "Korean",
      includeTranslation: false,
      segments,
    });
    expect(md).toContain("English\n");
    expect(md).not.toContain("English →");
    expect(md).not.toContain("안녕하세요?");
  });
});

describe("buildTranscriptExport", () => {
  it("uses Untitled clip and Korean when labels are blank", () => {
    const doc = buildTranscriptExport({
      title: "  ",
      targetLang: "",
      includeTranslation: true,
      segments: [],
    });
    expect(doc.title).toBe("Untitled clip");
    expect(doc.languageLine).toBe("English → Korean");
  });
});
