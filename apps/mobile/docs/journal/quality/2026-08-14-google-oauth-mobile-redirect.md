# Google OAuth mobile redirect

- Date: 2026-08-14
- App scheme: PASS — `shadowingplus` is registered in `app.json`
- OAuth redirect construction: PASS — `Linking.createURL("auth/callback")` is passed to both Supabase and the auth browser session
- Supabase Site URL: unchanged — `https://shadowing-plus.vercel.app`
- Existing redirect URLs: preserved — localhost and Vercel
- Mobile redirect URL: PASS — `shadowingplus://auth/callback` added
- Dashboard persistence signal: PASS — total allowed URLs increased from 2 to 3 and the exact mobile URI appeared in the list
- Physical TestFlight OAuth smoke: pending
