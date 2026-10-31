BEGIN;
CREATE OR REPLACE FUNCTION public.validate_guided_note_scope() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'notes' THEN
    IF NEW.folder_id IS NOT NULL AND
       NOT EXISTS (SELECT 1 FROM note_folders WHERE id = NEW.folder_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Folder must belong to the note owner';
    END IF;
  ELSIF TG_TABLE_NAME = 'talk_sessions' THEN
    IF NEW.note_version_id IS NOT NULL AND
       NOT EXISTS (SELECT 1 FROM note_versions WHERE id = NEW.note_version_id AND note_id = NEW.note_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Version must belong to the session note and owner';
    END IF;
  ELSIF TG_TABLE_NAME = 'note_versions' THEN
    IF NEW.source_session_id IS NOT NULL AND
       NOT EXISTS (SELECT 1 FROM talk_sessions WHERE id = NEW.source_session_id AND note_id = NEW.note_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'Practice session must belong to the version note and owner';
    END IF;
  END IF;
  RETURN NEW;
END $$;
COMMIT;
