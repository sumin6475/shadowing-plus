# Phase 1 apply runbook — auth + RLS (do these IN ORDER)

The code for Phase 1 is written and the build is green, but Phase 1 is **not live**
until you do the steps below. The order matters: turning on RLS before the session
layer works makes every query return empty (RLS filters silently — it doesn't error),
so the app goes blank for everyone. Follow this top-to-bottom.

## 0. What's already done (code)
- `@supabase/ssr` installed; `web/src/lib/supabase.ts` is now a cookie-aware browser
  client; new `web/src/lib/supabase-server.ts` (`getSessionUserId()`).
- `web/src/proxy.ts` (Next 16 renamed `middleware` → `proxy`) refreshes the session
  and redirects logged-out users off `/bookmarks`, `/practice`, `/player`, `/settings`.
- `/login` (magic link) + `/auth/callback`.
- Every service-key API route now requires a session and scopes by `user_id`.
- Realtime `jobs-feed` channel is per-user filtered.
- `supabase/migrations/008_auth_rls.sql` — **written but NOT applied.**

## 1. Supabase dashboard — Auth config (do FIRST, before deploying)
1. **Auth → URL Configuration → Redirect URLs**: add
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
2. **Auth → Providers → Email**: ensure Email is enabled (magic link works on
   Supabase's built-in SMTP at low volume; add a custom SMTP later for scale).
3. Leave **Confirm email** on (default) — magic link handles it.

## 2. Deploy the session layer (RLS still OFF at this point)
- Add `CRON_SECRET` (Phase 0) to the Vercel project env if not already there.
- Deploy from the repo root: `npx vercel --prod`.
- The app still behaves as single-user (RLS off), but now `/login` exists and the
  proxy is live. This is the safe intermediate state.

## 3. Create your account + get your user id
1. Go to `/login` on the deployed site, enter your email, click the magic link.
   Confirm you land back in the app logged in.
2. In the Supabase SQL Editor:
   ```sql
   select id, email from auth.users order by created_at limit 5;
   ```
   Copy the `id` for your email.

## 4. Apply the RLS migration (the point of no easy return)
1. Open `supabase/migrations/008_auth_rls.sql`.
2. Replace the `owner_uid` placeholder (`00000000-...`) with your id from step 3.
3. Paste the whole file into the Supabase SQL Editor and run it **once**.
   - It runs in order: add columns → backfill your rows → NOT NULL + DEFAULT
     auth.uid() → indexes → enable+force RLS → policies.
4. Reload the app while logged in — your existing library/bookmarks/usage should
   all still be there (they're now owned by you). If the app is blank, your session
   isn't being read — do NOT panic-disable RLS; check that step 2 actually deployed
   the proxy + client split.

## 5. Verify isolation (the Phase 1 exit gate)
Create a SECOND account (different email) and confirm, as account B:
- [ ] `/` (library) shows none of account A's clips.
- [ ] Visiting `/player/<A's videoId>` directly → not found / blocked.
- [ ] `/settings` usage + storage show only B's (zero) — not A's spend.
- [ ] Uploading as A while B watches → B's job feed never shows A's job.
- [ ] Browser console as B: `supabase.from('videos').select('*')` returns only B's
      rows (proves RLS, not just UI filtering).
- [ ] `POST /api/jobs/<A's jobId>/retry` as B → 401/404.
- [ ] Logged out entirely → protected routes redirect to `/login`.

## Rollback (only if something is badly wrong)
RLS can be turned back off per table (`ALTER TABLE <t> DISABLE ROW LEVEL SECURITY;`)
to restore the old single-user behavior while you debug the session layer. The
`user_id` columns and data are harmless to leave in place.

## Notes carried forward
- **Per-user R2 key prefix** (`users/{user_id}/...`) was intentionally deferred from
  Phase 0 to here — but it's still not applied; media is private via signed URLs
  regardless (Phase 0). Fold the prefix into a future migration if you want defense
  in depth on the key namespace.
- The `/` → landing vs `/app` move is **Phase 2** (the landing page doesn't exist
  yet). Until then `/` remains the library and the proxy does not gate `/`.
