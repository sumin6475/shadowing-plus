import { supabase } from "./supabase";
import type { PhraseKind } from "./phrases";

export interface OcrPhraseDraft {
  contextText: string;
  suggestedPhrase: string;
  kind: PhraseKind;
  meaning: string;
  usageNote: string;
  confidence: number;
}

// supabase-js reports every non-2xx as the same "Edge Function returned a
// non-2xx status code". The useful detail is in error.context (the Response):
// the function's {error} body, or a 404 when it isn't deployed. Surface that.
async function readFunctionError(error: { message?: string; context?: unknown }): Promise<string> {
  const ctx = error.context;
  if (ctx instanceof Response) {
    if (ctx.status === 404) return "Screenshot reading isn’t available yet (server not deployed).";
    try {
      const body = await ctx.clone().json();
      if (body && typeof body.error === "string") return body.error;
    } catch {
      // Non-JSON body — fall through to the generic message.
    }
  }
  return error.message || "Couldn’t read this screenshot.";
}

/** Private, authenticated OCR request. The Edge Function does not persist the image. */
export async function extractPhraseFromImage(imageBase64: string): Promise<OcrPhraseDraft> {
  const { data, error } = await supabase.functions.invoke<{
    context_text?: string;
    suggested_phrase?: string;
    kind?: PhraseKind;
    meaning?: string;
    usage_note?: string;
    confidence?: number;
  }>("phrase-capture", {
    body: { image_base64: imageBase64, mime_type: "image/jpeg" },
  });
  if (error) throw new Error(await readFunctionError(error));
  return {
    contextText: data?.context_text?.trim() ?? "",
    suggestedPhrase: data?.suggested_phrase?.trim() ?? "",
    kind: data?.kind ?? "phrase",
    meaning: data?.meaning?.trim() ?? "",
    usageNote: data?.usage_note?.trim() ?? "",
    confidence: Math.max(0, Math.min(1, Number(data?.confidence ?? 0))),
  };
}
