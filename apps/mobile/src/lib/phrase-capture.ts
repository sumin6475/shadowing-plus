import { supabase } from "./supabase";
import type { PhraseKind } from "./phrases";

export interface PhraseCaptureDraft {
  contextText: string;
  contextTranslation: string;
  suggestedPhrase: string;
  kind: PhraseKind;
  meaning: string;
  usageNote: string;
  confidence: number;
}

// supabase-js reports every non-2xx as the same "Edge Function returned a
// non-2xx status code". The useful detail is in error.context (the Response):
// the function's {error} body, or a 404 when it isn't deployed. Surface that.
async function readFunctionError(error: { message?: string; context?: unknown }, unavailableCopy: string): Promise<string> {
  const ctx = error.context;
  if (ctx instanceof Response) {
    if (ctx.status === 404) return unavailableCopy;
    try {
      const body = await ctx.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // Non-JSON body — fall through to the generic message.
    }
  }
  return error.message || "Couldn’t read this screenshot.";
}

type CaptureResponse = {
  context_text?: string;
  context_translation?: string;
  suggested_phrase?: string;
  kind?: PhraseKind;
  meaning?: string;
  usage_note?: string;
  confidence?: number;
};

async function invokePhraseCapture(
  body:
    | { image_base64: string; mime_type: "image/jpeg" }
    | { context_text: string }
    | { phrase_text: string; context_text?: string },
  unavailableCopy: string,
): Promise<PhraseCaptureDraft> {
  const { data, error } = await supabase.functions.invoke<CaptureResponse>("phrase-capture", { body });
  if (error) throw new Error(await readFunctionError(error, unavailableCopy));
  return {
    contextText: data?.context_text?.trim() ?? "",
    contextTranslation: data?.context_translation?.trim() ?? "",
    suggestedPhrase: data?.suggested_phrase?.trim() ?? "",
    kind: data?.kind ?? "phrase",
    meaning: data?.meaning?.trim() ?? "",
    usageNote: data?.usage_note?.trim() ?? "",
    confidence: Math.max(0, Math.min(1, Number(data?.confidence ?? 0))),
  };
}

/** Private, authenticated OCR request. The Edge Function does not persist the image. */
export async function extractPhraseFromImage(imageBase64: string): Promise<PhraseCaptureDraft> {
  return invokePhraseCapture(
    { image_base64: imageBase64, mime_type: "image/jpeg" },
    "Photo reading isn’t available yet (server not deployed).",
  );
}

/** Draft phrase details from learner-provided text only when they ask for help. */
export async function extractPhraseFromText(contextText: string): Promise<PhraseCaptureDraft> {
  return invokePhraseCapture(
    { context_text: contextText },
    "Automatic filling isn’t available yet (server not deployed).",
  );
}

/** Draft metadata for the exact learner-selected phrase without rewriting it. */
export async function fillPhraseDetails(phraseText: string, contextText?: string): Promise<PhraseCaptureDraft> {
  return invokePhraseCapture(
    { phrase_text: phraseText, context_text: contextText || undefined },
    "Automatic filling isn’t available yet (server not deployed).",
  );
}
