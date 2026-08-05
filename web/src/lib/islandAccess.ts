/**
 * Language Island is ADMIN-ONLY for now.
 *
 * The flow (shape beats → Speak Loop) isn't finished, so it must not appear for
 * regular accounts in production. Visibility reuses the owner/admin allowlist
 * convention from `quota.ts`: only the Supabase user ids listed in
 * NEXT_PUBLIC_OWNER_IDS (comma-separated) — i.e. the owner — see the nav tab,
 * can open the route, and can call the island API. A dedicated
 * NEXT_PUBLIC_ISLAND_ALLOWLIST can widen access later (e.g. a beta cohort)
 * without touching code. Unset ⇒ hidden and 404'd for everyone (the safe
 * default while the flow is unbuilt).
 *
 * The env is NEXT_PUBLIC so the same check runs client-side (hide the tab) and
 * server-side (gate the route + API). User ids aren't secret, and the API
 * enforcement compares the *authenticated* caller's id, so publishing the
 * allowlist grants nobody access.
 *
 * Self-contained on purpose — it does NOT import `quota.ts`, which pulls in
 * server-only code (service-key Supabase) — so it is safe in client components.
 */

function allowlist(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_ISLAND_ALLOWLIST ??
    process.env.NEXT_PUBLIC_OWNER_IDS ??
    process.env.NEXT_PUBLIC_YOUTUBE_IMPORT_ALLOWLIST ??
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True only for signed-in admins/owners (or a dedicated island allowlist). */
export function canSeeIsland(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return allowlist().includes(userId);
}
