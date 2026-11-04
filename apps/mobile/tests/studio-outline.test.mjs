import test from "node:test";
import assert from "node:assert/strict";
import { parseOutline, serializeOutline, outlinePoints, isBlankNote } from "../src/lib/mvp-model.ts";
import { speakingSections, toEditable, fromEditable, movePoint, setPointText, pressReturn, pressBackspaceAtStart, dropIfEmpty, appendPoints, outlineDropTarget } from "../src/lib/outline-edit.ts";

let sequence = 0;
const id = () => String(++sequence);
const edit = body => toEditable(speakingSections(parseOutline(body)), id);

test("legacy notes keep all text and gain the four speaking sections", () => {
  const sections = speakingSections(parseOutline("Unsorted idea\n\nOpening\n- First point\n  > A personal example"));
  assert.deepEqual(sections.map(s => s.heading), ["Opening", "Body", "Closing", "Others"]);
  assert.deepEqual(sections[3].points, ["Unsorted idea"]);
  assert.equal(sections[0].notes[0], "A personal example");
});

test("point notes round-trip as details, including blank lines and heading-like text", () => {
  const source = [{ heading: "Body", points: ["Explain the idea", "A second point"], notes: ["내가 말하고 싶은 것\n\nOpening\n- a literal example", "Another detail"] }];
  const stored = serializeOutline(source);
  assert.deepEqual(parseOutline(stored), source);
  assert.deepEqual(outlinePoints(stored.split("\n")).map(p => p.text), source[0].points);
});

test("a note with only bullet detail is not discarded as blank", () => {
  const stored = serializeOutline([{ heading: "Others", points: [""], notes: ["An idea I haven't named yet"] }]);
  assert.equal(isBlankNote("", stored), false);
  assert.deepEqual(parseOutline(stored)[0].notes, ["An idea I haven't named yet"]);
});

test("dragging a point across sections carries its detail and stable editor id", () => {
  const sections = edit("Opening\n- First\n  > First detail\n- Second\n\nBody\n- Main");
  const point = sections[0].points[0];
  const moved = movePoint(sections, point.id, 1, 1, id);
  assert.equal(moved[1].points[1].id, point.id);
  assert.equal(moved[1].points[1].note, "First detail");
  assert.deepEqual(moved[0].points.map(p => p.text), ["Second"]);
  assert.equal(parseOutline(serializeOutline(fromEditable(moved)))[1].notes[1], "First detail");
});

test("reordering within a section uses the destination after removal", () => {
  const sections = edit("Body\n- One\n- Two\n- Three");
  const moved = movePoint(sections, sections[1].points[0].id, 1, 2, id);
  assert.deepEqual(moved[1].points.map(p => p.text), ["Two", "Three", "One"]);
});

test("Return before a title keeps its detail with that title", () => {
  const sections = edit("Body\n- Main idea\n  > Supporting example");
  const split = pressReturn(sections, sections[1].points[0].id, 0, id);
  assert.equal(split.sections[1].points[0].note, undefined);
  assert.equal(split.sections[1].points[1].text, "Main idea");
  assert.equal(split.sections[1].points[1].note, "Supporting example");
  assert.equal(split.caret.id, split.sections[1].points[1].id);
});

test("moving the only point preserves a source placeholder; empty target placeholders are replaced", () => {
  const sections = edit("Opening\n- Intro\n  > Detail");
  const moved = movePoint(sections, sections[0].points[0].id, 3, 0, id);
  assert.deepEqual(moved[0].points.map(p => p.text), [""]);
  assert.deepEqual(moved[3].points.map(p => p.text), ["Intro"]);
  assert.equal(moved[3].points[0].note, "Detail");
});

test("paste, join, blur and append preserve detail instead of silently deleting it", () => {
  let sections = edit("Body\n- First\n  > Detail one\n- Second\n  > Detail two");
  const first = sections[1].points[0].id;
  sections = setPointText(sections, first, "First\nA pasted point", id).sections;
  assert.equal(sections[1].points[0].note, "Detail one");
  const second = sections[1].points[2].id;
  sections = pressBackspaceAtStart(sections, second).sections;
  assert.equal(sections[1].points[1].note, "Detail two");
  sections = setPointText(sections, first, "", id).sections;
  assert.equal(dropIfEmpty(sections, first)[1].points[0].note, "Detail one");
  assert.equal(pressBackspaceAtStart(sections, first), null);
  const appended = appendPoints(sections, [{ heading: "Closing", points: ["Finish"], notes: ["End on a question"] }], id);
  assert.equal(appended[2].points[0].note, "End on a question");
});

test("drop targets ignore the lifted row and allow dropping into empty or collapsed sections", () => {
  const layout = [
    { section: 0, y: 0, height: 120, rows: [{ id: "a", y: 40, height: 40 }, { id: "b", y: 80, height: 40 }] },
    { section: 1, y: 120, height: 80, rows: [] },
    { section: 2, y: 200, height: 50, rows: [] },
  ];
  assert.deepEqual(outlineDropTarget(layout, 110, "a"), { section: 0, index: 1 });
  assert.deepEqual(outlineDropTarget(layout, 155, "a"), { section: 1, index: 0 });
  assert.deepEqual(outlineDropTarget(layout, 500, "a"), { section: 2, index: 0 });
});
