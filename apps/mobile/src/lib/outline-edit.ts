// The note editor's list behaviour, as pure functions: what Return and
// Backspace do to an outline, and where the caret goes afterwards. It follows
// the bulleted lists of Notes and Reminders — Return splits a point, Return on
// an empty point leaves the list (here: moves on to the next section), and
// Backspace at the start of a point joins it to the one above.
import type { OutlineSection } from "./mvp-model";

export interface EditPoint {
  id: string;
  text: string;
}
export interface EditSection {
  heading: string | null;
  points: EditPoint[];
}
/** Where the caret goes after an edit. */
export interface Caret {
  id: string;
  at: number;
}
export interface Edit {
  sections: EditSection[];
  /** A point to move the caret to; null puts the keyboard away. */
  caret?: Caret | null;
}

/** Sections as the editor holds them: every point has an id, and every
 *  section has at least one point to type into. */
export const toEditable = (sections: OutlineSection[], newId: () => string): EditSection[] =>
  sections.map((s) => ({
    heading: s.heading,
    points: (s.points.length ? s.points : [""]).map((text) => ({ id: newId(), text })),
  }));
export const fromEditable = (sections: EditSection[]): OutlineSection[] =>
  sections.map((s) => ({ heading: s.heading, points: s.points.map((p) => p.text) }));

const locate = (sections: EditSection[], id: string) => {
  for (let s = 0; s < sections.length; s++) {
    const p = sections[s].points.findIndex((point) => point.id === id);
    if (p >= 0) return { s, p };
  }
  return null;
};
const withPoints = (sections: EditSection[], s: number, points: EditPoint[]) =>
  sections.map((section, i) => (i === s ? { ...section, points } : section));

/** New text for a point. Pasted line breaks become points of their own, with
 *  the caret after the last one. */
export function setPointText(
  sections: EditSection[],
  id: string,
  text: string,
  newId: () => string,
): Edit {
  const at = locate(sections, id);
  if (!at) return { sections };
  const points = sections[at.s].points;
  if (!text.includes("\n")) {
    return {
      sections: withPoints(
        sections,
        at.s,
        points.map((p) => (p.id === id ? { ...p, text } : p)),
      ),
    };
  }
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^\s*[-•]\s+/, "").trim())
    .filter(Boolean);
  if (!lines.length) return setPointText(sections, id, "", newId);
  const pasted = lines.map((line, i) => ({ id: i ? newId() : id, text: line }));
  const last = pasted[pasted.length - 1];
  return {
    sections: withPoints(sections, at.s, [
      ...points.slice(0, at.p),
      ...pasted,
      ...points.slice(at.p + 1),
    ]),
    caret: { id: last.id, at: last.text.length },
  };
}

/** Return at `caretAt`. In a point with text: split it there, and carry on in
 *  the new point below. In an empty point: leave the section for the next one
 *  (the empty point goes, unless it is the section's only one); after the last
 *  section there is nowhere to go, so the keyboard is put away. */
export function pressReturn(
  sections: EditSection[],
  id: string,
  caretAt: number,
  newId: () => string,
): Edit {
  const at = locate(sections, id);
  if (!at) return { sections };
  const points = sections[at.s].points;
  const point = points[at.p];
  if (!point.text.trim()) {
    const next = sections[at.s + 1];
    const kept = points.length > 1 ? points.filter((p) => p.id !== id) : points;
    const first = next?.points[0];
    return {
      sections: withPoints(sections, at.s, kept),
      caret: first ? { id: first.id, at: first.text.length } : null,
    };
  }
  const cut = Math.max(0, Math.min(caretAt, point.text.length));
  const below = { id: newId(), text: point.text.slice(cut) };
  return {
    sections: withPoints(sections, at.s, [
      ...points.slice(0, at.p),
      { ...point, text: point.text.slice(0, cut) },
      below,
      ...points.slice(at.p + 1),
    ]),
    caret: { id: below.id, at: 0 },
  };
}

/** Backspace with the caret at the very start of a point: join it to the
 *  point above, caret at the seam. The first point of a section has nothing
 *  above it — it only goes if it is empty and not the last one left. Returns
 *  null when Backspace has nothing to do. */
export function pressBackspaceAtStart(sections: EditSection[], id: string): Edit | null {
  const at = locate(sections, id);
  if (!at) return null;
  const points = sections[at.s].points;
  const point = points[at.p];
  if (at.p === 0) {
    if (point.text || points.length === 1) return null;
    return {
      sections: withPoints(sections, at.s, points.slice(1)),
      caret: { id: points[1].id, at: 0 },
    };
  }
  const above = points[at.p - 1];
  return {
    sections: withPoints(sections, at.s, [
      ...points.slice(0, at.p - 1),
      { ...above, text: above.text + point.text },
      ...points.slice(at.p + 1),
    ]),
    caret: { id: above.id, at: above.text.length },
  };
}

/** A point the caret has just left: an empty one is tidied away, unless it is
 *  the only point in its section (that one holds the placeholder). */
export function dropIfEmpty(sections: EditSection[], id: string): EditSection[] {
  const at = locate(sections, id);
  if (!at) return sections;
  const points = sections[at.s].points;
  if (points.length === 1 || points[at.p].text.trim()) return sections;
  return withPoints(
    sections,
    at.s,
    points.filter((p) => p.id !== id),
  );
}

/** Points that arrive from outside the keyboard (a draft from Ask). Each goes
 *  to the end of the section with its heading, taking the place of that
 *  section's empty placeholder point; a heading the note does not have yet is
 *  added as a new section at the end. Nothing already written is changed. */
export function appendPoints(
  sections: EditSection[],
  additions: OutlineSection[],
  newId: () => string,
): EditSection[] {
  let next = sections;
  for (const addition of additions) {
    const points = addition.points
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ id: newId(), text }));
    if (!points.length) continue;
    const at = next.findIndex((section) => section.heading === addition.heading);
    if (at < 0) {
      next = [...next, { heading: addition.heading, points }];
      continue;
    }
    next = withPoints(next, at, [...next[at].points.filter((p) => p.text.trim()), ...points]);
  }
  return next;
}
