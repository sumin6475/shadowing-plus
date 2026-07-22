import { NextRequest } from "next/server";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";

export const dynamic = "force-dynamic";

type DictionaryEntry = {
  word?: unknown;
  phonetic?: unknown;
  phonetics?: unknown;
  meanings?: unknown;
};

type DictionaryMeaning = {
  partOfSpeech?: unknown;
  definitions?: unknown;
};

/**
 * Small authenticated proxy for the key-free Free Dictionary API. Keeping the
 * request server-side avoids adding a broad third-party host permission to the
 * extension and gives the panel one stable, minimal response shape.
 */
export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

export async function GET(req: NextRequest) {
  const userId = await getExtensionUserId(req);
  if (!userId) return extensionJson(req, { error: "Unauthorized" }, { status: 401 });

  const word = (req.nextUrl.searchParams.get("word") ?? "").trim().toLowerCase();
  if (!/^[a-z][a-z'-]{0,63}$/i.test(word)) {
    return extensionJson(req, { error: "Enter a single English word." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      next: { revalidate: 86_400 },
    });
  } catch {
    return extensionJson(req, { error: "Dictionary is temporarily unavailable." }, { status: 503 });
  }

  if (response.status === 404) {
    return extensionJson(req, { error: "No dictionary entry was found." }, { status: 404 });
  }
  if (!response.ok) {
    return extensionJson(req, { error: "Dictionary is temporarily unavailable." }, { status: 503 });
  }

  const payload = (await response.json().catch(() => [])) as DictionaryEntry[];
  const entry = payload[0];
  if (!entry) return extensionJson(req, { error: "No dictionary entry was found." }, { status: 404 });

  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const phonetic = typeof entry.phonetic === "string"
    ? entry.phonetic
    : phonetics.find((item) => item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") as { text: string } | undefined;
  const meanings = (Array.isArray(entry.meanings) ? entry.meanings : [])
    .filter((meaning): meaning is DictionaryMeaning => Boolean(meaning && typeof meaning === "object"))
    .slice(0, 3)
    .map((meaning) => ({
      partOfSpeech: typeof meaning.partOfSpeech === "string" ? meaning.partOfSpeech : "",
      definitions: (Array.isArray(meaning.definitions) ? meaning.definitions : [])
        .filter((definition): definition is { definition?: unknown; example?: unknown } => Boolean(definition && typeof definition === "object"))
        .map((definition) => ({
          definition: typeof definition.definition === "string" ? definition.definition : "",
          example: typeof definition.example === "string" ? definition.example : "",
        }))
        .filter((definition) => definition.definition)
        .slice(0, 2),
    }))
    .filter((meaning) => meaning.definitions.length > 0);

  return extensionJson(req, {
    word: typeof entry.word === "string" ? entry.word : word,
    phonetic: typeof phonetic === "string" ? phonetic : phonetic?.text ?? "",
    meanings,
  });
}
