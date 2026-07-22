import OpenAI from "openai";
import { NextRequest } from "next/server";
import { extensionCors, extensionJson, getExtensionUserId } from "@/lib/extension-auth";

export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCors(req) });
}

export async function POST(req: NextRequest) {
  if (!(await getExtensionUserId(req))) {
    return extensionJson(req, { error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 1_200) {
    return extensionJson(req, { error: "Provide a sentence of up to 1,200 characters." }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Translate English subtitles into concise, natural Korean. Return only the Korean translation." },
        { role: "user", content: text },
      ],
    });
    return extensionJson(req, { translation: result.choices[0]?.message?.content?.trim() ?? "" });
  } catch (error) {
    console.error("Extension translation failed:", error);
    return extensionJson(req, { error: "Translation is temporarily unavailable." }, { status: 502 });
  }
}
