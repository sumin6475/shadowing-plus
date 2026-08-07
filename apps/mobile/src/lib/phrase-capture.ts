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
  if (error) throw new Error(error.message || "Couldn’t read this screenshot.");
  return {
    contextText: data?.context_text?.trim() ?? "",
    suggestedPhrase: data?.suggested_phrase?.trim() ?? "",
    kind: data?.kind ?? "phrase",
    meaning: data?.meaning?.trim() ?? "",
    usageNote: data?.usage_note?.trim() ?? "",
    confidence: Math.max(0, Math.min(1, Number(data?.confidence ?? 0))),
  };
}
