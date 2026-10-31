/** A bounded word diff for reviewing an AI proposal before changing a Note. */
export interface DiffPart { text: string; changed: boolean }

export function noteWordDiff(before: string, after: string): { before: DiffPart[]; after: DiffPart[] } {
  const words = (value: string) => value.trim().split(/\s+/).filter(Boolean);
  const a = words(before), b = words(after);
  if (a.length > 300 || b.length > 300) {
    return {
      before: before ? [{ text: before, changed: true }] : [],
      after: after ? [{ text: after, changed: true }] : [],
    };
  }
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? 1 + lcs[i + 1][j + 1] : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const unchangedA = new Set<number>(), unchangedB = new Set<number>();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { unchangedA.add(i++); unchangedB.add(j++); }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  const parts = (items: string[], unchanged: Set<number>): DiffPart[] =>
    items.map((text, index) => ({ text: `${index ? " " : ""}${text}`, changed: !unchanged.has(index) }));
  return { before: parts(a, unchangedA), after: parts(b, unchangedB) };
}
