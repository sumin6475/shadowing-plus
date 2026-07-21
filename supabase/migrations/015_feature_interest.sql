-- ============================================================================
-- 015 — feature_interest (coming-soon demand signal)
-- ============================================================================
-- Records "I'd use this" clicks on coming-soon features (first: Language
-- island), so demand can be validated before the feature is built. Same
-- direct-owner + RLS pattern as feedback (user_id DEFAULT auth.uid()); the
-- UNIQUE(user_id, feature) keeps it to one signal per user per feature — the
-- client upserts with ON CONFLICT DO NOTHING.
--
-- Reading: RLS scopes each user to their own rows; the owner counts total
-- interest per feature in the Supabase dashboard (service role).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

ALTER TABLE public.feature_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_interest FORCE ROW LEVEL SECURITY;

CREATE POLICY feature_interest_owner ON public.feature_interest
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
