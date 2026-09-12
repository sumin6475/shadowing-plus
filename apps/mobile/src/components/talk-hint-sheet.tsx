// talk-hint-sheet.tsx — the "Hint" panel inside a live self-talk session.
//
// The panel itself is the flash card. Face A is the list of phrases, each with
// a checkbox the learner ticks when they actually said one. Tapping a phrase
// turns the WHOLE panel over to face B, that one phrase's entry — set like a
// dictionary: left aligned, centered in the panel, weight carrying the
// hierarchy. Tapping the entry turns it back. Two sources feed the list
// (today's review queue, or the phrases linked to the Situation / Note being
// practised), picked from the sliders control in the header.
//
// COLOR NOTE. This panel is permanently white; it does not follow the color
// scheme (same fixed-surface problem as the camera frame in talk.tsx, inverted).
// So its accent must not follow the scheme either: dark-mode acc (#8FACEF) is
// 2.25:1 on white and the checked box would stop reading as checked. Pinned to
// the brand navy instead, which is the pair built for a white ground:
//   BRAND.main (#162555) on #FFFFFF          = 14.7:1
//   #FFFFFF check glyph on BRAND.main        = 14.7:1
import { memo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

import { Icon, Serif } from "@/design/ui";
import { useTheme } from "@/design/theme";
import { BRAND } from "@/design/mobile-tokens";
import { fetchNotePhrases, fetchSituationPhrases, fetchSpeakingNote, type NotePhrase } from "@/lib/studio-information";
import { fetchPhraseById, recordPhraseEvent, submitVerdict, type PhraseItem } from "@/lib/phrases";
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
// The card is a fixed size. Both faces are drawn at once, stacked, and the
// pair turns together — so the panel must not resize halfway through, or the
// turn reads as the card splitting open rather than flipping over.
const PANEL_HEIGHT = 300;
const CARD: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255,255,255,0.97)",
  borderRadius: 26,
  padding: 16,
  backfaceVisibility: "hidden",
};

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

/**
 * Ticking a phrase here is a real review, not a private checkmark: the learner
 * just used it out loud, which is stronger evidence than recognising it on a
 * card. So it goes on the same 1/3/7/30 ladder Today uses, and Today stops
 * asking for it because `last_reviewed_at` now lands on this local day.
 *
 * The row is read first because the linked-phrase source carries no schedule
 * fields; without it submitVerdict would treat a phrase with a 30-day interval
 * as brand new and pull it back to tomorrow.
 */
async function markReviewedByUse(phraseId: string, talkSessionId: string | null): Promise<void> {
  const item = await fetchPhraseById(phraseId);
  await submitVerdict(phraseId, "good", item ?? undefined);
  await recordPhraseEvent({ phraseItemId: phraseId, event: "used", talkSessionId }).catch(() => {
    // The schedule is the part Today reads; the event is only evidence.
  });
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
  onOpen,
}: {
  phrase: HintPhrase;
  checked: boolean;
  divider: boolean;
  onToggleCheck: () => void;
  onOpen: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: divider ? 1 : 0, borderTopColor: "rgba(0,0,0,0.06)", paddingVertical: 11 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`Mark “${phrase.text}” as used`}
        onPress={onToggleCheck}
        hitSlop={10}
      >
        <Checkbox on={checked} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open “${phrase.text}”`} onPress={onOpen} style={{ flex: 1 }}>
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
      </Pressable>
    </View>
  );
});

/** Face B: one phrase, set like a dictionary entry. */
function PhraseEntry({ phrase, onBack }: { phrase: HintPhrase; onBack: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back to the phrase list"
      onPress={onBack}
      style={{ flex: 1, justifyContent: "center", paddingHorizontal: 4, paddingVertical: 8 }}
    >
      <View style={{ alignItems: "flex-start", gap: 10 }}>
        <Serif strong style={{ fontSize: 28, lineHeight: 35, color: SHEET_INK }}>{phrase.text}</Serif>
        {phrase.translation ? (
          <Text style={{ fontSize: 15.5, lineHeight: 22, color: SHEET_INK2 }}>{phrase.translation}</Text>
        ) : null}
        {phrase.usageNote ? (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.7, color: SHEET_INK3 }}>HOW IT’S USED</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: SHEET_INK2, marginTop: 4 }}>{phrase.usageNote}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

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
      detail: linkedAvailable ? TALK_HINT_SOURCE_DETAIL.linked : "Unavailable in a free talk.",
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
  talkSessionId,
  fallbackPrompt,
  style,
}: {
  todayPhrases: PhraseItem[];
  storyId?: string | null;
  messageId?: string | null;
  /** Resolves the saved talk_session id, so a tick can be tied to this attempt. */
  talkSessionId?: () => Promise<string | null>;
  fallbackPrompt: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
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
  const [detail, setDetail] = useState<HintPhrase | null>(null);
  // A review is written once per phrase per attempt. Unticking clears the mark
  // on screen but never rolls the schedule back: the phrase really was said.
  const reviewed = useRef<Set<string>>(new Set());

  // One continuous 0 -> 180 turn of BOTH faces at once. The earlier version
  // turned to the edge, swapped the content, and turned back from the other
  // side; because the two faces are different heights the card resized at that
  // instant, and a resize at the halfway point reads as the panel splitting
  // open rather than a card flipping over. So the faces are stacked inside a
  // fixed-size box, the back one parked a half-turn behind the front, and the
  // pair rotates together. Nothing swaps and nothing resizes.
  //
  // Opacity, not backfaceVisibility, decides which face you see: the hard
  // switch at 90 degrees is exactly when the card is edge-on, and it does not
  // depend on how the platform composites a rotated view's back side.
  const flip = useSharedValue(0);
  const turning = useRef(false);
  const [showBack, setShowBack] = useState(false);
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${flip.value * 180}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${180 + flip.value * 180}deg` }],
    opacity: flip.value < 0.5 ? 0 : 1,
  }));

  const turn = (next: HintPhrase | null) => {
    if (turning.current) return;
    turning.current = true;
    setTimeout(() => {
      turning.current = false;
    }, 460);
    void Haptics.selectionAsync();
    // The entry keeps whatever phrase it last showed until a new one opens, so
    // the face behind the list is never blank mid-turn.
    if (next) setDetail(next);
    setShowBack(Boolean(next));
    flip.value = withTiming(next ? 1 : 0, { duration: 420, easing: Easing.inOut(Easing.cubic) });
  };

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
    setDetail(null);
  };

  const toggleCheck = (phrase: HintPhrase) => {
    const next = !checked[phrase.id];
    void Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    setChecked((current) => ({ ...current, [phrase.id]: next }));
    if (!next || reviewed.current.has(phrase.id)) return;
    reviewed.current.add(phrase.id);
    void (async () => {
      try {
        await markReviewedByUse(phrase.id, (await talkSessionId?.()) ?? null);
      } catch {
        // Let it be retried on the next tick of the same attempt.
        reviewed.current.delete(phrase.id);
      }
    })();
  };

  const list: HintPhrase[] | null = source === "linked" ? linked : todayPhrases.map(fromPhraseItem);
  const loading = source === "linked" && !linked && !linkedError;
  const title = source === "linked" ? linkedLabel : "Today’s phrases";

  return (
    <>
      <View style={[style, { height: PANEL_HEIGHT }]}>
        <Reanimated.View
          style={[CARD, t.shadowLg, frontStyle]}
          pointerEvents={showBack ? "none" : "auto"}
          accessibilityElementsHidden={showBack}
          importantForAccessibility={showBack ? "no-hide-descendants" : "auto"}
        >
          {/* Not a tab bar: there is only one list, so segmented chrome was
              promising a second tab that did not exist. A label, and the
              sliders control parked where that second tab used to sit. The
              phrases below are near-black bold 16.5pt, so this differs on
              case, size, tracking and color and never reads as a row. */}
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

          <View style={{ flex: 1, paddingTop: 6, paddingHorizontal: 4 }}>
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
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {list.map((phrase, index) => (
                  <PhraseRow
                    key={phrase.id}
                    phrase={phrase}
                    divider={index > 0}
                    checked={Boolean(checked[phrase.id])}
                    onToggleCheck={() => toggleCheck(phrase)}
                    onOpen={() => turn(phrase)}
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
        </Reanimated.View>

        <Reanimated.View
          style={[CARD, t.shadowLg, backStyle]}
          pointerEvents={showBack ? "auto" : "none"}
          accessibilityElementsHidden={!showBack}
          importantForAccessibility={showBack ? "auto" : "no-hide-descendants"}
        >
          {detail ? <PhraseEntry phrase={detail} onBack={() => turn(null)} /> : null}
        </Reanimated.View>
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
