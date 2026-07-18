import type {
  ChannelAdapter,
  InboundEvent,
  ReviewCard,
  SendResult,
} from "./channel";
import type { SrsVerdict } from "@/lib/types";

// Telegram adapter for the Review bot. Chosen over Slack because a Telegram bot
// can proactively DM any user who has /start-ed it (Slack can't cold-DM
// non-workspace users) — see the channel research. Uses the Bot API over fetch.
//
// Auth model: at setWebhook time we register a secret_token; Telegram echoes it
// in the `X-Telegram-Bot-Api-Secret-Token` header on every webhook call. That
// header match IS the signature check.

const API = (method: string) =>
  `https://api.telegram.org/bot${requireToken()}/${method}`;

function requireToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

async function call<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  }
  return json.result as T;
}

const VERDICT_LABELS: Record<SrsVerdict, string> = {
  again: "😵 Again",
  good: "🙂 Good",
  easy: "😎 Easy",
};

// callback_data is capped at 64 bytes by Telegram; "grade:<uuid>:<verdict>"
// (~7 + 36 + 1 + 4) fits comfortably.
function callbackData(bookmarkId: string, verdict: SrsVerdict): string {
  return `grade:${bookmarkId}:${verdict}`;
}

// One card per message: header shows progress (e.g. "Review 2/5"), then the
// sentence and its translation. Each message carries its own grade buttons, so
// every card is independently gradable (the old batched layout only wired
// buttons to the first card).
function cardText(card: ReviewCard, index: number, total: number): string {
  const lines = [`*Review ${index + 1}/${total}*`, "", card.text];
  if (card.translation) lines.push(`_${card.translation}_`);
  return lines.join("\n");
}

function keyboardFor(card: ReviewCard) {
  const row = (["again", "good", "easy"] as SrsVerdict[]).map((v) => ({
    text: VERDICT_LABELS[v],
    callback_data: callbackData(card.bookmarkId, v),
  }));
  const buttons: { text: string; callback_data?: string; url?: string }[][] = [row];
  if (card.deepLink) {
    buttons.push([{ text: "▶️ Shadow in app", url: card.deepLink }]);
  }
  return { inline_keyboard: buttons };
}

export const telegramAdapter: ChannelAdapter = {
  async sendReviewBatch(userRef, cards): Promise<SendResult> {
    // One message per card, sent in order. A single card's failure must not
    // abort the rest of the batch (mirrors the cron route's per-user isolation),
    // so each send is wrapped; we surface the first successful message_id as the
    // batch's ref and swallow the rest.
    let firstRef: string | null = null;
    const total = cards.length;
    for (let i = 0; i < total; i++) {
      try {
        const result = await call<{ message_id: number }>("sendMessage", {
          chat_id: userRef,
          text: cardText(cards[i], i, total),
          parse_mode: "Markdown",
          reply_markup: keyboardFor(cards[i]),
        });
        if (firstRef === null) firstRef = String(result.message_id);
      } catch {
        // Skip this card, keep sending the others. The grade flow is per-card,
        // so a dropped card just means one fewer review today — not a failure.
      }
    }
    if (firstRef === null) {
      // Every card failed to send — let the cron route record this as a failure.
      throw new Error("sendReviewBatch: all cards failed to send");
    }
    return { messageRef: firstRef };
  },

  async verifySignature(req): Promise<boolean> {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) return false;
    return req.headers.get("x-telegram-bot-api-secret-token") === expected;
  },

  async parseInbound(rawBody): Promise<InboundEvent> {
    let update: {
      callback_query?: {
        id: string;
        data?: string;
        from?: { id: number };
        message?: { chat?: { id: number } };
      };
      message?: { text?: string; chat?: { id: number } };
    };
    try {
      update = JSON.parse(rawBody);
    } catch {
      return { kind: "ignore" };
    }

    const cq = update.callback_query;
    if (cq?.data?.startsWith("grade:")) {
      const [, bookmarkId, verdict] = cq.data.split(":");
      const chatId = cq.message?.chat?.id ?? cq.from?.id;
      if (
        bookmarkId &&
        (verdict === "again" || verdict === "good" || verdict === "easy") &&
        chatId != null
      ) {
        return {
          kind: "verdict",
          bookmarkId,
          verdict: verdict as SrsVerdict,
          userRef: String(chatId),
          ackRef: cq.id,
        };
      }
      return { kind: "ignore" };
    }

    const msg = update.message;
    if (msg?.text && msg.chat?.id != null) {
      // "/start <token>" is Telegram's deep-link handoff: t.me/<bot>?start=<token>
      // arrives here as this exact command. The token ties the tap back to the
      // app user who requested the connection (see the settings modal's
      // "Connect Telegram" flow).
      const startMatch = msg.text.match(/^\/start(?:@\S+)?(?:\s+(\S+))?/);
      if (startMatch?.[1]) {
        return { kind: "connect", token: startMatch[1], userRef: String(msg.chat.id) };
      }
      return { kind: "text", text: msg.text, userRef: String(msg.chat.id) };
    }

    return { kind: "ignore" };
  },

  async acknowledgeGrade(userRef, messageRef, _bookmarkId, verdict, ackRef): Promise<void> {
    // answerCallbackQuery is what actually stops Telegram's tap spinner; without
    // it the button just spins until the client gives up. editMessageReplyMarkup
    // separately clears the buttons so the card reads as done. Both best-effort —
    // the grade already persisted, so a failure here must not surface as an error.
    if (ackRef) {
      try {
        await call("answerCallbackQuery", {
          callback_query_id: ackRef,
          text: `Graded: ${VERDICT_LABELS[verdict]}`,
        });
      } catch {
        // ignore — UI polish is non-critical
      }
    }
    try {
      await call("editMessageReplyMarkup", {
        chat_id: userRef,
        message_id: Number(messageRef),
        reply_markup: { inline_keyboard: [] },
      });
    } catch {
      // ignore — the grade already persisted; UI polish is non-critical
    }
  },

  async acknowledgeConnect(userRef): Promise<void> {
    try {
      await call("sendMessage", {
        chat_id: userRef,
        text: "✅ Connected! Your daily review will arrive here.",
      });
    } catch {
      // ignore — the connection already persisted; this is just a nicety
    }
  },
};
