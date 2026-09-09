-- ============================================================================
-- 028 — Studio information architecture
-- ============================================================================
-- Evolves the shipped Speaking World schema without breaking existing builds:
--   domains       -> Topics / Areas
--   stories       -> Situations
--   messages      -> Speaking Notes
--   talk_sessions -> Practice Attempts
--
-- The physical legacy table names remain compatibility contracts. New columns
-- and link tables express the revised model while preserving every existing id.
-- ============================================================================

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS event_date DATE;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES public.domains(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS legacy_variant JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_status_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_status_check
  CHECK (status IN ('active', 'archived', 'unsorted', 'needs_review'));

-- A Speaking Note may be captured before the learner assigns a Situation.
ALTER TABLE public.messages ALTER COLUMN story_id DROP NOT NULL;

-- Preserve a useful trace of the old Version shape before it disappears from UI.
UPDATE public.messages
SET legacy_variant = jsonb_strip_nulls(
  jsonb_build_object('audience', audience, 'target_seconds', target_seconds)
)
WHERE legacy_variant = '{}'::jsonb
  AND (audience IS NOT NULL OR target_seconds IS NOT NULL);

-- Existing Version beats become the learner-authored Note body. The source
-- rows remain untouched for rollback/older clients.
UPDATE public.messages AS m
SET body = outline.body
FROM (
  SELECT message_id, string_agg(text, E'\n' ORDER BY position, created_at) AS body
  FROM public.message_beats
  WHERE btrim(text) <> ''
  GROUP BY message_id
) AS outline
WHERE outline.message_id = m.id
  AND m.body = '';

-- Every legacy Version inherits the Topic of its Story/Situation.
UPDATE public.messages AS m
SET domain_id = s.domain_id
FROM public.stories AS s
WHERE m.story_id = s.id
  AND m.domain_id IS NULL
  AND s.domain_id IS NOT NULL;

-- Quarantine genuinely orphaned legacy rows instead of dropping or guessing.
INSERT INTO public.domains (user_id, name, color, position)
SELECT DISTINCT m.user_id, 'Needs review', 'butter', 999
FROM public.messages AS m
WHERE m.domain_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.domains AS d
    WHERE d.user_id = m.user_id AND d.name = 'Needs review' AND d.archived = false
  );

UPDATE public.messages AS m
SET domain_id = d.id,
    status = 'needs_review'
FROM public.domains AS d
WHERE m.domain_id IS NULL
  AND d.user_id = m.user_id
  AND d.name = 'Needs review'
  AND d.archived = false;

ALTER TABLE public.messages ALTER COLUMN domain_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_user_updated
  ON public.messages(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_domain_status
  ON public.messages(domain_id, status, updated_at DESC);

-- Enforce owner consistency and Situation -> Topic consistency for all future
-- writes. RLS protects rows, while this trigger also protects service-role jobs.
CREATE OR REPLACE FUNCTION public.validate_speaking_note_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  topic_owner UUID;
  situation_owner UUID;
  situation_topic UUID;
BEGIN
  -- Older app builds only send story_id when creating a Version. Derive the
  -- new required Topic so those clients keep working during rollout.
  IF NEW.domain_id IS NULL AND NEW.story_id IS NOT NULL THEN
    SELECT domain_id INTO NEW.domain_id FROM public.stories WHERE id = NEW.story_id;
  END IF;

  SELECT user_id INTO topic_owner FROM public.domains WHERE id = NEW.domain_id;
  IF topic_owner IS NULL OR topic_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Speaking Note Topic must belong to its owner';
  END IF;

  IF NEW.story_id IS NOT NULL THEN
    SELECT user_id, domain_id INTO situation_owner, situation_topic
    FROM public.stories WHERE id = NEW.story_id;
    IF situation_owner IS NULL OR situation_owner <> NEW.user_id THEN
      RAISE EXCEPTION 'Speaking Note Situation must belong to its owner';
    END IF;
    IF situation_topic IS DISTINCT FROM NEW.domain_id THEN
      RAISE EXCEPTION 'Speaking Note Topic must match its Situation Topic';
    END IF;
    IF NEW.status = 'unsorted' THEN NEW.status := 'active'; END IF;
  ELSIF NEW.status = 'active' THEN
    NEW.status := 'unsorted';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_validate_studio_scope ON public.messages;
CREATE TRIGGER messages_validate_studio_scope
  BEFORE INSERT OR UPDATE OF user_id, domain_id, story_id, status
  ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_speaking_note_scope();

-- A Situation has exactly one Topic. Moving it carries all child Notes so the
-- hierarchy cannot split across two Topics.
CREATE OR REPLACE FUNCTION public.sync_situation_topic_to_notes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.domain_id IS DISTINCT FROM OLD.domain_id AND NEW.domain_id IS NOT NULL THEN
    UPDATE public.messages
    SET domain_id = NEW.domain_id, updated_at = now()
    WHERE story_id = NEW.id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stories_sync_studio_topic ON public.stories;
CREATE TRIGGER stories_sync_studio_topic
  AFTER UPDATE OF domain_id ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.sync_situation_topic_to_notes();

-- Phrase is a shared asset. This table links it to one or more Speaking Notes.
CREATE TABLE IF NOT EXISTS public.note_phrase_links (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  phrase_item_id UUID NOT NULL REFERENCES public.phrase_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'learner'
    CHECK (source IN ('learner', 'capture', 'suggested', 'used', 'migration')),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, phrase_item_id)
);

CREATE INDEX IF NOT EXISTS idx_note_phrase_links_user_note
  ON public.note_phrase_links(user_id, message_id, linked_at DESC);

ALTER TABLE public.note_phrase_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_phrase_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS note_phrase_links_owner ON public.note_phrase_links;
CREATE POLICY note_phrase_links_owner ON public.note_phrase_links
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.messages n WHERE n.id = message_id AND n.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.phrase_items p WHERE p.id = phrase_item_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.messages n WHERE n.id = message_id AND n.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.phrase_items p WHERE p.id = phrase_item_id AND p.user_id = auth.uid())
  );

-- Preserve every existing Story-level Phrase link by linking it to each Note
-- migrated from that Story. No Phrase row is copied.
INSERT INTO public.note_phrase_links (message_id, phrase_item_id, user_id, source, linked_at)
SELECT m.id, l.phrase_item_id, m.user_id, 'migration', l.created_at
FROM public.messages AS m
JOIN public.phrase_story_links AS l ON l.story_id = m.story_id AND l.user_id = m.user_id
ON CONFLICT (message_id, phrase_item_id) DO NOTHING;

-- AI detections remain candidates until the learner explicitly confirms them.
CREATE TABLE IF NOT EXISTS public.attempt_phrase_candidates (
  talk_session_id UUID NOT NULL REFERENCES public.talk_sessions(id) ON DELETE CASCADE,
  phrase_item_id UUID NOT NULL REFERENCES public.phrase_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  detection_status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (detection_status IN ('candidate', 'rejected', 'confirmed_used')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by_user_at TIMESTAMPTZ,
  PRIMARY KEY (talk_session_id, phrase_item_id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_phrase_candidates_user_attempt
  ON public.attempt_phrase_candidates(user_id, talk_session_id, detected_at DESC);

ALTER TABLE public.attempt_phrase_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_phrase_candidates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attempt_phrase_candidates_owner ON public.attempt_phrase_candidates;
CREATE POLICY attempt_phrase_candidates_owner ON public.attempt_phrase_candidates
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.talk_sessions a WHERE a.id = talk_session_id AND a.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.phrase_items p WHERE p.id = phrase_item_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.talk_sessions a WHERE a.id = talk_session_id AND a.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.phrase_items p WHERE p.id = phrase_item_id AND p.user_id = auth.uid())
  );

-- Historical `retrieved` means detected, never confirmed. Only an explicit
-- `used` event becomes confirmed evidence.
INSERT INTO public.attempt_phrase_candidates (
  talk_session_id, phrase_item_id, user_id, detection_status, evidence,
  detected_at, confirmed_by_user_at
)
SELECT DISTINCT ON (e.talk_session_id, e.phrase_item_id)
  e.talk_session_id,
  e.phrase_item_id,
  e.user_id,
  CASE
    WHEN e.event = 'used' THEN 'confirmed_used'
    WHEN e.event = 'rejected' THEN 'rejected'
    ELSE 'candidate'
  END,
  e.evidence,
  e.created_at,
  CASE WHEN e.event IN ('used', 'rejected') THEN e.created_at ELSE NULL END
FROM public.phrase_events AS e
WHERE e.talk_session_id IS NOT NULL
  AND e.event IN ('retrieved', 'used', 'rejected')
ORDER BY e.talk_session_id, e.phrase_item_id,
  CASE e.event WHEN 'used' THEN 3 WHEN 'rejected' THEN 2 ELSE 1 END DESC,
  e.created_at DESC
ON CONFLICT (talk_session_id, phrase_item_id) DO NOTHING;

COMMENT ON TABLE public.domains IS 'Studio Topics / Areas (legacy physical name retained).';
COMMENT ON TABLE public.stories IS 'Studio Situations (legacy physical name retained).';
COMMENT ON TABLE public.messages IS 'Studio Speaking Notes (legacy physical name retained).';
COMMENT ON TABLE public.talk_sessions IS 'Studio Practice Attempts (legacy physical name retained).';
