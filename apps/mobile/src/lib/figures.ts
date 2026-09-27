/** Runs of figures ("11", "1:05", "3.5", "24/7") and the text between them.
 *  The display serif draws "1" exactly like "l" — "11 min" reads "ll min" —
 *  so these runs are drawn in a serif whose 1 is unambiguous. */
export function splitFigures(text: string): { text: string; figure: boolean }[] {
  return text
    .split(/(\d+(?:[.,:/]\d+)*)/)
    .filter(Boolean)
    .map((part) => ({ text: part, figure: /^\d/.test(part) }));
}
