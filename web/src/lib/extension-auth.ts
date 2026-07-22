import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Verify an extension's Supabase bearer token without accepting a cookie. */
export async function getExtensionUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  const {
    data: { user },
    error,
  } = await supabaseAdmin().auth.getUser(token);
  return error ? null : (user?.id ?? null);
}

/**
 * Extension requests are cross-origin. Keep CORS opt-in: production must set
 * EXTENSION_ALLOWED_ORIGIN to its fixed chrome-extension://<id> origin.
 */
export function extensionCors(req: NextRequest): HeadersInit {
  const origin = req.headers.get("origin");
  const allowed = process.env.EXTENSION_ALLOWED_ORIGIN;
  if (!origin || !allowed || origin !== allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

export function extensionJson(
  req: NextRequest,
  body: unknown,
  init: ResponseInit = {},
) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...extensionCors(req), ...(init.headers ?? {}) },
  });
}
