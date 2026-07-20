import { countActiveClips } from "@/lib/pipeline/jobs";

// Per-user clip cap — the cost guardrail for open public signup.
//
// Signup is open (anyone can create an account at /login) and every clip runs
// the paid pipeline (ASR + GPT translation + R2), so an uncapped account is a
// direct financial liability: a loop of uploads bills the owner. This caps how
// many clips one account can hold, enforced server-side at the upload entry
// point — the client can't bypass it.
//
// The limit is env-tunable so it can be loosened mid-beta without a redeploy,
// and owners are exempt so the solo dev's own study use isn't throttled.

const DEFAULT_CLIP_LIMIT = 20;

/** Max clips a non-owner account may hold. `CLIP_LIMIT_PER_USER` overrides. */
export function clipLimit(): number {
  const raw = Number(process.env.CLIP_LIMIT_PER_USER);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_CLIP_LIMIT;
}

// Owners are exempt from the cap. Prefer a dedicated `NEXT_PUBLIC_OWNER_IDS`
// list; fall back to the existing YouTube-import allowlist so the owner is
// already covered without setting a second env. Unset ⇒ nobody is exempt (the
// cap applies to everyone, the safe default). Ids aren't secret, so NEXT_PUBLIC
// is fine and lets the client hide the "add clip" affordance too if it wants.
function ownerIds(): Set<string> {
  const raw =
    process.env.NEXT_PUBLIC_OWNER_IDS ??
    process.env.NEXT_PUBLIC_YOUTUBE_IMPORT_ALLOWLIST ??
    "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isOwner(userId: string): boolean {
  return ownerIds().has(userId);
}

export interface ClipQuota {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Whether `userId` may create one more clip. Owners always may. Otherwise the
 * caller's current clip count must be under the limit.
 */
export async function checkClipQuota(userId: string): Promise<ClipQuota> {
  if (isOwner(userId)) {
    return { allowed: true, count: 0, limit: Number.POSITIVE_INFINITY };
  }
  const limit = clipLimit();
  const count = await countActiveClips(userId);
  return { allowed: count < limit, count, limit };
}
