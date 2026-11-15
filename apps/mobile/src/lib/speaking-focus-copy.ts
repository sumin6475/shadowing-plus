import type { L1 } from "./first-language";
export interface FocusCopy {
  prompt: string;
  opening: string;
  bullets: string[];
  closing: string;
  hint: string;
}
export const FOCUS_COPY: Record<L1, FocusCopy> = {
  ko: {
    prompt: "현재 집중 중인 고치고 싶은 약점에 대해서 적어주세요.",
    opening: "내 생각을 상대방이 쉽게 따라올 수 있게 전달하고 싶어요.",
    bullets: [
      "this, they, it이 무엇인지 명확하게 말하기",
      "explain something to someone처럼 표현을 덩어리로 사용하기",
    ],
    closing: "짧고 명확한 영어로, 내 말투와 의미를 유지하고 싶어요.",
    hint: "다음 말하기 피드백에 반영돼요. 편한 언어로 적어주세요.",
  },
  en: {
    prompt: "Describe the speaking weaknesses you’re currently focusing on.",
    opening:
      "I want to express my thoughts so other people can follow them easily.",
    bullets: [
      "Make it clear what this, they, and it refer to",
      "Learn expressions as chunks, like explain something to someone",
    ],
    closing:
      "I want to use short, clear English while keeping my own meaning and voice.",
    hint:
      "Used for your next speaking feedback. Write in any language you’re comfortable with.",
  },
  "zh-Hant": {
    prompt: "請描述你目前想改善的口說弱點。",
    opening: "我想清楚地表達想法，讓別人容易理解。",
    bullets: [
      "說清楚 this、they、it 分別指的是什麼",
      "把 explain something to someone 這類表達當成一個整體來練習",
    ],
    closing: "我希望用簡短、清楚的英文，保留自己的意思和語氣。",
    hint: "這些內容會用於下次口說回饋。可以用你習慣的語言填寫。",
  },
  ja: {
    prompt: "今、改善したいと思っている話し方の弱点を書いてください。",
    opening: "自分の考えを、相手が理解しやすいように伝えたいです。",
    bullets: [
      "this、they、it が何を指すのかをはっきりさせる",
      "explain something to someone のように、表現をひとまとまりで使う",
    ],
    closing: "自分の意味や話し方を保ちながら、短く明確な英語を使いたいです。",
    hint:
      "次のスピーキングのフィードバックに反映されます。書きやすい言語でどうぞ。",
  },
  es: {
    prompt:
      "Describe los aspectos de tu expresión oral que quieres mejorar ahora.",
    opening:
      "Quiero expresar mis ideas de forma que los demás puedan seguirlas con facilidad.",
    bullets: [
      "Dejar claro a qué se refieren this, they e it",
      "Aprender expresiones completas, como explain something to someone",
    ],
    closing:
      "Quiero usar un inglés breve y claro sin cambiar mi intención ni mi forma de hablar.",
    hint:
      "Se usará en tu próxima sesión de feedback. Escribe en el idioma que prefieras.",
  },
  ru: {
    prompt: "Опишите, какие слабые стороны речи вы сейчас хотите исправить.",
    opening:
      "Я хочу выражать свои мысли так, чтобы другим было легко меня понимать.",
    bullets: [
      "Чётко обозначать, к кому или чему относятся this, they и it",
      "Учить выражения целиком, например explain something to someone",
    ],
    closing:
      "Я хочу говорить по-английски коротко и ясно, сохраняя свой смысл и манеру речи.",
    hint:
      "Это будет учтено в следующей обратной связи. Пишите на удобном вам языке.",
  },
};
/** Formatting-only paragraphs and zero-width composition markers are empty. */
export function hasFocusText(text: string) {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().length > 0;
}
export function focusWithinLimit(text: string, html: string) {
  return [...text].length <= 12000 &&
    new TextEncoder().encode(html).length <= 60000;
}
