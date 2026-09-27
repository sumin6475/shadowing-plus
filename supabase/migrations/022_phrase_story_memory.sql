-- 022_phrase_story_memory.sql - make phrase_items the canonical mobile Phrase
-- Bank and connect captured language to the Speaking World.
-- Policies use USING only: for a FOR ALL policy, an omitted WITH CHECK reuses
-- the USING expression as the write check, and here both were identical.

ALTER TABLE public.phrase_items
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_phrase_items_user_favorite
  ON public.phrase_items(user_id, created_at DESC)
  WHERE is_favorite;

CREATE TABLE IF NOT EXISTS public.phrase_story_links (
  phrase_item_id UUID NOT NULL REFERENCES public.phrase_items(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'learner'
    CHECK (source IN ('learner', 'capture', 'suggested', 'used')),
  suggested_count INT NOT NULL DEFAULT 0,
  used_count INT NOT NULL DEFAULT 0,
  last_suggested_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (phrase_item_id, story_id)
);

CREATE INDEX IF NOT EXISTS idx_phrase_story_links_story
  ON public.phrase_story_links(user_id, story_id, last_used_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.phrase_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase_item_id UUID NOT NULL REFERENCES public.phrase_items(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  talk_session_id UUID REFERENCES public.talk_sessions(id) ON DELETE SET NULL,
  event TEXT NOT NULL
    CHECK (event IN ('suggested', 'accepted', 'retrieved', 'used', 'rejected')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phrase_events_user_created
  ON public.phrase_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phrase_events_phrase
  ON public.phrase_events(phrase_item_id, created_at DESC);

ALTER TABLE public.phrase_story_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phrase_story_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.phrase_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phrase_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phrase_story_links_owner ON public.phrase_story_links;
CREATE POLICY phrase_story_links_owner ON public.phrase_story_links
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.phrase_items p WHERE p.id = phrase_item_id AND p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS phrase_events_owner ON public.phrase_events;
CREATE POLICY phrase_events_owner ON public.phrase_events
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.phrase_items p WHERE p.id = phrase_item_id AND p.user_id = auth.uid())
    AND (story_id IS NULL OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.user_id = auth.uid()))
    AND (talk_session_id IS NULL OR EXISTS (SELECT 1 FROM public.talk_sessions t WHERE t.id = talk_session_id AND t.user_id = auth.uid()))
  );

-- Keep recommendation memory consistent regardless of whether the event comes
-- from the app or an Edge Function. The event row has already passed owner RLS;
-- this trigger atomically links the phrase to the Story and advances counters.
CREATE OR REPLACE FUNCTION public.apply_phrase_event_to_story_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.story_id IS NULL OR NEW.event NOT IN ('suggested', 'used') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.phrase_story_links (
    phrase_item_id,
    story_id,
    user_id,
    source,
    suggested_count,
    used_count,
    last_suggested_at,
    last_used_at,
    updated_at
  ) VALUES (
    NEW.phrase_item_id,
    NEW.story_id,
    NEW.user_id,
    CASE WHEN NEW.event = 'used' THEN 'used' ELSE 'suggested' END,
    CASE WHEN NEW.event = 'suggested' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event = 'used' THEN 1 ELSE 0 END,
    CASE WHEN NEW.event = 'suggested' THEN NEW.created_at ELSE NULL END,
    CASE WHEN NEW.event = 'used' THEN NEW.created_at ELSE NULL END,
    now()
  )
  ON CONFLICT (phrase_item_id, story_id) DO UPDATE SET
    source = CASE WHEN NEW.event = 'used' THEN 'used' ELSE phrase_story_links.source END,
    suggested_count = phrase_story_links.suggested_count + CASE WHEN NEW.event = 'suggested' THEN 1 ELSE 0 END,
    used_count = phrase_story_links.used_count + CASE WHEN NEW.event = 'used' THEN 1 ELSE 0 END,
    last_suggested_at = CASE WHEN NEW.event = 'suggested' THEN NEW.created_at ELSE phrase_story_links.last_suggested_at END,
    last_used_at = CASE WHEN NEW.event = 'used' THEN NEW.created_at ELSE phrase_story_links.last_used_at END,
    updated_at = now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_phrase_event_to_story_link() FROM PUBLIC;

DROP TRIGGER IF EXISTS phrase_events_apply_story_link ON public.phrase_events;
CREATE TRIGGER phrase_events_apply_story_link
  AFTER INSERT ON public.phrase_events
  FOR EACH ROW EXECUTE FUNCTION public.apply_phrase_event_to_story_link();
