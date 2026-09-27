-- MVP expansion only. Keep legacy tables for rollback and older clients.
BEGIN;
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE INDEX notes_user_updated ON public.notes(user_id, updated_at DESC);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes FORCE ROW LEVEL SECURITY;
CREATE POLICY notes_owner ON public.notes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
INSERT INTO public.notes(id, user_id, title, body, created_at, updated_at)
SELECT id, user_id, label, body, created_at, updated_at FROM public.messages;

ALTER TABLE public.phrase_items
  ADD COLUMN pronounced_at timestamptz,
  ADD COLUMN examples_seen_at timestamptz,
  ADD COLUMN own_example_at timestamptz,
  ADD CONSTRAINT phrase_items_id_owner UNIQUE (id, user_id);
CREATE TABLE public.phrase_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase_id uuid NOT NULL,
  text text NOT NULL CHECK (length(btrim(text)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (phrase_id, user_id) REFERENCES public.phrase_items(id, user_id) ON DELETE CASCADE
);
-- Example membership is immutable; editing text cannot move the last example
-- away from a completed phrase or change its owner.
CREATE FUNCTION public.keep_phrase_example_scope() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.phrase_id IS DISTINCT FROM OLD.phrase_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Example membership cannot be changed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER phrase_example_scope BEFORE UPDATE ON public.phrase_examples FOR EACH ROW EXECUTE FUNCTION public.keep_phrase_example_scope();
CREATE INDEX phrase_examples_phrase ON public.phrase_examples(phrase_id);
ALTER TABLE public.phrase_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phrase_examples FORCE ROW LEVEL SECURITY;
CREATE POLICY phrase_examples_owner ON public.phrase_examples FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Lock the parent for both completion and example deletion: concurrent requests
-- cannot leave a completed third step with no sentence.
CREATE FUNCTION public.validate_phrase_completion() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.own_example_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM phrase_examples WHERE phrase_id = NEW.id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Save your own sentence before completing this step';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER phrase_completion_guard BEFORE INSERT OR UPDATE OF own_example_at ON public.phrase_items FOR EACH ROW EXECUTE FUNCTION public.validate_phrase_completion();
CREATE FUNCTION public.reset_removed_phrase_example() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM phrase_items WHERE id = OLD.phrase_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM phrase_examples WHERE phrase_id = OLD.phrase_id) THEN
    UPDATE phrase_items SET own_example_at = NULL WHERE id = OLD.phrase_id;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER phrase_example_removed AFTER DELETE ON public.phrase_examples FOR EACH ROW EXECUTE FUNCTION public.reset_removed_phrase_example();

ALTER TABLE public.talk_sessions ADD COLUMN note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  ADD COLUMN seconds integer CHECK (seconds >= 0);
UPDATE public.talk_sessions SET note_id = message_id, seconds = greatest(0, round(coalesce(duration_seconds, 0)))::integer;
CREATE INDEX talk_sessions_note ON public.talk_sessions(note_id);
CREATE FUNCTION public.validate_mvp_session_note() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.note_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notes WHERE id = NEW.note_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Note must belong to the session owner';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER mvp_session_owner BEFORE INSERT OR UPDATE OF note_id, user_id ON public.talk_sessions FOR EACH ROW EXECUTE FUNCTION public.validate_mvp_session_note();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes, public.phrase_examples TO authenticated;
COMMIT;
