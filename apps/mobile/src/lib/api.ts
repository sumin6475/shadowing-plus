import { supabase } from "./supabase";

/**
 * Authenticated fetch against the deployed web API.
 *
 * Every call attaches `Authorization: Bearer <access_token>` from the current
 * Supabase session and prefixes EXPO_PUBLIC_API_BASE_URL. The web routes accept
 * this token via `getSessionUserId(request)` (the same path the Chrome
 * extension uses) — the mobile app never touches cookies.
 *
 * This is the one place the app talks to the server, so token handling and
 * base-URL joining live here and nowhere else.
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_API_BASE_URL. Copy .env.example to .env and set the " +
      "deployed web API URL (e.g. https://shadowing-plus.vercel.app).",
  );
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Low-level authed fetch. Returns the raw Response so callers can stream, read
 * headers, etc. Prefer `apiJson` for the common JSON case.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...(init.headers as Record<string, string> | undefined),
    ...(await authHeader()),
  };
  return fetch(joinUrl(API_BASE_URL!, path), { ...init, headers });
}

/**
 * Authed JSON request. Throws ApiError on a non-2xx response, surfacing the
 * server's `{ error }` message when present so UI can show it as-is (e.g. the
 * clip-limit 429 already carries a user-ready message).
 */
export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // An HTML body (e.g. a Vercel 404 page) means the route wasn't reached —
      // usually a wrong EXPO_PUBLIC_API_BASE_URL. Surface a clear hint.
      throw new ApiError(
        res.status,
        `Expected JSON from ${path} but got a non-JSON body (status ${res.status}). ` +
          `Check EXPO_PUBLIC_API_BASE_URL.`,
      );
    }
  }

  if (!res.ok) {
    const message =
      (parsed as { error?: string } | undefined)?.error ??
      `Request to ${path} failed (${res.status})`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}
