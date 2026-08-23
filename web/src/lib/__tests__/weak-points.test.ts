import { describe, expect, it } from "vitest";
import {
  groupWeakPoints,
  nextWeakPointPosition,
  normalizeCategory,
  sortWeakPoints,
  starredWeakPoints,
  type WeakPoint,
} from "../weak-points";

function wp(partial: Partial<WeakPoint> & Pick<WeakPoint, "id">): WeakPoint {
  return {
    text: partial.text ?? partial.id,
    category: partial.category ?? null,
    completed: partial.completed ?? false,
    starred: partial.starred ?? false,
    position: partial.position ?? 0,
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("sortWeakPoints", () => {
  it("puts incomplete starred items first, completed last", () => {
    const rows = [
      wp({ id: "done", completed: true, position: 0 }),
      wp({ id: "plain", position: 1 }),
      wp({ id: "star", starred: true, position: 2 }),
    ];
    expect(sortWeakPoints(rows).map((r) => r.id)).toEqual(["star", "plain", "done"]);
  });
});

describe("starredWeakPoints", () => {
  it("keeps starred completed items so the player note can uncheck them", () => {
    const rows = [
      wp({ id: "a", starred: true, completed: true }),
      wp({ id: "b", starred: false }),
      wp({ id: "c", starred: true }),
    ];
    expect(starredWeakPoints(rows).map((r) => r.id)).toEqual(["c", "a"]);
  });
});

describe("groupWeakPoints", () => {
  it("groups by category and parks uncategorized last", () => {
    const groups = groupWeakPoints([
      wp({ id: "1", category: "sounds" }),
      wp({ id: "2", category: null }),
      wp({ id: "3", category: "R's" }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["R's", "sounds", null]);
  });
});

describe("normalizeCategory / nextWeakPointPosition", () => {
  it("trims empty category to null and caps length", () => {
    expect(normalizeCategory("  ")).toBeNull();
    expect(normalizeCategory("  sounds ")).toBe("sounds");
    expect(normalizeCategory("x".repeat(50))?.length).toBe(40);
  });

  it("returns max position + 1", () => {
    expect(nextWeakPointPosition([])).toBe(0);
    expect(nextWeakPointPosition([wp({ id: "a", position: 2 }), wp({ id: "b", position: 5 })])).toBe(6);
  });
});
