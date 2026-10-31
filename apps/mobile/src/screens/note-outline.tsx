// note-outline.tsx — the writing surface of a Studio note.
//
// A note body is an outline: Opening / Body / Closing, each a list of points.
// Each section is a card and each point its own input, so a long point wraps
// under its own text, not under the bullet, and the list keys work the way
// they do in Notes and Reminders (see lib/outline-edit): Return starts the
// next point, Return on an empty point moves to the next section, Backspace at
// the start of a point joins it to the one above.
//
// The body is read once. Edits go up as a whole new body string in the stored
// shape ("Opening\n- point\n…"), so saving, drafts and the mirror's outline
// card don't know this editor exists.
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { Keyboard, Pressable, useWindowDimensions, View } from "react-native";
import { Text, TextInput } from "@/design/text";
import { FONT } from "@/design/mobile-tokens";
import { useTheme } from "@/design/theme";
import { parseOutline, serializeOutline, type OutlineSection } from "@/lib/mvp";
import {
  appendPoints,
  dropIfEmpty,
  fromEditable,
  pressBackspaceAtStart,
  pressReturn,
  setPointText,
  toEditable,
  type Caret,
  type Edit,
} from "@/lib/outline-edit";

const HINT: Record<string, string> = {
  Opening: "How you’ll start",
  Body: "The points you want to make",
  Closing: "How you’ll wrap up",
};
const FONT_SIZE = 17;
const LINE = 24;
const PAD = 7;

let seq = 0;
const newId = () => `p${++seq}`;

export interface NoteOutlineHandle {
  /** Puts the caret in the first point — where Return in the title goes. */
  focusStart: () => void;
  /** Adds points under their headings, after what is already written (a
   *  draft from Ask). Goes through the same path as typing, so it autosaves. */
  append: (sections: OutlineSection[]) => void;
}

export function NoteOutline({
  body,
  onChangeBody,
  ref,
}: {
  /** The body to start from. Read once: give another note another `key`. */
  body: string;
  onChangeBody: (body: string) => void;
  ref?: Ref<NoteOutlineHandle>;
}) {
  const t = useTheme();
  const { fontScale } = useWindowDimensions();
  const [start] = useState(() => {
    const parsed = parseOutline(body);
    return { sections: toEditable(parsed, newId), body: serializeOutline(parsed) };
  });
  const [sections, setSections] = useState(start.sections);
  // Handlers read and write `live`, not the rendered state: a key press and
  // the text change after it can both arrive before React renders once.
  const live = useRef(start.sections);
  const emitted = useRef(start.body);
  const inputs = useRef(new Map<string, TextInput>());
  const selections = useRef(new Map<string, { start: number; end: number }>());
  const pending = useRef<Caret | null>(null);
  const [, setCaretTick] = useState(0);

  // React Native sizes a multiline input from the text its native view last
  // reported, and only swaps in the text React gave it after measuring
  // (BaseTextInputShadowNode: measureContent, then updateStateIfNeeded in
  // layout). So when an edit sets a point's text from here — a split, a join,
  // a paste — that point keeps the height of its old text: a blank line under
  // a split point, a clipped line on a joined one. Any later revision of the
  // input is measured again, with the right text by then, so such an edit is
  // followed by one more commit that changes nothing but a nativeID. It comes
  // from a layout effect, so the first commit is never painted.
  const [textEdits, setTextEdits] = useState(0);
  const [measured, setMeasured] = useState(0);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the second commit is the fix
    setMeasured(textEdits);
  }, [textEdits]);

  // A caret move lands after the render that carries its edit: a new point
  // has to mount first, and a joined point needs its new text before the
  // caret can sit at the seam.
  useEffect(() => {
    const caret = pending.current;
    const input = caret ? inputs.current.get(caret.id) : undefined;
    if (!caret || !input) return;
    pending.current = null;
    input.focus();
    input.setSelection(caret.at, caret.at);
    selections.current.set(caret.id, { start: caret.at, end: caret.at });
  });

  const apply = useCallback(
    (edit: Edit) => {
      live.current = edit.sections;
      setSections(edit.sections);
      // Every edit that moves the caret may have rewritten a point's text.
      if (edit.caret !== undefined) setTextEdits((n) => n + 1);
      if (edit.caret === null) Keyboard.dismiss();
      else if (edit.caret) {
        pending.current = edit.caret;
        // A point that is already there takes focus now, before the point
        // being removed unmounts — otherwise the keyboard drops and comes back.
        inputs.current.get(edit.caret.id)?.focus();
        setCaretTick((n) => n + 1);
      }
      const next = serializeOutline(fromEditable(edit.sections));
      if (next === emitted.current) return;
      emitted.current = next;
      onChangeBody(next);
    },
    [onChangeBody],
  );

  const textOf = (id: string) =>
    live.current.flatMap((s) => s.points).find((p) => p.id === id)?.text ?? "";
  const onReturn = (id: string) => {
    const text = textOf(id);
    const sel = selections.current.get(id) ?? { start: text.length, end: text.length };
    // Return over a selection replaces it, as it does in any text field.
    const cut =
      sel.end > sel.start
        ? setPointText(live.current, id, text.slice(0, sel.start) + text.slice(sel.end), newId).sections
        : live.current;
    apply(pressReturn(cut, id, sel.start, newId));
  };
  const onBackspace = (id: string) => {
    const sel = selections.current.get(id);
    if (!sel || sel.start !== 0 || sel.end !== 0) return;
    const edit = pressBackspaceAtStart(live.current, id);
    if (edit) apply(edit);
  };
  const onBlur = (id: string) => {
    const tidied = dropIfEmpty(live.current, id);
    if (tidied !== live.current) apply({ sections: tidied });
  };
  const focusEnd = useCallback((point: { id: string; text: string }) => {
    pending.current = { id: point.id, at: point.text.length };
    setCaretTick((n) => n + 1);
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      focusStart: () => {
        const first = live.current[0]?.points[0];
        if (first) focusEnd(first);
      },
      append: (additions) => apply({ sections: appendPoints(live.current, additions, newId) }),
    }),
    [focusEnd, apply],
  );

  return (
    <View style={{ gap: 6 }}>
      {sections.map((section, s) => (
        <View key={s} style={{ gap: 8 }}>
          {section.heading ? (
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: FONT.bold,
                fontSize: 14,
                color: t.colors.ink,
                paddingHorizontal: 2,
                paddingTop: 12,
              }}
            >
              {section.heading.toUpperCase()}
            </Text>
          ) : null}
          {/* A tap on the card's own padding lands the caret at the end of the
              section, like tapping the blank part of a page. */}
          <Pressable
            accessible={false}
            onPress={() => focusEnd(section.points[section.points.length - 1])}
            style={{
              backgroundColor: t.colors.card,
              borderRadius: 24,
              paddingLeft: 16,
              paddingRight: 18,
              paddingVertical: 9,
            }}
          >
            {section.points.map((point, p) => (
              <View key={point.id} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 19,
                    height: LINE * fontScale,
                    marginTop: PAD + 1,
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: point.text ? t.colors.ink2 : t.colors.ink3,
                    }}
                  />
                </View>
                <TextInput
                  ref={(input) => {
                    if (input) inputs.current.set(point.id, input);
                    else inputs.current.delete(point.id);
                  }}
                  accessibilityLabel={`${section.heading ?? "Note"}, point ${p + 1}`}
                  nativeID={`note-point-${measured}`}
                  multiline
                  scrollEnabled={false}
                  submitBehavior="submit"
                  placeholder={
                    section.points.length === 1
                      ? (HINT[section.heading ?? ""] ?? "What you want to say")
                      : undefined
                  }
                  placeholderTextColor={t.colors.ink3}
                  value={point.text}
                  onChangeText={(text) => apply(setPointText(live.current, point.id, text, newId))}
                  onSelectionChange={(e) => selections.current.set(point.id, e.nativeEvent.selection)}
                  onSubmitEditing={() => onReturn(point.id)}
                  onKeyPress={(e) => {
                    if (e.nativeEvent.key === "Backspace") onBackspace(point.id);
                  }}
                  onBlur={() => onBlur(point.id)}
                  style={{
                    flex: 1,
                    fontSize: FONT_SIZE,
                    lineHeight: LINE,
                    paddingTop: PAD,
                    paddingBottom: PAD,
                    color: t.colors.ink,
                  }}
                />
              </View>
            ))}
          </Pressable>
        </View>
      ))}
    </View>
  );
}
