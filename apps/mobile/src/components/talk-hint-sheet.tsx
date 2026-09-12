// talk-hint-sheet.tsx — the "Hint" panel inside a live self-talk session.
//
// One list, two possible sources (Today's phrases / the phrases linked to the
// Situation or Note being practised), picked from the gear in the header. Each
// row is a flash card: the checkbox on the left is the learner's own "I used
// it" mark, and tapping anywhere else flips the row over to the meaning and
// the usage note — the same peek the Today review gives, done in place.
//
// COLOR NOTE. This panel is permanently white; it does not follow the color
// scheme (same fixed-surface problem as the camera frame in talk.tsx, inverted).
// So its accent must not follow the scheme either: dark-mode acc (#8FACEF) is
// 2.25:1 on white and the checked box would stop reading as checked. Pinned to
// the brand navy instead, which is the pair built for a white ground:
//   BRAND.main (#162555) on #FFFFFF          = 14.7:1
//   #FFFFFF check glyph on BRAND.main        = 14.7:1
import { memo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { Icon, Serif } from "@/design/ui";
import { useTheme } from "@/design/theme";
import { BRAND } from "@/design/mobile-tokens";
import { fetchNotePhrases, fetchSituationPhrases, fetchSpeakingNote, type NotePhrase } from "@/lib/studio-information";
import type { PhraseItem } from "@/lib/phrases";
import {
  persistTalkHintSource,
  talkHintSource,
  TALK_HINT_SOURCE_DETAIL,
  type TalkHintSource,
} from "@/lib/talk-hint-source";

const SHEET_ACC = BRAND.main;
const SHEET_INK = "#16181d";
const SHEET_INK2 = "rgba(0,0,0,0.55)";
const SHEET_INK3 = "rgba(0,0,0,0.4)";

/** The shape both sources reduce to. `usageNote` is the "How it's used" line. */
export interface HintPhrase {
  id: string;
  text: string;
  translation: string | null;
  usageNote: string | null;
}

const fromPhraseItem = (item: PhraseItem): HintPhrase => ({
  id: item.id,
  text: item.text,
  translation: item.translation,
  usageNote: item.usageNote,
});

const fromNotePhrase = (item: NotePhrase): HintPhrase => ({
  id: item.id,
  text: item.text,
  translation: item.translation,
  usageNote: item.usageNote,
});

/** Load every phrase attached to the Note being practised, or — when the
 *  attempt names only a Situation — every phrase in that Situation. */
async function loadLinkedPhrases(input: { storyId?: string | null; messageId?: string | null }): Promise<HintPhrase[]> {
  if (input.messageId) {
    const note = await fetchSpeakingNote(input.messageId);
    if (note) return (await fetchNotePhrases(note)).map(fromNotePhrase);
  }
  if (input.storyId) return (await fetchSituationPhrases(input.storyId)).map(fromNotePhrase);
  return [];
}

function Checkbox({ on }: { on: boolean }) {
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // A quick squash-and-settle, so a check registers as an event rather than
    // a silent repaint. Only fires on a real toggle, never on first paint.
    scale.value = withSequence(withTiming(0.78, { duration: 70 }), withSpring(1, { damping: 9, stiffness: 260 }));
  }, [on, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Reanimated.View
      style={[
        {
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: on ? SHEET_ACC : "transparent",
          borderWidth: on ? 0 : 2,
          borderColor: "rgba(0,0,0,0.22)",
        },
        style,
      ]}
    >
      {on ? <Icon name="check" s={14} w={3} c="#FFFFFF" /> : null}
    </Reanimated.View>
  );
}

const PhraseRow = memo(function PhraseRow({
  phrase,
  checked,
  divider,
  onToggleCheck,
}: {
  phrase: HintPhrase;
  checked: boolean;
  divider: boolean;
  onToggleCheck: () => void;
}) {
  const [back, setBack] = useState(false);
  const rot = useSharedValue(0);
  const busy = useRef(false);

  // Half-turn, swap faces at the edge, half-turn back in from the other side.
  // Two timings instead of one 180 degree sweep so the back face is never drawn
  // mirrored and the row may change height between faces.
  //
  // It MUST be one withSequence. Writing `rot.value` from inside the first
  // timing's own callback re-enters Reanimated's value setter, which cancels
  // that animation, which invokes the same callback again with finished=false:
  //   set -> valueSetter -> callback -> set -> ...  => Maximum call stack size
  //   exceeded, on the UI thread, the first time a card was flipped.
  // The callback may only schedule JS work (runOnJS), never assign.
  const flip = () => {
    if (busy.current) return;
    busy.current = true;
    // Released on a timer rather than from the animation: a callback that never
    // fires (interrupted flip, unmount mid-turn) would wedge the row shut, and
    // clearing a ref is the one thing a timer does reliably.
    setTimeout(() => {
      busy.current = false;
    }, 340);
    void Haptics.selectionAsync();
    const showBack = !back;
    rot.value = withSequence(
      withTiming(84, { duration: 140 }, (finished) => {
        if (finished) runOnJS(setBack)(showBack);
      }),
      // 1ms, not 0: timing divides elapsed time by the duration.
      withTiming(-84, { duration: 1 }),
      withTiming(0, { duration: 160 }),
    );
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateY: `${rot.value}deg` }],
  }));

  const toggle = () => {
    void Haptics.impactAsync(checked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    onToggleCheck();
  };

  return (
    <Reanimated.View
      style={[
        { borderTopWidth: divider ? 1 : 0, borderTopColor: "rgba(0,0,0,0.06)", paddingVertical: 10 },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`Mark “${phrase.text}” as used`}
          onPress={toggle}
          hitSlop={10}
          style={{ paddingTop: 1 }}
        >
          <Checkbox on={checked} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={back ? `Hide the meaning of “${phrase.text}”` : `Show the meaning of “${phrase.text}”`}
          onPress={flip}
          style={{ flex: 1 }}
        >
          {back ? (
            <View style={{ gap: 6 }}>
              <Serif style={{ fontSize: 18, lineHeight: 25, color: SHEET_INK }}>{phrase.text}</Serif>
              {phrase.translation ? (
                <Text style={{ fontSize: 14, lineHeight: 20, color: SHEET_INK2 }}>{phrase.translation}</Text>
              ) : null}
              {phrase.usageNote ? (
                <View style={{ marginTop: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: SHEET_INK3 }}>HOW IT’S USED</Text>
                  <Text style={{ fontSize: 13.5, lineHeight: 19, color: SHEET_INK2, marginTop: 3 }}>{phrase.usageNote}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text
              style={{
                fontSize: 16.5,
                lineHeight: 23,
                fontWeight: "700",
                color: checked ? SHEET_INK3 : SHEET_INK,
                textDecorationLine: checked ? "line-through" : "none",
              }}
            >
              {phrase.text}
            </Text>
          )}
        </Pressable>
      </View>
    </Reanimated.View>
  );
});

function SourceModal({
  open,
  value,
  linkedLabel,
  linkedAvailable,
  onPick,
  onClose,
}: {
  open: boolean;
  value: TalkHintSource;
  linkedLabel: string;
  linkedAvailable: boolean;
  onPick: (source: TalkHintSource) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const options: { key: TalkHintSource; label: string; detail: string; disabled: boolean }[] = [
    { key: "today", label: "Today’s phrases", detail: TALK_HINT_SOURCE_DETAIL.today, disabled: false },
    {
      key: "linked",
      label: linkedLabel,
      detail: linkedAvailable
        ? TALK_HINT_SOURCE_DETAIL.linked
        : "Unavailable in a free talk.",
      disabled: !linkedAvailable,
    },
  ];
  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(10,12,18,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[{ width: "100%", maxWidth: 400, borderRadius: 26, backgroundColor: t.colors.card, overflow: "hidden" }, t.shadowLg]}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>Phrases to show</Text>
            <Text style={{ fontSize: 13.5, lineHeight: 19, color: t.colors.ink3, marginTop: 4 }}>
              Which set the Hint panel keeps in front of you while you talk.
            </Text>
          </View>
          {options.map((option) => {
            const on = value === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on, disabled: option.disabled }}
                disabled={option.disabled}
                onPress={() => onPick(option.key)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: t.colors.sep,
                  opacity: option.disabled ? 0.45 : 1,
                  backgroundColor: pressed ? t.colors.soft : "transparent",
                })}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: on ? t.colors.accD : t.colors.ink3,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  {on ? <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: t.colors.accD }} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15.5, fontWeight: on ? "700" : "600", color: t.colors.ink }}>{option.label}</Text>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: t.colors.ink3, marginTop: 2 }}>{option.detail}</Text>
                </View>
              </Pressable>
            );
          })}
          {linkedAvailable ? null : (
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: t.colors.sep }}>
              <Text style={{ fontSize: 13, lineHeight: 19, color: t.colors.ink3 }}>
                A free talk isn’t attached to a situation or a note, so there are no linked phrases to show. Start an
                attempt from a situation or a note to use that option.
              </Text>
            </View>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: t.colors.sep }}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({ minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? t.colors.soft : "transparent" })}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: t.colors.accD }}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function TalkHintSheet({
  todayPhrases,
  storyId,
  messageId,
  fallbackPrompt,
}: {
  todayPhrases: PhraseItem[];
  storyId?: string | null;
  messageId?: string | null;
  fallbackPrompt: string;
}) {
  const linkedAvailable = Boolean(messageId || storyId);
  const linkedLabel = messageId ? "This note" : "This situation";
  const [source, setSource] = useState<TalkHintSource>(() => {
    const saved = talkHintSource();
    return saved === "linked" && !linkedAvailable ? "today" : saved;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [linked, setLinked] = useState<HintPhrase[] | null>(null);
  const [linkedError, setLinkedError] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Only fetched once the learner actually asks for it; a free talk never does.
  useEffect(() => {
    if (source !== "linked" || linked || !linkedAvailable) return;
    let active = true;
    loadLinkedPhrases({ storyId, messageId })
      .then((items) => {
        if (active) setLinked(items);
      })
      .catch(() => {
        if (active) setLinkedError(true);
      });
    return () => {
      active = false;
    };
  }, [source, linked, linkedAvailable, storyId, messageId]);

  const pick = (next: TalkHintSource) => {
    if (next === "linked") setLinkedError(false);
    setSource(next);
    void persistTalkHintSource(next);
    setSettingsOpen(false);
  };

  const list: HintPhrase[] | null = source === "linked" ? linked : todayPhrases.map(fromPhraseItem);
  const loading = source === "linked" && !linked && !linkedError;
  const title = source === "linked" ? linkedLabel : "Today’s phrases";

  return (
    <>
      {/* Not a tab bar any more: there is only one list, so the segmented
          chrome was promising a second tab that did not exist. Plain centered
          title, with the gear parked where that second tab used to sit. */}
      <View
        style={{
          minHeight: 34,
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0,0,0,0.07)",
        }}
      >
        {/* Label, not list content. The phrases below are near-black, bold and
            16.5pt; at 15.5pt bold in the same ink this read as one more row of
            the list. It differs on four axes now — case, size, tracking and
            color — so it is a heading at a glance and never a phrase. */}
        <Text
          style={{ fontSize: 12, fontWeight: "800", letterSpacing: 1.1, color: SHEET_ACC, textTransform: "uppercase" }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose which phrases to show"
          onPress={() => setSettingsOpen(true)}
          hitSlop={10}
          style={({ pressed }) => ({
            position: "absolute",
            right: 0,
            width: 34,
            height: 34,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Icon name="sliders" s={19} w={1.9} c={SHEET_INK3} />
        </Pressable>
      </View>

      <View style={{ paddingTop: 6, paddingHorizontal: 4 }}>
        {loading ? (
          <View style={{ paddingVertical: 34, alignItems: "center" }}>
            <ActivityIndicator color={SHEET_ACC} />
          </View>
        ) : linkedError ? (
          <View style={{ paddingVertical: 26 }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: SHEET_INK2 }}>
              Couldn’t load these phrases. Your talk is still recording.
            </Text>
          </View>
        ) : list && list.length ? (
          <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {list.map((phrase, index) => (
              <PhraseRow
                key={phrase.id}
                phrase={phrase}
                divider={index > 0}
                checked={Boolean(checked[phrase.id])}
                onToggleCheck={() => setChecked((current) => ({ ...current, [phrase.id]: !current[phrase.id] }))}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={{ paddingTop: 10, paddingBottom: 6 }}>
            <Serif style={{ fontSize: 21, lineHeight: 28, color: SHEET_INK }}>{fallbackPrompt}</Serif>
            <Text style={{ fontSize: 14, color: SHEET_INK2, marginTop: 6 }}>
              {source === "linked" ? "Nothing is saved here yet — just keep talking." : "Use it naturally when it fits."}
            </Text>
          </View>
        )}
      </View>

      <SourceModal
        open={settingsOpen}
        value={source}
        linkedLabel={linkedLabel}
        linkedAvailable={linkedAvailable}
        onPick={pick}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
