-- Persist Ask conversations across devices. A conversation may be linked to a
-- speaking Note, but deleting a conversation never deletes that Note.
BEGIN;

CREATE TABLE public.ask_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id uuid,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  initial_mode text NOT NULL CHECK (initial_mode IN ('how_to_say', 'note')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (note_id, user_id) REFERENCES public.notes(id, user_id) ON DELETE SET NULL (note_id)
);
CREATE INDEX ask_conversations_user_updated ON public.ask_conversations(user_id, updated_at DESC, id DESC);
CREATE INDEX ask_conversations_note_updated ON public.ask_conversations(note_id, updated_at DESC);
ALTER TABLE public.ask_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ask_conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY ask_conversations_owner ON public.ask_conversations FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.ask_chat_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  client_turn_id text NOT NULL CHECK (length(client_turn_id) BETWEEN 1 AND 80),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  mode text NOT NULL CHECK (mode IN ('how_to_say', 'note')),
  draft_now boolean NOT NULL DEFAULT false,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (conversation_id, user_id) REFERENCES public.ask_conversations(id, user_id) ON DELETE CASCADE,
  UNIQUE (conversation_id, client_turn_id)
);
CREATE INDEX ask_chat_turns_conversation_created ON public.ask_chat_turns(conversation_id, created_at, id);
ALTER TABLE public.ask_chat_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ask_chat_turns FORCE ROW LEVEL SECURITY;
CREATE POLICY ask_chat_turns_owner ON public.ask_chat_turns FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE FUNCTION public.touch_ask_conversation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE ask_conversations SET updated_at = greatest(updated_at, NEW.created_at)
  WHERE id = NEW.conversation_id AND user_id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER ask_chat_turn_touch AFTER INSERT ON public.ask_chat_turns
  FOR EACH ROW EXECUTE FUNCTION public.touch_ask_conversation();

-- Every legacy Note had one continuous Ask conversation. Keep its Note id as
-- the conversation id, so the backfill can preserve message order and ids.
INSERT INTO public.ask_conversations(id, user_id, note_id, title, initial_mode, created_at, updated_at)
SELECT n.id, n.user_id, n.id,
  left(coalesce(nullif(btrim(n.title), ''), 'Speaking note'), 120), 'note',
  min(t.created_at), max(t.created_at)
FROM public.notes n JOIN public.note_chat_turns t
  ON t.note_id = n.id AND t.user_id = n.user_id
GROUP BY n.id, n.user_id, n.title;

INSERT INTO public.ask_chat_turns(id, user_id, conversation_id, client_turn_id, role, mode, draft_now, content, created_at)
SELECT t.id, t.user_id, t.note_id, t.client_turn_id, t.role, 'note', t.draft_now, t.content, t.created_at
FROM public.note_chat_turns t;

-- Older TestFlight builds can keep writing Note turns during the rollout.
-- Mirror those inserts into the new history so an upgrade does not lose them.
CREATE FUNCTION public.mirror_legacy_note_chat_turn() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT left(coalesce(nullif(btrim(title), ''), 'Speaking note'), 120)
    INTO v_title FROM notes WHERE id = NEW.note_id AND user_id = NEW.user_id;
  INSERT INTO ask_conversations(id, user_id, note_id, title, initial_mode, created_at, updated_at)
  VALUES (NEW.note_id, NEW.user_id, NEW.note_id, coalesce(v_title, 'Speaking note'), 'note', NEW.created_at, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO ask_chat_turns(user_id, conversation_id, client_turn_id, role, mode, draft_now, content, created_at)
  VALUES (NEW.user_id, NEW.note_id, NEW.client_turn_id, NEW.role, 'note', NEW.draft_now, NEW.content, NEW.created_at)
  ON CONFLICT (conversation_id, client_turn_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER legacy_note_chat_turn_mirror AFTER INSERT ON public.note_chat_turns
  FOR EACH ROW EXECUTE FUNCTION public.mirror_legacy_note_chat_turn();

-- A migrated Note conversation has an older copy of the same messages. When
-- the learner deletes that conversation, remove the older copy as well.
CREATE FUNCTION public.delete_legacy_note_chat_turns() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.note_id IS NOT NULL AND OLD.id = OLD.note_id THEN
    DELETE FROM public.note_chat_turns WHERE note_id = OLD.id AND user_id = OLD.user_id;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER ask_conversation_delete_legacy AFTER DELETE ON public.ask_conversations
  FOR EACH ROW EXECUTE FUNCTION public.delete_legacy_note_chat_turns();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_conversations, public.ask_chat_turns TO authenticated;
COMMIT;
