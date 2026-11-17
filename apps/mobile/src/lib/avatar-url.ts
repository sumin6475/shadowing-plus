// avatar-url.ts — which photo the learner's avatar shows. Pure, so it's tested.
//
// Supabase rewrites `avatar_url` / `picture` from the provider's profile on
// every Google (or other OAuth) sign-in, including into an account first made
// with email. A photo the learner uploaded would be replaced by their Google
// photo. `avatar_path` (and `avatar_version`) are keys only this app writes,
// so when a path is set the uploaded photo wins and its URL is rebuilt here.

export type AvatarMeta = {
  avatar_url?: string;
  avatar_path?: string;
  avatar_version?: string | number;
  picture?: string;
};

/** Cache-buster from an earlier upload's stored URL (`…/avatar.jpg?t=123`). */
function versionFromUrl(url: string | undefined, path: string): string | null {
  if (!url || !url.includes(path)) return null;
  const match = /[?&]t=([^&#]+)/.exec(url);
  return match ? match[1] : null;
}

export function resolveAvatarUrl(
  meta: Record<string, unknown> | undefined | null,
  publicUrlFor: (path: string) => string,
): string | null {
  const data = (meta ?? {}) as AvatarMeta;
  const path = typeof data.avatar_path === "string" ? data.avatar_path.trim() : "";
  if (path) {
    const version =
      (data.avatar_version != null && String(data.avatar_version).trim()) ||
      versionFromUrl(data.avatar_url?.trim(), path);
    const base = publicUrlFor(path);
    return version ? `${base}${base.includes("?") ? "&" : "?"}t=${encodeURIComponent(version)}` : base;
  }
  const url = data.avatar_url?.trim();
  if (url) return url;
  const picture = data.picture?.trim();
  return picture || null;
}
