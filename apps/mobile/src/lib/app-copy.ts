/** Explicit UI copy only: never translate user notes, phrases, or names. */
import { surfaceLanguage, useLanguagePreferences } from "./language-preferences";
import type { L1 } from "./first-language";
const COPY: Record<string, Partial<Record<L1, string>>> = {
  "First language": {
    "ko": "모국어",
    "ja": "第一言語",
    "zh-Hant": "第一語言",
    "es": "Lengua materna",
    "ru": "Родной язык"
  },
  "FIRST LANGUAGE": {
    "ko": "모국어",
    "ja": "第一言語",
    "zh-Hant": "第一語言",
    "es": "LENGUA MATERNA",
    "ru": "РОДНОЙ ЯЗЫК"
  },
  "Choose the language you use to understand English meanings.": {
    "ko": "영어 표현의 뜻을 이해할 때 사용할 언어를 선택하세요.",
    "ja": "英語表現の意味を理解するための言語を選んでください。",
    "zh-Hant": "選擇用來理解英文表達意思的語言。",
    "es": "Elige el idioma para comprender los significados en inglés.",
    "ru": "Выберите язык для понимания значений английских выражений."
  },
  "WHERE TO USE IT": {
    "ko": "모국어 사용 범위",
    "ja": "使用する範囲",
    "zh-Hant": "使用範圍",
    "es": "DÓNDE USARLA",
    "ru": "ГДЕ ИСПОЛЬЗОВАТЬ"
  },
  "Use first language everywhere": {
    "ko": "모두 모국어로 보기",
    "ja": "すべて第一言語で表示",
    "zh-Hant": "全部使用第一語言",
    "es": "Usar la lengua materna en todo",
    "ru": "Использовать родной язык везде"
  },
  "Turn all three options on or off. Off uses English.": {
    "ko": "세 항목을 한 번에 켜거나 끕니다. 끄면 영어를 사용합니다.",
    "ja": "3つの項目をまとめて切り替えます。オフにすると英語を使います。",
    "zh-Hant": "一次開關三個選項。關閉時使用英文。",
    "es": "Activa o desactiva las tres opciones. Al desactivarlas se usa inglés.",
    "ru": "Включите или выключите все три пункта. При выключении используется английский."
  },
  "App settings & guidance": {
    "ko": "앱 설정 및 안내",
    "ja": "アプリの設定と案内",
    "zh-Hant": "應用程式設定與說明",
    "es": "Ajustes y ayuda de la app",
    "ru": "Настройки и подсказки"
  },
  "Use your first language for available settings and app explanations.": {
    "ko": "지원되는 앱 설정과 사용 안내를 모국어로 표시합니다.",
    "ja": "対応する設定や使い方を第一言語で表示します。",
    "zh-Hant": "以第一語言顯示支援的設定與使用說明。",
    "es": "Usa tu lengua materna en los ajustes y las explicaciones disponibles.",
    "ru": "Родной язык для доступных настроек и пояснений приложения."
  },
  "AI replies & note titles": {
    "ko": "AI 답변 및 노트 제목",
    "ja": "AIの回答とノートのタイトル",
    "zh-Hant": "AI 回覆與筆記標題",
    "es": "Respuestas de IA y títulos",
    "ru": "Ответы ИИ и заголовки заметок"
  },
  "Default language for How can I say, note conversations, and generated note titles.": {
    "ko": "How can I say, 노트 대화와 자동 생성 제목의 기본 언어입니다.",
    "ja": "How can I say、ノートの会話、自動タイトルの既定の言語です。",
    "zh-Hant": "How can I say、筆記對話與自動產生標題的預設語言。",
    "es": "Idioma predeterminado para How can I say, conversaciones de notas y títulos generados.",
    "ru": "Язык по умолчанию для How can I say, диалогов в заметках и создаваемых заголовков."
  },
  "Self-talk feedback": {
    "ko": "Self-talk 피드백",
    "ja": "セルフトークのフィードバック",
    "zh-Hant": "自言自語回饋",
    "es": "Comentarios sobre tu práctica",
    "ru": "Обратная связь по практике"
  },
  "Explain feedback in your first language. English examples stay in English.": {
    "ko": "피드백 설명은 모국어로, 영어 예문은 영어로 표시합니다.",
    "ja": "説明は第一言語で表示し、英語の例文は英語のままにします。",
    "zh-Hant": "以第一語言解釋回饋，英文例句維持英文。",
    "es": "Explica los comentarios en tu lengua materna. Los ejemplos siguen en inglés.",
    "ru": "Пояснения на родном языке. Примеры остаются на английском."
  },
  "Meanings · Always on": {
    "ko": "Meaning · 항상 켜짐",
    "ja": "意味 · 常にオン",
    "zh-Hant": "意思 · 一律開啟",
    "es": "Significados · Siempre activo",
    "ru": "Значения · Всегда включено"
  },
  "Meanings always use your first language. These switches do not change them.": {
    "ko": "표현의 뜻은 항상 모국어로 표시되며, 위 설정의 영향을 받지 않습니다.",
    "ja": "意味は常に第一言語で表示されます。この設定では変わりません。",
    "zh-Hant": "意思一律以第一語言顯示，不受這些開關影響。",
    "es": "Los significados siempre usan tu lengua materna. Estos ajustes no los cambian.",
    "ru": "Значения всегда на родном языке. Эти настройки на них не влияют."
  },
  "Settings": {
    "ko": "설정",
    "ja": "設定",
    "zh-Hant": "設定",
    "es": "Ajustes",
    "ru": "Настройки"
  },
  "Preferences": {
    "ko": "환경 설정",
    "ja": "環境設定",
    "zh-Hant": "偏好設定",
    "es": "Preferencias",
    "ru": "Предпочтения"
  },
  "English level": {
    "ko": "영어 수준",
    "ja": "英語レベル",
    "zh-Hant": "英文程度",
    "es": "Nivel de inglés",
    "ru": "Уровень английского"
  },
  "Theme": {
    "ko": "테마",
    "ja": "テーマ",
    "zh-Hant": "主題",
    "es": "Tema",
    "ru": "Тема"
  },
  "Phrases per day": {
    "ko": "하루 표현 수",
    "ja": "1日の表現数",
    "zh-Hant": "每日表達數",
    "es": "Expresiones por día",
    "ru": "Выражений в день"
  },
  "Notifications": {
    "ko": "알림",
    "ja": "通知",
    "zh-Hant": "通知",
    "es": "Notificaciones",
    "ru": "Уведомления"
  },
  "Reminders": {
    "ko": "리마인더",
    "ja": "リマインダー",
    "zh-Hant": "提醒",
    "es": "Recordatorios",
    "ru": "Напоминания"
  },
  "Account": {
    "ko": "계정",
    "ja": "アカウント",
    "zh-Hant": "帳號",
    "es": "Cuenta",
    "ru": "Аккаунт"
  },
  "Change password": {
    "ko": "비밀번호 변경",
    "ja": "パスワード変更",
    "zh-Hant": "變更密碼",
    "es": "Cambiar contraseña",
    "ru": "Изменить пароль"
  },
  "Export my phrases": {
    "ko": "내 표현 내보내기",
    "ja": "表現をエクスポート",
    "zh-Hant": "匯出我的表達",
    "es": "Exportar mis expresiones",
    "ru": "Экспорт выражений"
  },
  "Help & feedback": {
    "ko": "도움말 및 피드백",
    "ja": "ヘルプとフィードバック",
    "zh-Hant": "說明與回饋",
    "es": "Ayuda y comentarios",
    "ru": "Помощь и обратная связь"
  },
  "Privacy": {
    "ko": "개인정보 보호",
    "ja": "プライバシー",
    "zh-Hant": "隱私權",
    "es": "Privacidad",
    "ru": "Конфиденциальность"
  },
  "Terms of Service": {
    "ko": "이용약관",
    "ja": "利用規約",
    "zh-Hant": "服務條款",
    "es": "Términos de servicio",
    "ru": "Условия использования"
  },
  "Log out": {
    "ko": "로그아웃",
    "ja": "ログアウト",
    "zh-Hant": "登出",
    "es": "Cerrar sesión",
    "ru": "Выйти"
  },
  "Delete account": {
    "ko": "계정 삭제",
    "ja": "アカウントを削除",
    "zh-Hant": "刪除帳號",
    "es": "Eliminar cuenta",
    "ru": "Удалить аккаунт"
  },
  "Edit profile": {
    "ko": "프로필 수정",
    "ja": "プロフィール編集",
    "zh-Hant": "編輯個人資料",
    "es": "Editar perfil",
    "ru": "Изменить профиль"
  },
  "Set your learning goal": {
    "ko": "학습 목표를 설정하세요",
    "ja": "学習目標を設定",
    "zh-Hant": "設定學習目標",
    "es": "Define tu objetivo de aprendizaje",
    "ru": "Задайте цель обучения"
  }
};
export function useAppCopy(): (text: string) => string {
  useLanguagePreferences();
  const language = surfaceLanguage("app");
  return (text) => COPY[text]?.[language] ?? text;
}
