-- Public launch waitlist. Writes go through the server-side service client;
-- no browser policy is created, so the table remains unreadable to anon users.

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  goal text NOT NULL CHECK (goal IN ('clear-speaking', 'networking', 'pitch', 'interview', 'other')),
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'either')),
  wants_beta boolean NOT NULL DEFAULT false,
  locale text,
  source text NOT NULL DEFAULT 'landing-page',
  privacy_consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_beta_created
  ON public.waitlist_signups(wants_beta, created_at DESC);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_signups FORCE ROW LEVEL SECURITY;
