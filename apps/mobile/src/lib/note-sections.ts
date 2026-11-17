// note-sections.ts — which part of a talk a note point belongs to.
//
// A speaking note is read as opening → body → closing, and the cue card colors
// each point by that part so the learner can tell where they are at a glance.
// Section headings are free text, so the part comes from the heading's name
// when it says so, and from the section's position otherwise.

export type SectionTone = "opening" | "body" | "closing";

const OPENING = /^(opening|open|intro|introduction|hook|start|beginning)\b/i;
const BODY = /^(body|main|middle|points?|details?)\b/i;
const CLOSING = /^(closing|close|conclusion|outro|wrap[\s-]?up|ending|end|summary)\b/i;

/** One tone per point, or null for a point with no section heading. */
export function sectionTones(points: readonly { section: string | null }[]): (SectionTone | null)[] {
  // Sections in the order they appear; the same heading used twice is two sections.
  const starts: number[] = [];
  points.forEach((p, i) => {
    if (p.section && (i === 0 || points[i - 1].section !== p.section)) starts.push(i);
  });
  let run = -1;
  return points.map((p, i) => {
    if (!p.section) return null;
    if (starts.includes(i)) run++;
    const name = p.section.trim();
    if (OPENING.test(name)) return "opening";
    if (CLOSING.test(name)) return "closing";
    if (BODY.test(name)) return "body";
    if (starts.length === 1) return "body";
    return run === 0 ? "opening" : run === starts.length - 1 ? "closing" : "body";
  });
}
