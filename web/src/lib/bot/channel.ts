import type { SrsVerdict } from "@/lib/types";

// Channel-agnostic contract for the Review bot. A concrete adapter (Slack,
// Telegram, …) implements this; the cron + webhook routes are written against
// the interface, so switching channels is a new adapter, not a rewrite
// (ver2.0 phase-0 design §2).

/** One sentence to review, resolved from a due bookmark + its segment/video. */
export interface ReviewCard {
  bookmarkId: string;
  text: string;
  translation: string | null;
  videoTitle: string;
  /** Deep link into the app's player at this sentence, for optional shadowing. */
  deepLink?: string;
}

/** Normalized inbound event after a channel-specific payload is parsed. */
export type InboundEvent =
  | {
      kind: "verdict";
      bookmarkId: string;
      verdict: SrsVerdict;
      userRef: string;
      /** Channel-specific handle for acking the tap (e.g. Telegram's callback_query id). */
      ackRef?: string;
    }
  | { kind: "text"; text: string; userRef: string }
  | { kind: "connect"; token: string; userRef: string }
  | { kind: "ignore" };

/** Outcome of sending a batch — the message ref lets a later grade edit it. */
export interface SendResult {
  messageRef: string;
}

export interface ChannelAdapter {
  /** Send today's review cards, each as its own message with inline grade
   *  buttons. Returns a ref to the first sent message. */
  sendReviewBatch(userRef: string, cards: ReviewCard[]): Promise<SendResult>;

  /** Verify the request genuinely came from the channel (signing secret, etc.).
   *  Returns false → the webhook must reject with 401 before doing any work. */
  verifySignature(req: Request, rawBody: string): Promise<boolean>;

  /** Normalize a channel-specific inbound payload into an InboundEvent. */
  parseInbound(rawBody: string): Promise<InboundEvent>;

  /** After a card is graded, reflect it in the original message (✓ the card,
   *  reveal the next) and stop the channel's "processing" indicator on the tap
   *  (e.g. Telegram's callback spinner via ackRef). Best-effort — a failure
   *  here must not fail the grade. */
  acknowledgeGrade(
    userRef: string,
    messageRef: string,
    bookmarkId: string,
    verdict: SrsVerdict,
    ackRef?: string,
  ): Promise<void>;

  /** Optional: send a confirmation message once "Connect Telegram" succeeds. */
  acknowledgeConnect?(userRef: string): Promise<void>;
}
