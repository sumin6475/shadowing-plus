-- Guided speaking: optional folders, confirmed context, durable Ask turns and
-- immutable draft versions. Existing notes remain unfiled and unchanged.
BEGIN;

CREATE TABLE public.note_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
CREATE INDEX note_folders_user_updated ON public.note_folders(user_id, updated_at DESC);
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_folders FORCE ROW LEVEL SECURITY;
CREATE POLICY note_folders_owner ON public.note_folders FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.notes ADD COLUMN folder_id uuid REFERENCES public.note_folders(id) ON DELETE SET NULL;
CREATE INDEX notes_folder ON public.notes(folder_id, updated_at DESC);

CREATE TABLE public.note_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL CHECK (length(content) <= 100000),
  source_url text,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (folder_id, user_id) REFERENCES public.note_folders(id, user_id) ON DELETE CASCADE,
  UNIQUE (id, user_id, folder_id)
);
CREATE INDEX note_sources_folder ON public.note_sources(folder_id, created_at DESC);
ALTER TABLE public.note_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_sources FORCE ROW LEVEL SECURITY;
CREATE POLICY note_sources_owner ON public.note_sources FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.note_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL,
  source_id uuid,
  text text NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 800),
  source_excerpt text NOT NULL DEFAULT '',
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (folder_id, user_id) REFERENCES public.note_folders(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id, user_id, folder_id) REFERENCES public.note_sources(id, user_id, folder_id) ON DELETE SET NULL (source_id)
);
CREATE INDEX note_facts_folder ON public.note_facts(folder_id, confirmed_at DESC);
ALTER TABLE public.note_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_facts FORCE ROW LEVEL SECURITY;
CREATE POLICY note_facts_owner ON public.note_facts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.note_chat_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid NOT NULL,
  client_turn_id text NOT NULL CHECK (length(client_turn_id) BETWEEN 1 AND 80),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  draft_now boolean NOT NULL DEFAULT false,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (note_id, user_id) REFERENCES public.notes(id, user_id) ON DELETE CASCADE,
  UNIQUE (note_id, client_turn_id)
);
CREATE INDEX note_chat_turns_note_created ON public.note_chat_turns(note_id, created_at, id);
ALTER TABLE public.note_chat_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_chat_turns FORCE ROW LEVEL SECURITY;
CREATE POLICY note_chat_turns_read ON public.note_chat_turns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY note_chat_turns_insert ON public.note_chat_turns FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TABLE public.note_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('ask', 'practice', 'manual')),
  source_session_id uuid REFERENCES public.talk_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (note_id, user_id) REFERENCES public.notes(id, user_id) ON DELETE CASCADE,
  UNIQUE (id, note_id, user_id)
);
CREATE INDEX note_versions_note_created ON public.note_versions(note_id, created_at DESC);
ALTER TABLE public.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY note_versions_read ON public.note_versions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY note_versions_insert ON public.note_versions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE FUNCTION public.apply_note_version(p_note_id uuid, p_title text, p_body text,
  p_origin text, p_source_session_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_origin NOT IN ('ask', 'practice', 'manual') THEN
    RAISE EXCEPTION 'Invalid version origin';
  END IF;
  IF p_source_session_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM talk_sessions WHERE id = p_source_session_id
      AND note_id = p_note_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Practice session must belong to this note';
  END IF;
  UPDATE notes SET title = p_title, body = p_body, updated_at = now()
    WHERE id = p_note_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Note is no longer available'; END IF;
  INSERT INTO note_versions(user_id, note_id, title, body, origin, source_session_id)
    VALUES (auth.uid(), p_note_id, p_title, p_body, p_origin, p_source_session_id)
    RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.apply_note_version(uuid, text, text, text, uuid) TO authenticated;

ALTER TABLE public.talk_sessions ADD COLUMN note_version_id uuid REFERENCES public.note_versions(id) ON DELETE SET NULL;

CREATE FUNCTION public.validate_guided_note_scope() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'notes' AND NEW.folder_id IS NOT NULL AND
     NOT EXISTS (SELECT 1 FROM note_folders WHERE id = NEW.folder_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Folder must belong to the note owner';
  END IF;
  IF TG_TABLE_NAME = 'talk_sessions' AND NEW.note_version_id IS NOT NULL AND
     NOT EXISTS (SELECT 1 FROM note_versions WHERE id = NEW.note_version_id AND note_id = NEW.note_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Version must belong to the session note and owner';
  END IF;
  IF TG_TABLE_NAME = 'note_versions' AND NEW.source_session_id IS NOT NULL AND
     NOT EXISTS (SELECT 1 FROM talk_sessions WHERE id = NEW.source_session_id AND note_id = NEW.note_id AND user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'Practice session must belong to the version note and owner';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guided_note_folder_owner BEFORE INSERT OR UPDATE OF folder_id, user_id ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.validate_guided_note_scope();
CREATE TRIGGER guided_session_version_owner BEFORE INSERT OR UPDATE OF note_version_id, note_id, user_id ON public.talk_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_guided_note_scope();
CREATE TRIGGER guided_version_session_owner BEFORE INSERT OR UPDATE OF source_session_id, note_id, user_id ON public.note_versions
  FOR EACH ROW EXECUTE FUNCTION public.validate_guided_note_scope();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_folders, public.note_sources,
  public.note_facts TO authenticated;
GRANT SELECT, INSERT ON public.note_chat_turns, public.note_versions TO authenticated;
COMMIT;
