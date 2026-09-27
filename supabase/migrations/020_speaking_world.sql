-- ============================================================================
-- 020 — Speaking World tree (mobile product direction)
-- ============================================================================
-- Implements the Domain → Story → Message → Session hierarchy from
-- apps/mobile/docs/product/speaking-world.md. Phrases will link to a Story in a
-- later migration ("Language belongs to the Story").
--
-- Coexists with the web's `islands` (kind='explain_what_i_do'): this tree is the
-- go-forward model; the island stays until the web migrates onto it. See
-- apps/mobile/docs/journal/decisions/0002-speaking-world-data-model.md.
--
-- Owner-scoped, ENABLE + FORCE RLS (008/013/019 pattern): the browser / RN
-- client inserts WITHOUT passing user_id (DEFAULT auth.uid() fills it, same as
-- bookmarks/folders/practice_sessions). Service-key routes must filter by
-- user_id themselves (the service key bypasses RLS).
-- ============================================================================

-- 1. Domain — a broad area of life (Work, About me, Experiences, …). Per-user;
--    the initial set is seeded client-side on first use, not here.
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  position INT NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_domains_user ON public.domains(user_id, position);

-- 2. Story — a story the learner actually wants to tell. Belongs to a Domain
--    (SET NULL keeps orphan stories if a domain is deleted).
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'shaping', 'ready', 'archived')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stories_domain ON public.stories(domain_id, position);
CREATE INDEX IF NOT EXISTS idx_stories_user ON public.stories(user_id, created_at);

-- 3. Message — a way of delivering a Story (30 sec, For a friend, VC pitch).
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  audience TEXT,
  target_seconds INT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_story ON public.messages(story_id, position);

-- 4. Message beats — the key points for one delivery (mirrors island_beats).
CREATE TABLE IF NOT EXISTS public.message_beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'learner'
    CHECK (source IN ('learner', 'ai_structured')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_message_beats_message ON public.message_beats(message_id, position);

-- 5. Talk session — one spoken record (mirrors island_attempts). audio_key is
--    filled once the recording pipeline lands; message_id optional (free talk).
CREATE TABLE IF NOT EXISTS public.talk_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  transcript TEXT,
  duration_seconds FLOAT,
  audio_key TEXT,
  audio_content_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_talk_sessions_story ON public.talk_sessions(story_id, created_at);
CREATE INDEX IF NOT EXISTS idx_talk_sessions_user ON public.talk_sessions(user_id, created_at);

-- Owner-only, forced RLS on every new table.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['domains', 'stories', 'messages', 'message_beats', 'talk_sessions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_owner ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_owner ON public.%I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t, t);
  END LOOP;
END $$;
