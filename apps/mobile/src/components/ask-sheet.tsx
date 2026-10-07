// ask-sheet.tsx — Ask, the expression assistant, as one sheet.
//
// A chat that only does two things. "How to say": type what you mean in your
// own language, get natural English with a meaning, a nuance note and
// examples. "Note": describe a moment, get a short Opening / Body / Closing
// draft to speak from. The mode is picked per question; the conversation is
// shared across modes and lives only while the sheet is open.
//
// Every reply is structured (lib/ask-model), so it is drawn as a card with its
// own actions — Save to Phrase on each expression, Save to Note on a draft —
// not as a wall of text. Follow-up questions are one tap.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "@/design/text";
import { hairline, useTheme } from "@/design/theme";
import { Icon, Serif } from "@/design/ui";
import { AskLimitError, askAssist } from "@/lib/ask";
import {
  ASK_MAX_CHARS,
  draftAt,
  draftSections,
  exampleFor,
  isHowToSayCard,
  isNoteCard,
  noteTitle,
  patchesDraft,
  questionFor,
  toPhraseInput,
  type AskAnswer,
  type AskMode,
  type AskTurn,
  type Draft,
  type Example,
  type Expression,
  type HowToSayCard,
  type NoteCard,
} from "@/lib/ask-model";
import { firstLanguage, type L1 } from "@/lib/first-language";
import { createNote, serializeOutline, type OutlineSection } from "@/lib/mvp";
import { createPhrase } from "@/lib/phrases";

const MODE_LABEL: Record<AskMode, string> = { how_to_say: "How to say", note: "Note" };
const INTRO: Record<AskMode, { title: string; body: string; placeholder: string }> = {
  how_to_say: {
    title: "What do you want to say?",
    body: "Type it in your own language. You get natural English, what it means and how it is used.",
    placeholder: "Ask how to say something",
  },
  note: {
    title: "What is the moment?",
    body: "A meeting, an interview, a call. Describe it and get a short draft to speak from.",
    placeholder: "Describe the situation",
  },
};
/** First questions to tap, in the learner's own language. */
const STARTERS: Record<AskMode, Record<L1, string[]>> = {
  how_to_say: {
    en: ["I’m running a bit late", "Can we talk about this later?"],
    ko: ["조금 늦을 것 같아요", "나중에 다시 얘기해도 될까요?"],
    ja: ["少し遅れそうです", "あとで話してもいいですか？"],
    "zh-Hant": ["我可能會晚一點到", "可以晚點再聊嗎？"],
    es: ["Voy a llegar un poco tarde", "¿Podemos hablarlo luego?"],
    ru: ["Я немного опоздаю", "Можно обсудить это позже?"],
  },
  note: {
    en: ["Introducing myself to a new team", "Asking my manager for a day off"],
    ko: ["새 팀에서 자기소개하기", "팀장님께 연차 쓰고 싶다고 말하기"],
    ja: ["新しいチームで自己紹介する", "上司に休みを取りたいと伝える"],
    "zh-Hant": ["向新團隊自我介紹", "跟主管說想請一天假"],
    es: ["Presentarme ante un equipo nuevo", "Pedirle un día libre a mi jefe"],
    ru: ["Представиться новой команде", "Попросить у руководителя выходной"],
  },
};
const OFF_TOPIC = "I can help with how to say something in English, or with a note to speak from.";

type SaveState = "saving" | "saved" | "failed";

export interface AskSheetProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AskMode;
  /** Set when opened from a note: a draft is added to that note, not saved as
   *  a new one. */
  note?: { append: (sections: OutlineSection[]) => void };
  /** A phrase or a note was written — lists elsewhere should reload. */
  onSaved?: () => void;
  /** Open a note this sheet just created (the sheet closes first). */
  onOpenNote?: (id: string) => void;
}

export function AskSheet(props: AskSheetProps) {
  // The body mounts with the sheet, so a closed sheet keeps nothing: every
  // open is a new conversation.
  return (
    <Modal
      visible={props.open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      {props.open ? <AskBody {...props} /> : null}
    </Modal>
  );
}

let turnSeq = 0;
const turnId = () => `t${++turnSeq}`;

function AskBody({ onClose, initialMode = "how_to_say", note, onSaved, onOpenNote }: AskSheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AskMode>(initialMode);
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  const [madeNotes, setMadeNotes] = useState<Record<string, string>>({});
  const [typing, setTyping] = useState(false);
  // A page sheet starts below the top of the screen, and the keyboard reports
  // its position in screen terms — so keyboard avoidance needs to know how far
  // down the sheet begins: the screen's height less the sheet's own.
  const { height: screenHeight } = useWindowDimensions();
  const [sheetTop, setSheetTop] = useState(0);
  const list = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const turnTops = useRef(new Map<string, number>());

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setTyping(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setTyping(false));
    // After the sheet has slid up, so the keyboard does not fight it.
    const focus = setTimeout(() => input.current?.focus(), 450);
    return () => {
      show.remove();
      hide.remove();
      clearTimeout(focus);
    };
  }, []);

  const request = async (next: AskTurn[], asked: AskMode) => {
    setPending(true);
    setFailure(null);
    try {
      const { reply } = await askAssist(asked, next);
      const answer: AskTurn = { id: turnId(), role: "assistant", reply, mode: asked };
      setTurns([...next, answer]);
      // Bring the question to the top, so the answer reads from its first line.
      const question = next[next.length - 1];
      const top = turnTops.current.get(question.id);
      if (top !== undefined)
        setTimeout(() => list.current?.scrollTo({ y: Math.max(0, top - 6), animated: true }), 60);
    } catch (e) {
      if (e instanceof AskLimitError) setLimited(true);
      setFailure(e instanceof Error ? e.message : "Couldn’t answer right now. Try again.");
    } finally {
      setPending(false);
    }
  };
  const send = (question: string) => {
    const asked = question.replace(/\s+/g, " ").trim().slice(0, ASK_MAX_CHARS);
    if (!asked || pending || limited) return;
    const next: AskTurn[] = [...turns, { id: turnId(), role: "user", text: asked, mode }];
    setTurns(next);
    setText("");
    // The answer is a card or two, not a line: give it the whole sheet.
    Keyboard.dismiss();
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60);
    void request(next, mode);
  };
  const retry = () => {
    const last = turns[turns.length - 1];
    if (last?.role === "user" && !pending) void request(turns, last.mode);
  };

  const mark = (key: string, state: SaveState | null) =>
    setSaves((s) => {
      const next = { ...s };
      if (state) next[key] = state;
      else delete next[key];
      return next;
    });
  const savePhrase = async (key: string, expression: Expression, example: Example | null, nuance: string, question: string) => {
    mark(key, "saving");
    try {
      await createPhrase(toPhraseInput(expression, example, nuance, question));
      mark(key, "saved");
      onSaved?.();
    } catch {
      mark(key, "failed");
    }
  };
  /** `rewritten` is what an answer changed. A note being edited only takes
   *  those sections — the rest of the draft may already be in it. */
  const saveDraft = async (key: string, draft: Draft, question: string, rewritten?: Draft) => {
    if (note) {
      note.append(draftSections(rewritten ?? draft));
      mark(key, "saved");
      return;
    }
    const sections = draftSections(draft);
    mark(key, "saving");
    try {
      const made = await createNote(noteTitle(question), serializeOutline(sections));
      setMadeNotes((m) => ({ ...m, [key]: made.id }));
      mark(key, "saved");
      onSaved?.();
    } catch {
      mark(key, "failed");
    }
  };

  const last = turns[turns.length - 1];
  const followUps =
    !pending && !failure && last?.role === "assistant" && last.reply.type !== "off_topic"
      ? last.reply.follow_ups
      : [];
  const intro = INTRO[mode];
  const starters = STARTERS[mode][firstLanguage()] ?? STARTERS[mode].en;
  const canSend = Boolean(text.trim()) && !pending && !limited;

  return (
    <View
      onLayout={(e) => setSheetTop(Math.max(0, screenHeight - e.nativeEvent.layout.height))}
      style={{ flex: 1, backgroundColor: t.colors.bg }}
    >
      {/* Header: a grabber, the name, close. "New" appears once there is
          something to clear. */}
      <View style={{ alignItems: "center", paddingTop: 8 }}>
        <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: t.colors.soft }} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingTop: 10,
          paddingBottom: 8,
        }}
      >
        <View style={{ flex: 1, alignItems: "flex-start" }}>
          {turns.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
              hitSlop={10}
              onPress={() => {
                setTurns([]);
                setFailure(null);
                setSaves({});
                setMadeNotes({});
                turnTops.current.clear();
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: t.colors.accD }}>New</Text>
            </Pressable>
          ) : null}
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "700", color: t.colors.ink }}>
          Ask
        </Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Ask"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => ({
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: t.colors.soft,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="x" s={14} w={2.4} c={t.colors.ink2} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={sheetTop} style={{ flex: 1 }}>
        <ScrollView
          ref={list}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20, gap: 14, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {turns.length === 0 ? (
            <View style={{ flex: 1, justifyContent: "center", gap: 18, paddingBottom: 12 }}>
              <View style={{ gap: 8 }}>
                <Serif style={{ fontSize: 30, lineHeight: 35, color: t.colors.ink }}>{intro.title}</Serif>
                <Text style={{ fontSize: 16, lineHeight: 23, color: t.colors.ink2 }}>{intro.body}</Text>
              </View>
              <View style={{ gap: 8, alignItems: "flex-start" }}>
                {starters.map((starter) => (
                  <QuestionChip key={starter} onPress={() => send(starter)}>
                    {starter}
                  </QuestionChip>
                ))}
              </View>
            </View>
          ) : null}

          {turns.map((turn, i) => (
            <View
              key={turn.id}
              onLayout={(e) => turnTops.current.set(turn.id, e.nativeEvent.layout.y)}
            >
              {turn.role === "user" ? (
                <View
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "86%",
                    backgroundColor: t.colors.acc,
                    borderRadius: 20,
                    borderBottomRightRadius: 6,
                    paddingVertical: 10,
                    paddingHorizontal: 15,
                  }}
                >
                  <Text style={{ fontSize: 16, lineHeight: 22, color: t.colors.onAcc }}>{turn.text}</Text>
                </View>
              ) : turn.reply.type === "off_topic" ? (
                <Text style={{ fontSize: 15, lineHeight: 22, color: t.colors.ink2, paddingHorizontal: 2 }}>
                  {OFF_TOPIC}
                </Text>
              ) : isHowToSayCard(turn.reply) ? (
                <HowToSay
                  card={turn.reply}
                  saveState={(n) => saves[`${turn.id}.${n}`]}
                  onSave={(n, expression, example) =>
                    void savePhrase(`${turn.id}.${n}`, expression, example, (turn.reply as HowToSayCard).nuance, questionFor(turns, i))
                  }
                />
              ) : isNoteCard(turn.reply) ? (
                <NoteDraft
                  card={turn.reply}
                  inNote={Boolean(note)}
                  draftState={saves[`${turn.id}.draft`]}
                  madeNote={madeNotes[`${turn.id}.draft`]}
                  onSaveDraft={() => void saveDraft(`${turn.id}.draft`, (turn.reply as NoteCard).draft, questionFor(turns, i))}
                  onOpenNote={onOpenNote}
                  saveState={(n) => saves[`${turn.id}.${n}`]}
                  onSave={(n, phrase) =>
                    void savePhrase(`${turn.id}.${n}`, phrase, phrase.example, "", questionFor(turns, i))
                  }
                />
              ) : (
                <Answer
                  answer={turn.reply}
                  inNote={Boolean(note)}
                  draft={patchesDraft(turn.reply) ? draftAt(turns, i) : null}
                  draftState={saves[`${turn.id}.draft`]}
                  madeNote={madeNotes[`${turn.id}.draft`]}
                  onSaveDraft={(draft) =>
                    void saveDraft(`${turn.id}.draft`, draft, questionFor(turns, i), (turn.reply as AskAnswer).draft_patch)
                  }
                  onOpenNote={onOpenNote}
                  saveState={(n) => saves[`${turn.id}.${n}`]}
                  onSave={(n, phrase) =>
                    void savePhrase(`${turn.id}.${n}`, phrase, phrase.example, "", questionFor(turns, i))
                  }
                />
              )}
            </View>
          ))}

          {pending ? <TypingDots /> : null}
          {failure && !limited ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 2 }}>
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: t.colors.warn }}>{failure}</Text>
              <Pressable accessibilityRole="button" hitSlop={10} onPress={retry}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: t.colors.accD }}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
          {followUps.length ? (
            <View style={{ gap: 8, alignItems: "flex-start" }}>
              {followUps.map((question) => (
                <QuestionChip key={question} onPress={() => send(question)}>
                  {question}
                </QuestionChip>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Composer: the question, with the mode and send under it. */}
        <View style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: typing ? 8 : Math.max(insets.bottom, 12) }}>
          {limited ? (
            <Text style={{ fontSize: 14, lineHeight: 20, color: t.colors.ink2, textAlign: "center", paddingBottom: 10 }}>
              You’ve used today’s questions. More tomorrow.
            </Text>
          ) : null}
          <View
            style={[
              {
                backgroundColor: t.colors.card,
                borderRadius: 26,
                borderWidth: hairline,
                borderColor: t.ring,
                paddingHorizontal: 8,
                paddingTop: 6,
                paddingBottom: 8,
                gap: 6,
                opacity: limited ? 0.5 : 1,
              },
              t.shadowCard,
            ]}
          >
            <TextInput
              ref={input}
              accessibilityLabel="Your question"
              editable={!limited}
              multiline
              maxLength={ASK_MAX_CHARS}
              placeholder={intro.placeholder}
              placeholderTextColor={t.colors.ink3}
              value={text}
              onChangeText={setText}
              style={{
                fontSize: 17,
                lineHeight: 23,
                maxHeight: 120,
                paddingHorizontal: 8,
                paddingTop: 8,
                paddingBottom: 6,
                color: t.colors.ink,
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <ModeSwitch mode={mode} onChange={setMode} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                accessibilityState={{ disabled: !canSend }}
                disabled={!canSend}
                onPress={() => send(text)}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: canSend ? t.colors.acc : t.colors.soft,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ rotate: "-90deg" }],
                })}
              >
                <Icon name="arrow" s={17} w={2.4} c={canSend ? t.colors.onAcc : t.colors.ink3} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function ModeSwitch({ mode, onChange }: { mode: AskMode; onChange: (mode: AskMode) => void }) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", backgroundColor: t.colors.soft, borderRadius: 18, padding: 3 }}
    >
      {(Object.keys(MODE_LABEL) as AskMode[]).map((m) => {
        const on = m === mode;
        return (
          <Pressable
            key={m}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(m)}
            style={[
              {
                height: 30,
                paddingHorizontal: 12,
                borderRadius: 15,
                justifyContent: "center",
                backgroundColor: on ? t.colors.card : "transparent",
              },
              on ? t.shadowCard : null,
            ]}
          >
            <Text style={{ fontSize: 13.5, fontWeight: on ? "700" : "500", color: on ? t.colors.ink : t.colors.ink2 }}>
              {MODE_LABEL[m]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A question to send with one tap: a starter, or a follow-up. */
function QuestionChip({ children, onPress }: { children: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        maxWidth: "100%",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.colors.accS,
        backgroundColor: t.colors.card,
        paddingVertical: 9,
        paddingHorizontal: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: "500", color: t.colors.accD }}>{children}</Text>
    </Pressable>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.colors.card, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 16, gap: 14 }}>
      {children}
    </View>
  );
}
function Rule() {
  const t = useTheme();
  return <View style={{ height: hairline, backgroundColor: t.colors.sep, opacity: 0.6 }} />;
}
function Caption({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.1, color: t.colors.ink3 }}>
      {children.toUpperCase()}
    </Text>
  );
}

/** Save to Phrase, on one expression. */
function SaveButton({ state, onPress }: { state: SaveState | undefined; onPress: () => void }) {
  const t = useTheme();
  const saved = state === "saved";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Saved to Phrases" : "Save to Phrases"}
      disabled={saved || state === "saving"}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 30,
        minWidth: 64,
        paddingHorizontal: 11,
        borderRadius: 15,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        backgroundColor: saved ? t.colors.soft : t.colors.accS,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {state === "saving" ? (
        <ActivityIndicator size="small" color={t.colors.accD} />
      ) : (
        <>
          <Icon name={saved ? "check" : "plus"} s={12} w={2.6} c={saved ? t.colors.ink2 : t.colors.accD} />
          <Text style={{ fontSize: 13.5, fontWeight: "600", color: saved ? t.colors.ink2 : t.colors.accD }}>
            {saved ? "Saved" : state === "failed" ? "Retry" : "Save"}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** The expression itself, with its situation label, meaning and Save. */
function ExpressionRow({
  expression,
  large,
  example,
  state,
  onSave,
}: {
  expression: Expression;
  large?: boolean;
  example?: Example;
  state: SaveState | undefined;
  onSave: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 5 }}>
      {expression.when ? <Caption>{expression.when}</Caption> : null}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        {large ? (
          <Serif style={{ flex: 1, fontSize: 24, lineHeight: 29, color: t.colors.ink }}>{expression.en}</Serif>
        ) : (
          <Text style={{ flex: 1, fontSize: 17, lineHeight: 23, fontWeight: "600", color: t.colors.ink }}>
            {expression.en}
          </Text>
        )}
        <SaveButton state={state} onPress={onSave} />
      </View>
      {expression.meaning ? (
        <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink2 }}>{expression.meaning}</Text>
      ) : null}
      {example?.en ? (
        <View style={{ gap: 1, paddingTop: 3 }}>
          <Text style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink }}>{example.en}</Text>
          {example.l1 ? (
            <Text style={{ fontSize: 13.5, lineHeight: 19, color: t.colors.ink2 }}>{example.l1}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function HowToSay({
  card,
  saveState,
  onSave,
}: {
  card: HowToSayCard;
  saveState: (n: number) => SaveState | undefined;
  onSave: (n: number, expression: Expression, example: Example | null) => void;
}) {
  const t = useTheme();
  return (
    <Sheet>
      {card.expressions.map((expression, n) => (
        <View key={expression.en} style={{ gap: 14 }}>
          {n ? <Rule /> : null}
          <ExpressionRow
            large
            expression={expression}
            state={saveState(n)}
            onSave={() => onSave(n, expression, exampleFor(expression, n, card.examples))}
          />
        </View>
      ))}
      {card.nuance ? (
        <>
          <Rule />
          <View style={{ gap: 6 }}>
            <Caption>Nuance</Caption>
            <Text style={{ fontSize: 15.5, lineHeight: 23, color: t.colors.ink }}>{card.nuance}</Text>
          </View>
        </>
      ) : null}
      {card.examples.length ? (
        <View style={{ gap: 8 }}>
          <Caption>Examples</Caption>
          {card.examples.map((example) => (
            <View key={example.en} style={{ gap: 1 }}>
              <Text style={{ fontSize: 16, lineHeight: 22, color: t.colors.ink }}>{example.en}</Text>
              {example.l1 ? (
                <Text style={{ fontSize: 14, lineHeight: 20, color: t.colors.ink2 }}>{example.l1}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      {card.tip ? (
        <View
          style={{
            flexDirection: "row",
            gap: 9,
            backgroundColor: t.colors.soft,
            borderRadius: 14,
            paddingVertical: 11,
            paddingHorizontal: 12,
          }}
        >
          <View style={{ paddingTop: 2 }}>
            <Icon name="bulb" s={15} w={1.9} c={t.colors.accD} />
          </View>
          <Text style={{ flex: 1, fontSize: 14.5, lineHeight: 21, color: t.colors.ink }}>{card.tip}</Text>
        </View>
      ) : null}
    </Sheet>
  );
}

/** Opening / Body / Closing as text, and the button that keeps it. */
function DraftBlock({
  draft,
  only,
  inNote,
  state,
  madeNote,
  onSave,
  onOpenNote,
}: {
  draft: Draft;
  /** Show just these sections (an answer lists what it rewrote). */
  only?: Draft;
  inNote: boolean;
  state: SaveState | undefined;
  madeNote: string | undefined;
  onSave: () => void;
  onOpenNote?: (id: string) => void;
}) {
  const t = useTheme();
  const parts = (["opening", "body", "closing"] as const).filter((k) => (only ? only[k] : draft[k]));
  const saved = state === "saved";
  const open = saved && madeNote && onOpenNote ? () => onOpenNote(madeNote) : null;
  const label = saved
    ? inNote
      ? "Added to this note"
      : open
        ? "Saved · Open note"
        : "Saved to Studio"
    : state === "failed"
      ? "Couldn’t save · Try again"
      : inNote
        ? "Add to this note"
        : "Save to Note";
  return (
    <View style={{ gap: 14 }}>
      {parts.map((k) => (
        <View key={k} style={{ gap: 5 }}>
          <Caption>{k}</Caption>
          <Text style={{ fontSize: 17, lineHeight: 25, color: t.colors.ink }}>{draft[k]}</Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        disabled={state === "saving" || (saved && !open)}
        onPress={open ?? onSave}
        style={({ pressed }) => ({
          height: 44,
          borderRadius: 22,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          backgroundColor: saved ? t.colors.soft : t.colors.accS,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        {state === "saving" ? (
          <ActivityIndicator size="small" color={t.colors.accD} />
        ) : (
          <>
            {saved ? <Icon name="check" s={14} w={2.6} c={open ? t.colors.accD : t.colors.ink2} /> : null}
            <Text style={{ fontSize: 15.5, fontWeight: "600", color: saved && !open ? t.colors.ink2 : t.colors.accD }}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function NoteDraft({
  card,
  inNote,
  draftState,
  madeNote,
  onSaveDraft,
  onOpenNote,
  saveState,
  onSave,
}: {
  card: NoteCard;
  inNote: boolean;
  draftState: SaveState | undefined;
  madeNote: string | undefined;
  onSaveDraft: () => void;
  onOpenNote?: (id: string) => void;
  saveState: (n: number) => SaveState | undefined;
  onSave: (n: number, phrase: Expression & { example: Example }) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Sheet>
        {card.situation ? (
          <Text style={{ fontSize: 14.5, lineHeight: 21, color: t.colors.ink2 }}>{card.situation}</Text>
        ) : null}
        <DraftBlock
          draft={card.draft}
          inNote={inNote}
          state={draftState}
          madeNote={madeNote}
          onSave={onSaveDraft}
          onOpenNote={onOpenNote}
        />
      </Sheet>
      {card.key_phrases.length || card.terms.length ? (
        <Sheet>
          {card.key_phrases.length ? <Caption>Key phrases</Caption> : null}
          {card.key_phrases.map((phrase, n) => (
            <View key={phrase.en} style={{ gap: 14 }}>
              {n ? <Rule /> : null}
              <ExpressionRow
                expression={{ ...phrase, when: "" }}
                example={phrase.example}
                state={saveState(n)}
                onSave={() => onSave(n, phrase)}
              />
            </View>
          ))}
          {card.terms.length ? (
            <>
              {card.key_phrases.length ? <Rule /> : null}
              <View style={{ gap: 8 }}>
                <Caption>Terms</Caption>
                {card.terms.map((term) => (
                  <Text key={term.en} style={{ fontSize: 15, lineHeight: 21, color: t.colors.ink2 }}>
                    <Text style={{ fontWeight: "600", color: t.colors.ink }}>{term.en}</Text>
                    {term.meaning ? `  ${term.meaning}` : ""}
                  </Text>
                ))}
              </View>
            </>
          ) : null}
        </Sheet>
      ) : null}
    </View>
  );
}

function Answer({
  answer,
  inNote,
  draft,
  draftState,
  madeNote,
  onSaveDraft,
  onOpenNote,
  saveState,
  onSave,
}: {
  answer: AskAnswer;
  inNote: boolean;
  /** The whole draft with this answer's rewrite applied; null when the answer
   *  did not touch the draft. */
  draft: Draft | null;
  draftState: SaveState | undefined;
  madeNote: string | undefined;
  onSaveDraft: (draft: Draft) => void;
  onOpenNote?: (id: string) => void;
  saveState: (n: number) => SaveState | undefined;
  onSave: (n: number, phrase: Expression & { example: Example }) => void;
}) {
  const t = useTheme();
  return (
    <Sheet>
      <Text style={{ fontSize: 16, lineHeight: 24, color: t.colors.ink }}>{answer.text}</Text>
      {draft ? (
        <>
          <Rule />
          <DraftBlock
            draft={draft}
            only={answer.draft_patch}
            inNote={inNote}
            state={draftState}
            madeNote={madeNote}
            onSave={() => onSaveDraft(draft)}
            onOpenNote={onOpenNote}
          />
        </>
      ) : null}
      {answer.expressions.map((phrase, n) => (
        <View key={phrase.en} style={{ gap: 14 }}>
          <Rule />
          <ExpressionRow expression={phrase} example={phrase.example} state={saveState(n)} onSave={() => onSave(n, phrase)} />
        </View>
      ))}
    </Sheet>
  );
}

/** Three dots while the answer is on its way. */
function TypingDots() {
  const t = useTheme();
  const phase = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(phase, { toValue: 3, duration: 1050, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [phase]);
  return (
    <View
      accessibilityLabel="Answering"
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 5,
        backgroundColor: t.colors.card,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
    >
      {[0, 1, 2].map((n) => (
        <Animated.View
          key={n}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: t.colors.ink2,
            opacity: phase.interpolate({
              inputRange: [n, n + 0.5, n + 1],
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            }),
          }}
        />
      ))}
    </View>
  );
}
