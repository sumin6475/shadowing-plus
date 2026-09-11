// product-tour.ts — first-run coach marks on the Today tab.
//
// The signed-out `onboarding.ts` flow teaches the *idea* (record a first
// story). This teaches the *app*: after the very first sign-in, Today dims and
// spotlights the four controls a learner has to find on their own otherwise —
// Speaking, the daily review card, the profile avatar, and the tab bar.
//
// Language: the tour explains the app's own chrome, and that chrome is in
// English (Today, Phrases, Studio, Speaking). So the tour is **English by
// default** — including on a Korean phone, and for App Review. It switches to
// the learner's L1 only once they have actually chosen one in Settings, which
// keeps the N:1 promise (see first-language.ts) without guessing from a locale.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { firstLanguage, firstLanguageIsExplicit, type L1 } from "./first-language";

/** Bump the version suffix to re-show the tour after the Today layout changes. */
export const PRODUCT_TOUR_STORAGE_KEY = "saylo.tour.today.v1";

export type TourStepId = "speak" | "review" | "profile" | "tabs";

/** Render order. `tabs` is last because its cutout is computed, not measured. */
export const TOUR_STEPS: readonly TourStepId[] = ["speak", "review", "profile", "tabs"] as const;

export interface TourStepCopy {
  title: string;
  body: string;
}

interface TourCopy {
  steps: Record<TourStepId, TourStepCopy>;
  next: string;
  last: string;
  skip: string;
  /** Screen-reader label for the whole overlay. */
  a11yLabel: string;
}

const COPY: Record<L1, TourCopy> = {
  en: {
    steps: {
      speak: {
        title: "Start here",
        body: "Tap Speaking and talk for a minute. Saylo listens on this device and turns what you said into text you can review.",
      },
      review: {
        title: "Your week, and today’s list",
        body: "Every phrase you keep lands here. Just below, Today counts down the ones due for review — finish the list and you’re done for the day.",
      },
      profile: {
        title: "You, and your privacy",
        body: "Your profile holds your English level, first language, reminders, and the privacy switch for AI feedback.",
      },
      tabs: {
        title: "Phrases is your bank",
        body: "Every phrase you keep ends up here, with the moment it came from. Studio next to it holds your stories, and the mic circle opens Talk from anywhere.",
      },
    },
    next: "Next",
    last: "Got it",
    skip: "Skip",
    a11yLabel: "Welcome tour",
  },
  ko: {
    steps: {
      speak: {
        title: "여기서 시작하세요",
        body: "Speaking을 누르고 1분만 말해보세요. 음성 인식은 이 기기 안에서 처리되고, 말한 내용은 다시 볼 수 있는 텍스트로 남아요.",
      },
      review: {
        title: "이번 주, 그리고 오늘 할 일",
        body: "저장한 표현이 모두 여기에 쌓여요. 바로 아래 Today 카드가 오늘 복습할 개수를 세어 주고, 그 목록만 비우면 오늘 몫은 끝입니다.",
      },
      profile: {
        title: "프로필과 개인정보",
        body: "영어 레벨, 모국어, 알림, 그리고 AI 피드백 동의 스위치가 모두 프로필 안에 있어요.",
      },
      tabs: {
        title: "Phrases가 내 표현 보관함",
        body: "저장한 표현이 그 표현을 만난 순간과 함께 모두 여기에 모여요. 옆의 Studio에는 내 이야기들이 있고, 마이크 버튼은 어디서든 Talk을 엽니다.",
      },
    },
    next: "다음",
    last: "시작하기",
    skip: "건너뛰기",
    a11yLabel: "시작 안내",
  },
  "zh-Hant": {
    steps: {
      speak: {
        title: "從這裡開始",
        body: "點一下 Speaking，說個一分鐘。語音辨識在這台裝置上完成，說過的話會變成可以回頭檢視的文字。",
      },
      review: {
        title: "這一週，還有今天的清單",
        body: "你存下的每個句子都會來到這裡。下面的 Today 會數出今天該複習的數量，清完那張清單，今天就完成了。",
      },
      profile: {
        title: "你的檔案與隱私",
        body: "英文程度、母語、提醒，還有 AI 回饋的同意開關，都放在個人檔案裡。",
      },
      tabs: {
        title: "Phrases 是你的句庫",
        body: "你存下的每個句子都會收在這裡，連同當初用上它的那個瞬間。旁邊的 Studio 放你的故事，麥克風圓鈕則能隨時打開 Talk。",
      },
    },
    next: "下一步",
    last: "開始使用",
    skip: "略過",
    a11yLabel: "歡迎導覽",
  },
  ja: {
    steps: {
      speak: {
        title: "ここから始めましょう",
        body: "Speaking をタップして、1分だけ話してみてください。音声認識はこの端末の中で処理され、話した内容は後から見直せるテキストとして残ります。",
      },
      review: {
        title: "今週の記録と、今日のリスト",
        body: "保存したフレーズはすべてここに集まります。すぐ下の Today が今日復習する数を数えてくれるので、そのリストを終えれば今日の分は完了です。",
      },
      profile: {
        title: "プロフィールとプライバシー",
        body: "英語のレベル、母語、リマインダー、そして AI フィードバックの同意スイッチは、すべてプロフィールの中にあります。",
      },
      tabs: {
        title: "Phrases があなたの保管庫",
        body: "保存したフレーズは、それが必要になった場面ごとここに集まります。隣の Studio にはあなたのストーリーが入っていて、マイクの丸ボタンからはどこでも Talk を開けます。",
      },
    },
    next: "次へ",
    last: "はじめる",
    skip: "スキップ",
    a11yLabel: "ようこそツアー",
  },
  es: {
    steps: {
      speak: {
        title: "Empieza aquí",
        body: "Toca Speaking y habla un minuto. Saylo te escucha en este dispositivo y convierte lo que dijiste en texto que puedes repasar.",
      },
      review: {
        title: "Tu semana y la lista de hoy",
        body: "Cada frase que guardas aparece aquí. Justo debajo, Today cuenta las que toca repasar: termina esa lista y el día está hecho.",
      },
      profile: {
        title: "Tu perfil y tu privacidad",
        body: "Aquí están tu nivel de inglés, tu idioma materno, los recordatorios y el permiso para el feedback con IA.",
      },
      tabs: {
        title: "Phrases es tu banco",
        body: "Cada frase que guardas acaba aquí, junto al momento en que la necesitaste. Al lado, Studio guarda tus historias, y el círculo del micrófono abre Talk desde cualquier sitio.",
      },
    },
    next: "Siguiente",
    last: "Entendido",
    skip: "Omitir",
    a11yLabel: "Recorrido de bienvenida",
  },
  ru: {
    steps: {
      speak: {
        title: "Начните отсюда",
        body: "Нажмите Speaking и говорите минуту. Распознавание идёт на этом устройстве, а сказанное сохраняется текстом для разбора.",
      },
      review: {
        title: "Ваша неделя и список на сегодня",
        body: "Каждая сохранённая фраза попадает сюда. Чуть ниже карточка Today считает те, что пора повторить: закончили список — день закрыт.",
      },
      profile: {
        title: "Профиль и приватность",
        body: "Здесь ваш уровень английского, родной язык, напоминания и переключатель согласия на ИИ-разбор.",
      },
      tabs: {
        title: "Phrases — ваш банк фраз",
        body: "Каждая сохранённая фраза попадает сюда вместе с моментом, когда она понадобилась. Рядом Studio хранит ваши истории, а круг с микрофоном открывает Talk откуда угодно.",
      },
    },
    next: "Далее",
    last: "Понятно",
    skip: "Пропустить",
    a11yLabel: "Приветственный тур",
  },
};

/** Coach-mark copy: English unless the learner has chosen a first language. */
export function productTourCopy(): TourCopy {
  return COPY[firstLanguageIsExplicit() ? firstLanguage() : "en"];
}

/** True once the learner has finished or skipped the tour on this device. */
export async function hasSeenProductTour(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PRODUCT_TOUR_STORAGE_KEY)) === "1";
  } catch {
    // Storage unavailable — treat as seen so a broken read can never trap the
    // learner behind a dim overlay on every launch.
    return true;
  }
}

export async function markProductTourSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(PRODUCT_TOUR_STORAGE_KEY, "1");
  } catch {
    // The in-session flag already hides it; worst case it shows once more.
  }
}

/** Settings → "Show tips again". */
export async function resetProductTour(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PRODUCT_TOUR_STORAGE_KEY);
  } catch {
    // Nothing to undo.
  }
}
