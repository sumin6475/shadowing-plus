BEGIN;
CREATE TABLE public.personal_sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  text text NOT NULL CHECK (length(trim(text)) > 0),
  meaning text NOT NULL CHECK (length(trim(meaning)) > 0),
  note_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (note_id, user_id) REFERENCES public.notes(id,user_id) ON DELETE SET NULL (note_id)
);
CREATE TABLE public.routine_phrase_notes (
  phrase_id uuid NOT NULL,
  note_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  PRIMARY KEY (phrase_id,note_id),
  FOREIGN KEY (phrase_id,user_id) REFERENCES public.phrase_items(id,user_id) ON DELETE CASCADE,
  FOREIGN KEY (note_id,user_id) REFERENCES public.notes(id,user_id) ON DELETE CASCADE
);
INSERT INTO public.routine_phrase_notes
SELECT l.phrase_item_id,n.id,n.user_id FROM public.note_phrase_links l
JOIN public.notes n ON n.id=l.message_id
JOIN public.phrase_items p ON p.id=l.phrase_item_id AND p.user_id=n.user_id
ON CONFLICT DO NOTHING;
ALTER TABLE public.personal_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_phrase_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_sentences ON public.personal_sentences FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY own_phrase_links ON public.routine_phrase_notes FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.personal_sentences,public.routine_phrase_notes TO authenticated;
COMMIT;
