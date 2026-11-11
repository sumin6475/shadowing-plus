// note-outline.tsx — the writing surface of a Studio note.
//
// A note body is an outline: Opening / Body / Closing / Others.
// Sections are transparent rows separated by thin rules; each point is its own input, so a long point wraps
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
  type RefObject,
} from "react";
import { AccessibilityInfo, Animated, InputAccessoryView, Keyboard, Platform, Pressable, useWindowDimensions, View } from "react-native";
import { Text, TextInput } from "@/design/text";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/design/theme";
import { FONT_UI as SYSTEM } from "@/design/mobile-tokens";
import { parseOutline, serializeOutline, type OutlineSection } from "@/lib/mvp";
import {
  appendPoints,
  dropIfEmpty,
  fromEditable,
  pressBackspaceAtStart,
  pressReturn,
  setPointText,
  toEditable,
  speakingSections,
  movePoint,
  outlineDropTarget,
  setPointNote,
  type EditPoint,
  type OutlineDropSection,
  type Caret,
  type Edit,
} from "@/lib/outline-edit";

const FONT_SIZE = 17;
const LINE = 22;
const PAD = 10;

export interface NotePointContext { id: string; section: string; text: string; note: string }
export type PointAction = "phrases" | "refine" | "how_to_say";

// Remain unique when Fast Refresh retains existing rows but reloads this module.
const newId = () => globalThis.expo.uuidv4();

export interface NoteOutlineHandle {
  /** Puts the caret in the first point — where Return in the title goes. */
  focusStart: () => void;
  /** Adds points under their headings, after what is already written (a
   *  draft from Ask). Goes through the same path as typing, so it autosaves. */
  append: (sections: OutlineSection[]) => void;
  insertPhrase: (pointId: string, phrase: string) => void;
}

export function NoteOutline({
  body,
  onChangeBody,
  onPointAction,
  onDragChanged,
  onDragScroll,
  scrollOffset,
  ref,
}: {
  /** The body to start from. Read once: give another note another `key`. */
  body: string;
  onChangeBody: (body: string) => void;
  onPointAction?: (action: PointAction, point: NotePointContext) => void;
  onDragChanged?: (dragging: boolean) => void;
  onDragScroll?: (pageY: number) => void;
  scrollOffset?: RefObject<number>;
  ref?: Ref<NoteOutlineHandle>;
}) {
  const t = useTheme();
  const { fontScale } = useWindowDimensions();
  const [start] = useState(() => {
    const parsed = speakingSections(parseOutline(body));
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const expandedRef = useRef<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const root = useRef<View>(null);
  const sectionBoxes = useRef(new Map<number, { y: number; height: number }>());
  const rowBoxes = useRef(new Map<string, { y: number; height: number }>());
  const dragRef = useRef<{ id: string; origin: number; scroll: number; anchor: number; pageY: number; target: { section: number; index: number } } | null>(null);
  const [dragY] = useState(() => new Animated.Value(0));
  const [drag, setDrag] = useState<{ point: EditPoint; target: { section: number; index: number } } | null>(null);
  const dragging = Boolean(drag);
  const suppressTap = useRef(false);

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
    if (expandedRef.current === id) return;
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
      insertPhrase: (pointId, phrase) => {
        const point = live.current.flatMap(s => s.points).find(p => p.id === pointId);
        if (!point) return;
        const note = [point.note?.trim(), phrase].filter(Boolean).join("\n");
        apply({ sections: setPointNote(live.current, pointId, note) });
        setTextEdits(n => n + 1);
        expandedRef.current = pointId;
        setExpanded(pointId);
      },
    }),
    [focusEnd, apply],
  );

  const accent = t.dark ? "#0A84FF" : "#3478F6";
  const separator = t.dark ? "rgba(235,235,245,0.12)" : "rgba(60,60,67,0.08)";
  const ring = t.dark ? "#636366" : "#C7C7CC";
  const handle = t.dark ? "rgba(184,184,191,0.6)" : "rgba(111,111,117,0.6)";
  const expand = (id: string) => {
    const next = expandedRef.current === id ? null : id;
    expandedRef.current = next;
    setExpanded(next);
  };
  const layout = (): OutlineDropSection[] => live.current.flatMap((section, index) => {
    const box = sectionBoxes.current.get(index);
    if (!box) return [];
    return [{ section: index, ...box, rows: collapsed.has(index) ? [] : section.points.flatMap(point => {
      const row = rowBoxes.current.get(point.id);
      return row && (point.text.trim() || point.note?.trim()) ? [{ id: point.id, y: box.y + row.y, height: row.height }] : [];
    }) }];
  });
  const moveDrag = (pageY: number) => {
    const active = dragRef.current;
    if (!active) return;
    active.pageY = pageY;
    const localY = pageY - active.origin + (scrollOffset?.current ?? 0) - active.scroll;
    dragY.setValue(localY - active.anchor);
    const target = outlineDropTarget(layout(), localY, active.id);
    if (target && (target.section !== active.target.section || target.index !== active.target.index)) {
      active.target = target;
      setDrag(current => current ? { ...current, target } : null);
      void Haptics.selectionAsync().catch(() => {});
    }
  };
  const finishDrag = (pageY?: number) => {
    if (!dragRef.current) return;
    if (pageY !== undefined) moveDrag(pageY);
    const active = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    onDragChanged?.(false);
    apply({ sections: movePoint(live.current, active.id, active.target.section, active.target.index, newId) });
    setCollapsed(current => { const next = new Set(current); next.delete(active.target.section); return next; });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTimeout(() => { suppressTap.current = false; }, 100);
  };
  const cancelDrag = () => {
    dragRef.current = null;
    setDrag(null);
    onDragChanged?.(false);
    suppressTap.current = false;
  };
  const beginDrag = (point: EditPoint, section: number, pageY: number) => {
    if (!point.text.trim() && !point.note?.trim()) return;
    Keyboard.dismiss();
    suppressTap.current = true;
    root.current?.measureInWindow((_, origin) => {
      const box = sectionBoxes.current.get(section);
      const row = rowBoxes.current.get(point.id);
      if (!box || !row) return;
      const top = box.y + row.y;
      const index = live.current[section].points.filter(p => p.id !== point.id && (p.text.trim() || p.note?.trim())).filter(p => {
        const other = rowBoxes.current.get(p.id);
        return other && other.y < row.y;
      }).length;
      const target = { section, index };
      dragRef.current = { id: point.id, origin, scroll: scrollOffset?.current ?? 0, anchor: pageY - origin - top, pageY, target };
      dragY.setValue(top);
      setDrag({ point, target });
      onDragChanged?.(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    });
  };
  useEffect(() => {
    if (!dragging || !onDragScroll) return;
    const timer = setInterval(() => {
      const active = dragRef.current;
      if (active) { onDragScroll(active.pageY); moveDrag(active.pageY); }
    }, 40);
    return () => clearInterval(timer);
  });
  useEffect(() => () => { onDragChanged?.(false); }, [onDragChanged]);

  const accessibleMove = (point: EditPoint, section: number, direction: string) => {
    const index = live.current[section].points.findIndex(p => p.id === point.id);
    let target = section;
    let slot = index;
    if (direction === "moveUp") {
      if (index > 0) slot--;
      else { if (section === 0) return; target = section - 1; slot = live.current[target].points.length; }
    } else if (direction === "moveDown") {
      if (index < live.current[section].points.length - 1) slot++;
      else { if (section === live.current.length - 1) return; target = section + 1; slot = 0; }
    } else {
      const destination = Number(direction.replace("section", ""));
      if (!Number.isInteger(destination) || !live.current[destination]) return;
      target = destination; slot = live.current[target].points.length;
    }
    apply({ sections: movePoint(live.current, point.id, target, slot, newId) });
    setCollapsed(current => { const next = new Set(current); next.delete(target); return next; });
    AccessibilityInfo.announceForAccessibility(`Moved to ${live.current[target].heading}`);
  };
  const indicator = () => <View style={{ height: 2, backgroundColor: accent, marginLeft: 36, borderRadius: 1 }} />;
  const toolbar = (id: string, text: string) => onPointAction ? (
    <View style={{ paddingHorizontal: 20, paddingVertical: 8, backgroundColor: t.colors.bg }}>
      <View style={[{ flexDirection: "row", borderRadius: 24, backgroundColor: t.colors.card }, t.shadowCard]}>
        {([{ action: "phrases", label: "Phrases", symbol: "text.magnifyingglass" }, { action: "refine", label: "Refine", symbol: "text.bubble" }, { action: "how_to_say", label: "How to say", symbol: "character.bubble" }] as const).map(tool => (
          <Pressable key={tool.action} accessibilityRole="button" accessibilityLabel={`${tool.label} for ${text || "this point"}`}
            onPress={() => {
              const section = live.current.find(entry => entry.points.some(point => point.id === id));
              const point = section?.points.find(point => point.id === id);
              if (point) onPointAction(tool.action, { id: point.id, section: section?.heading ?? "Others", text: point.text, note: point.note ?? "" });
            }}
            style={({ pressed }) => ({ flex: 1, minHeight: 46, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}>
            <SymbolView name={tool.symbol} size={19} tintColor={t.colors.ink} />
            <Text style={{ flexShrink: 1, textAlign: "center", fontFamily: SYSTEM, fontSize: 14, lineHeight: 19, fontWeight: "500", color: t.colors.ink }}>{tool.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  ) : null;

  return (
    <View ref={root} collapsable={false}
      onMoveShouldSetResponderCapture={() => Boolean(dragRef.current)}
      onResponderMove={event => moveDrag(event.nativeEvent.pageY)}
      onResponderRelease={event => finishDrag(event.nativeEvent.pageY)}
      onResponderTerminate={cancelDrag}
      onTouchCancel={cancelDrag}
    >
      {sections.map((section, s) => {
        const closed = collapsed.has(s);
        const target = drag?.target.section === s ? drag.target.index : -1;
        const remaining = section.points.filter(p => p.id !== drag?.point.id && (p.text.trim() || p.note?.trim()));
        return (
          <View key={section.heading ?? s} onLayout={event => sectionBoxes.current.set(s, event.nativeEvent.layout)}
            style={{ paddingTop: 18, paddingBottom: closed ? 16 : 6, borderBottomWidth: s < sections.length - 1 ? 1.5 : 0, borderBottomColor: separator }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${closed ? "Expand" : "Collapse"} ${section.heading}`}
              accessibilityState={{ expanded: !closed }}
              hitSlop={{ top: 6, bottom: 6 }}
              onPress={() => setCollapsed(current => { const next = new Set(current); if (next.has(s)) next.delete(s); else next.add(s); return next; })}
              style={{ minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: SYSTEM, fontSize: 20, fontWeight: "700", lineHeight: 26, color: section.heading === "Others" ? ring : t.colors.ink }}>{section.heading}</Text>
              <SymbolView name={closed ? "chevron.right" : "chevron.down"} size={12} weight="semibold" tintColor={t.colors.ink} style={{ width: 14, height: 14 }} />
            </Pressable>
            {!closed ? section.points.map((point, p) => {
              const open = expanded === point.id;
              const empty = !point.text.trim() && !point.note?.trim();
              const before = target >= 0 && remaining[target]?.id === point.id;
              return (
                <View key={point.id} onLayout={event => rowBoxes.current.set(point.id, event.nativeEvent.layout)}
                  style={{ opacity: drag?.point.id === point.id ? 0.15 : 1 }}>
                  {before ? indicator() : null}
                  <View style={{ flexDirection: "row", alignItems: "flex-start", minHeight: 44 }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${section.heading}, move point ${p + 1}: ${point.text || "New point"}`}
                      accessibilityHint="Touch and hold to drag. Tap to show notes."
                      accessibilityActions={[{ name: "moveUp", label: "Move up" }, { name: "moveDown", label: "Move down" }, ...sections.map((entry, index) => ({ name: `section${index}`, label: `Move to ${entry.heading}` }))]}
                      onAccessibilityAction={event => accessibleMove(point, s, event.nativeEvent.actionName)}
                      onLongPress={event => beginDrag(point, s, event.nativeEvent.pageY)} delayLongPress={350}
                      onTouchMove={event => moveDrag(event.nativeEvent.pageY)}
                      onTouchEnd={event => finishDrag(event.nativeEvent.pageY)}
                      onPress={() => { if (!suppressTap.current) expand(point.id); }}
                      style={{ width: 36, minHeight: 44, alignItems: "flex-start", justifyContent: "flex-start", paddingTop: 12 }}>
                      <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center", opacity: empty ? 0.45 : 1 }}>
                        <View style={{ width: 11, height: 6, justifyContent: "space-between" }}>
                          <View style={{ height: 1.3, borderRadius: 1, backgroundColor: handle }} />
                          <View style={{ height: 1.3, borderRadius: 1, backgroundColor: handle }} />
                        </View>
                      </View>
                    </Pressable>
                    <TextInput ref={input => { if (input) inputs.current.set(point.id, input); else inputs.current.delete(point.id); }}
                      accessibilityLabel={`${section.heading}, point ${p + 1}`} nativeID={`note-point-${measured}`}
                      inputAccessoryViewID={onPointAction && Platform.OS === "ios" ? `${point.id}-text-tools` : undefined}
                      multiline scrollEnabled={false} submitBehavior="submit" value={point.text}
                      onChangeText={text => apply(setPointText(live.current, point.id, text, newId))}
                      onSelectionChange={event => selections.current.set(point.id, event.nativeEvent.selection)}
                      onSubmitEditing={() => onReturn(point.id)}
                      onKeyPress={event => { if (event.nativeEvent.key === "Backspace") onBackspace(point.id); }}
                      onFocus={() => { expandedRef.current = point.id; setExpanded(point.id); }} onBlur={() => onBlur(point.id)}
                      style={{ flex: 1, minHeight: LINE * fontScale + PAD * 2, fontFamily: SYSTEM, fontSize: FONT_SIZE, lineHeight: LINE, paddingTop: PAD, paddingBottom: PAD, color: t.colors.ink }} />
                    {open || point.note ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`${open ? "Hide" : "Show"} notes for point ${p + 1}`}
                        onPress={() => expand(point.id)} style={{ width: 36, height: 44, alignItems: "flex-end", justifyContent: "center" }}>
                        <SymbolView name="info.circle" size={22} tintColor={accent} />
                      </Pressable>
                    ) : null}
                  </View>
                  {/* Fabric 0.86 binds each accessory to the first matching native input.
                      Give the point and its detail their own IDs so every row gets tools. */}
                  {Platform.OS === "ios" && onPointAction ? <InputAccessoryView nativeID={`${point.id}-text-tools`}>{toolbar(point.id, point.text)}</InputAccessoryView> : null}
                  {open ? (
                    <View style={{ paddingLeft: 36, paddingBottom: 12 }}>
                      <TextInput accessibilityLabel={`${section.heading}, notes for point ${p + 1}`} multiline scrollEnabled={false}
                        nativeID={`note-detail-${point.id}-${measured}`}
                        inputAccessoryViewID={onPointAction && Platform.OS === "ios" ? `${point.id}-note-tools` : undefined}
                        value={point.note ?? ""} placeholder="Add Note" placeholderTextColor={ring}
                        onChangeText={note => apply({ sections: setPointNote(live.current, point.id, note) })}
                        style={{ fontFamily: SYSTEM, fontSize: 15, lineHeight: 21, minHeight: 30, color: t.colors.ink2, paddingTop: 0, paddingBottom: 6 }} />
                      {onPointAction ? Platform.OS === "ios" ? <InputAccessoryView nativeID={`${point.id}-note-tools`}>{toolbar(point.id, point.text)}</InputAccessoryView> : toolbar(point.id, point.text) : null}
                    </View>
                  ) : point.note ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Show notes for ${point.text}`} onPress={() => expand(point.id)} style={{ marginLeft: 36, paddingBottom: 10 }}>
                      <Text numberOfLines={2} style={{ fontFamily: SYSTEM, fontSize: 15, lineHeight: 20, color: t.colors.ink2 }}>{point.note}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            }) : null}
            {target >= remaining.length && target >= 0 ? indicator() : null}
            {!closed && section.points.every(p => p.text.trim() || p.note?.trim()) ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Add point to ${section.heading}`}
                onPress={() => { const point = { id: newId(), text: "" }; apply({ sections: live.current.map((entry, index) => index === s ? { ...entry, points: [...entry.points, point] } : entry), caret: { id: point.id, at: 0 } }); }}
                style={{ minHeight: 46, justifyContent: "center" }}>
                <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
                  <SymbolView name="plus" size={13} weight="light" tintColor={ring} style={{ width: 13, height: 13 }} />
                </View>
              </Pressable>
            ) : null}
          </View>
        );
      })}
      {drag ? (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, padding: 14, borderRadius: 12, backgroundColor: t.colors.bg, transform: [{ translateY: dragY }, { scale: 1.015 }], zIndex: 10 }, t.shadowLg]}>
          <Text numberOfLines={3} style={{ fontFamily: SYSTEM, fontSize: 17, lineHeight: 23, color: t.colors.ink }}>{drag.point.text}</Text>
          {drag.point.note ? <Text numberOfLines={2} style={{ fontFamily: SYSTEM, fontSize: 15, lineHeight: 20, color: t.colors.ink2, marginTop: 4 }}>{drag.point.note}</Text> : null}
        </Animated.View>
      ) : null}
    </View>
  );
}
