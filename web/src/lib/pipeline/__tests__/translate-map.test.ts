import { describe, it, expect } from "vitest";
import {
  TRANSLATION_FAILED,
  mapBatchTranslations,
  translationNeedsRetry,
  visibleTranslation,
  packTranslateBatches,
} from "../translate-map";

describe("mapBatchTranslations", () => {
  it("keeps later lines aligned when the model drops an entry", () => {
    const items = [
      { n: 1, translation: "하나" },
      { n: 3, translation: "셋" },
    ];
    expect(mapBatchTranslations(items, 3)).toEqual([
      "하나",
      TRANSLATION_FAILED,
      "셋",
    ]);
  });

  it("falls back to position when n is omitted", () => {
    const items = [{ translation: "가" }, { translation: "나" }];
    expect(mapBatchTranslations(items, 2)).toEqual(["가", "나"]);
  });

  it("treats empty strings as missing", () => {
    expect(mapBatchTranslations([{ n: 1, translation: "  " }], 1)).toEqual([
      TRANSLATION_FAILED,
    ]);
  });
});

describe("translationNeedsRetry", () => {
  it("retries empty, whitespace, and the failure sentinel", () => {
    expect(translationNeedsRetry("Hello there.", "")).toBe(true);
    expect(translationNeedsRetry("Hello there.", "   ")).toBe(true);
    expect(translationNeedsRetry("Hello there.", null)).toBe(true);
    expect(translationNeedsRetry("Hello there.", TRANSLATION_FAILED)).toBe(true);
  });

  it("does not retry a short complete line", () => {
    expect(translationNeedsRetry("Yeah.", "그래.")).toBe(false);
  });

  it("retries a long source whose translation is far too short to cover it", () => {
    const source =
      "And I think that's true with all, all leadership, but I think especially on the AI team, almost all of our best ideas come from prototypes, from people that have a cool idea because they saw a user problem, and it's a huge disservice if all of those ideas have to pass, like, the sniff test of what me and a product partner or Simon and Ivan decided were the direction, right?";
    const truncated =
      "이건 모든 리더십에 해당하는 사실인데, 특히 AI 팀에서는 거의 모든 좋은 아이디어가 프로토타입에서 나오고, 사용자 문제를 보고 멋진 아이디어를 가진 사람들한테서 나온다는 점이야.";
    expect(source.length).toBeGreaterThan(180);
    expect(translationNeedsRetry(source, truncated)).toBe(true);
  });
});

describe("visibleTranslation", () => {
  it("hides empty and the failure sentinel", () => {
    expect(visibleTranslation(null)).toBeNull();
    expect(visibleTranslation("")).toBeNull();
    expect(visibleTranslation(TRANSLATION_FAILED)).toBeNull();
    expect(visibleTranslation("경로")).toBe("경로");
  });
});

describe("packTranslateBatches", () => {
  it("caps by count", () => {
    expect(packTranslateBatches([10, 10, 10, 10], 2, 10_000)).toEqual([
      { start: 0, count: 2 },
      { start: 2, count: 2 },
    ]);
  });

  it("splits when the char budget would be exceeded, but never leaves a line behind", () => {
    expect(packTranslateBatches([100, 100, 2700], 20, 2800)).toEqual([
      { start: 0, count: 2 },
      { start: 2, count: 1 },
    ]);
    expect(packTranslateBatches([5000], 20, 2800)).toEqual([{ start: 0, count: 1 }]);
  });
});
