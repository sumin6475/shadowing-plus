// ask-fixtures.ts — canned replies for building the Ask sheet before the
// `ask-assist` function is deployed (release-flags: ASK_MOCK).
//
// The sample cards came from a golden run and were lightly trimmed. The
// clarification is a synthetic UI fixture; its following draft is unrelated
// to the learner's input and must not be used to judge model quality. These
// fixtures are Korean; the live function answers in the learner's own language.
//
// A question can force a state while reviewing the UI:
//   "/off" → off-topic line · "/limit" → daily limit · "/error" → failed turn
import type { AskAnswer, AskMode, AskReply, AskTurn, HowToSayCard, NoteCard, NoteClarify } from "./ask-model";

const HOW_TO_SAY: HowToSayCard = {
  type: "card",
  query: "몸이 안 좋으면 속상해",
  expressions: [
    { en: "I feel down when I'm not feeling well.", meaning: "몸이 안 좋을 때 마음도 가라앉아요", when: "내가 아플 때" },
    { en: "It hurts to see you unwell.", meaning: "네가 아픈 걸 보면 마음이 아파", when: "상대가 아플 때" },
  ],
  nuance:
    "'feel down'은 기운이 빠지고 울적한 상태를 부드럽게 말해요. 상대가 아플 때는 'It hurts to see…'처럼 보는 내 마음을 주어로 두면 자연스러워요.",
  examples: [
    { en: "I feel down when I'm not feeling well, so I just stay in.", l1: "몸이 안 좋으면 속상해서 그냥 집에 있어." },
    { en: "It hurts to see you unwell. Is there anything I can do?", l1: "네가 아픈 걸 보니 속상해. 내가 뭐 해 줄 거 있어?" },
    { en: "I always feel a bit down when I catch a cold.", l1: "감기에 걸리면 늘 좀 울적해져." },
  ],
  tip: "'upset'은 화가 난 느낌도 섞여 있어서, 아플 때의 속상함에는 'down'이 더 가까워요.",
  follow_ups: ["더 캐주얼하게는?", "'upset'은 언제 써?"],
};

const HOW_TO_SAY_ANSWER: AskAnswer = {
  type: "answer",
  text: "친한 사이에서는 문장을 줄여서 말해요. 'bummed'는 '아쉽고 속상한' 느낌의 구어 표현이에요.",
  expressions: [
    {
      en: "I get bummed out when I'm sick.",
      meaning: "아프면 기분이 처져",
      when: "친구 사이",
      example: { en: "I get bummed out when I'm sick and miss the weekend.", l1: "아파서 주말을 놓치면 속상해." },
    },
  ],
  follow_ups: ["격식 있게는?", "'bummed'랑 'sad' 차이는?"],
};

const NOTE: NoteCard = {
  type: "card",
  situation: "팀장님께 다음 주 금요일에 연차를 쓰고 싶다고 말하기",
  draft: {
    opening: "I wanted to talk to you about next Friday.",
    body: "I need to take the day off for personal reasons. I've checked the schedule and it won't affect our deadlines.",
    closing: "Let me know if that works. Thanks for understanding.",
  },
  key_phrases: [
    {
      en: "I wanted to talk to you about",
      meaning: "~에 대해 이야기하고 싶다",
      when: "업무, 중립",
      example: { en: "I wanted to talk to you about the project deadline.", l1: "프로젝트 마감일에 대해 이야기하고 싶어요." },
    },
    {
      en: "take the day off",
      meaning: "하루 휴가를 내다",
      when: "업무, 중립",
      example: { en: "I need to take the day off next Monday.", l1: "다음 주 월요일에 하루 휴가가 필요해요." },
    },
    {
      en: "Let me know if that works",
      meaning: "괜찮은지 알려 주세요",
      when: "업무, 중립",
      example: { en: "Let me know if that works for you.", l1: "그게 괜찮은지 알려 주세요." },
    },
  ],
  terms: [],
  follow_ups: ["더 공손하게 바꿔 줘", "더 짧게 줄여 줘"],
};

const NOTE_CLARIFY: NoteClarify = {
  type: "clarify",
  text: "어떤 말을 하고 싶은지 같이 정리해 볼게요.",
  question: "상대가 가장 기억했으면 하는 점은 무엇인가요?",
};

export type MockOutcome = { reply: AskReply } | { fail: "limit" | "error" };

/** The canned reply for this point in the conversation: a card for the first
 *  question in a mode, a short answer for a follow-up. */
export function mockReply(mode: AskMode, turns: AskTurn[], draftNow = false): MockOutcome {
  const last = turns[turns.length - 1];
  const asked = last?.role === "user" ? last.text.trim().toLowerCase() : "";
  if (asked === "/off") return { reply: { type: "off_topic" } };
  if (asked === "/limit") return { fail: "limit" };
  if (asked === "/error") return { fail: "error" };
  const answered = turns.some((t) => t.role === "assistant" && t.mode === mode && t.reply.type === "card");
  if (mode === "note") return { reply: draftNow ? NOTE : NOTE_CLARIFY };
  return { reply: answered ? HOW_TO_SAY_ANSWER : HOW_TO_SAY };
}
