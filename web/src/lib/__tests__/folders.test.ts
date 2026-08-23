import { describe, expect, it } from "vitest";
import { nextFolderPosition, reorderFolders, sortFolders } from "../folders";
import type { Folder } from "../types";

function folder(partial: Partial<Folder> & Pick<Folder, "id">): Folder {
  return {
    name: partial.name ?? partial.id,
    position: partial.position ?? 0,
    color: partial.color ?? null,
    created_at: partial.created_at ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("sortFolders", () => {
  it("sorts by position then created_at", () => {
    const rows = [
      folder({ id: "b", position: 0, created_at: "2026-01-02T00:00:00.000Z" }),
      folder({ id: "a", position: 0, created_at: "2026-01-01T00:00:00.000Z" }),
      folder({ id: "c", position: 2 }),
    ];
    expect(sortFolders(rows).map((f) => f.id)).toEqual(["a", "b", "c"]);
  });
});

describe("reorderFolders", () => {
  it("moves an item and reindexes positions", () => {
    const rows = [
      folder({ id: "a", position: 0 }),
      folder({ id: "b", position: 1 }),
      folder({ id: "c", position: 2 }),
    ];
    const next = reorderFolders(rows, "c", "a");
    expect(next.map((f) => f.id)).toEqual(["c", "a", "b"]);
    expect(next.map((f) => f.position)).toEqual([0, 1, 2]);
  });

  it("is a no-op when ids match, still reindexes", () => {
    const rows = [
      folder({ id: "a", position: 4 }),
      folder({ id: "b", position: 9 }),
    ];
    const next = reorderFolders(rows, "a", "a");
    expect(next.map((f) => f.position)).toEqual([0, 1]);
  });
});

describe("nextFolderPosition", () => {
  it("returns 0 for an empty list", () => {
    expect(nextFolderPosition([])).toBe(0);
  });
});
