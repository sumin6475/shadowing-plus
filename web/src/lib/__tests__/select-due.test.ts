import { describe, it, expect } from "vitest";
import { selectDue, type DueCard } from "@/lib/bot/select-due";

const NOW = new Date("2026-07-14T09:00:00.000Z");

function card(p: Partial<DueCard> & { id: string }): DueCard {
  return {
    id: p.id,
    due_at: p.due_at ?? "2026-07-14T00:00:00.000Z",
    lapses: p.lapses ?? 0,
    created_at: p.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("selectDue", () => {
  it("returns only cards due at or before now", () => {
    const cards = [
      card({ id: "due", due_at: "2026-07-14T08:00:00.000Z" }),
      card({ id: "future", due_at: "2026-07-15T00:00:00.000Z" }),
    ];
    const out = selectDue(cards, NOW);
    expect(out.map((c) => c.id)).toEqual(["due"]);
  });

  it("orders most-overdue first", () => {
    const cards = [
      card({ id: "recent", due_at: "2026-07-14T08:00:00.000Z" }),
      card({ id: "oldest", due_at: "2026-07-10T00:00:00.000Z" }),
      card({ id: "mid", due_at: "2026-07-12T00:00:00.000Z" }),
    ];
    const out = selectDue(cards, NOW);
    expect(out.map((c) => c.id)).toEqual(["oldest", "mid", "recent"]);
  });

  it("breaks due_at ties by lapses desc", () => {
    const t = "2026-07-13T00:00:00.000Z";
    const cards = [
      card({ id: "few", due_at: t, lapses: 1 }),
      card({ id: "many", due_at: t, lapses: 5 }),
    ];
    const out = selectDue(cards, NOW);
    expect(out.map((c) => c.id)).toEqual(["many", "few"]);
  });

  it("breaks due_at + lapses ties by oldest bookmark first", () => {
    const t = "2026-07-13T00:00:00.000Z";
    const cards = [
      card({ id: "newer", due_at: t, lapses: 2, created_at: "2026-06-01T00:00:00.000Z" }),
      card({ id: "older", due_at: t, lapses: 2, created_at: "2026-01-01T00:00:00.000Z" }),
    ];
    const out = selectDue(cards, NOW);
    expect(out.map((c) => c.id)).toEqual(["older", "newer"]);
  });

  it("caps the batch at the limit", () => {
    const cards = Array.from({ length: 12 }, (_, i) =>
      card({ id: `c${i}`, due_at: `2026-07-${10 + (i % 4)}T00:00:00.000Z` }),
    );
    expect(selectDue(cards, NOW, 5)).toHaveLength(5);
  });

  it("returns empty for a non-positive limit", () => {
    expect(selectDue([card({ id: "x" })], NOW, 0)).toEqual([]);
  });

  it("drops cards with an unparseable due_at", () => {
    const cards = [
      card({ id: "ok" }),
      card({ id: "bad", due_at: "not-a-date" }),
    ];
    expect(selectDue(cards, NOW).map((c) => c.id)).toEqual(["ok"]);
  });
});
