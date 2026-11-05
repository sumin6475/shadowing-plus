BEGIN;
ALTER TABLE public.talk_sessions ADD CONSTRAINT talk_sessions_owner_key UNIQUE(id,user_id);
CREATE TABLE public.coaching_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
 rich_text text NOT NULL DEFAULT '' CHECK(octet_length(rich_text)<=60000),
 plain_text text NOT NULL DEFAULT '' CHECK(length(plain_text)<=12000),
 english_level text NOT NULL CHECK(english_level IN('a2','b1','b2','c1')),
 first_language text NOT NULL CHECK(first_language IN('en','ko','zh-Hant','ja','es','ru')),
 source_revision integer NOT NULL DEFAULT 1,
 current_profile_version_id uuid,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.coaching_profile_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 source_revision integer NOT NULL, source_hash text NOT NULL, source_text text NOT NULL,
 english_level text NOT NULL, first_language text NOT NULL,
 profile jsonb NOT NULL, compiler_version text NOT NULL,model text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,user_id),UNIQUE(user_id,source_revision,compiler_version)
);
ALTER TABLE public.coaching_preferences ADD FOREIGN KEY(current_profile_version_id,user_id) REFERENCES public.coaching_profile_versions(id,user_id);
CREATE TABLE public.talk_feedback_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 session_id uuid NOT NULL,profile_version_id uuid NOT NULL,parent_report_id uuid,
 first_language text NOT NULL,english_level text NOT NULL,
 fingerprint text NOT NULL,transcript_hash text NOT NULL,transcript_snapshot text NOT NULL CHECK(length(transcript_snapshot)<=40000),model text NOT NULL,prompt_version text NOT NULL,
 clarifications jsonb NOT NULL DEFAULT '[]',status text NOT NULL DEFAULT 'generating' CHECK(status IN('generating','ready','failed')),
 result jsonb,error_code text,lease_expires_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,user_id),UNIQUE(user_id,fingerprint),
 FOREIGN KEY(session_id,user_id) REFERENCES public.talk_sessions(id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(profile_version_id,user_id) REFERENCES public.coaching_profile_versions(id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(parent_report_id,user_id) REFERENCES public.talk_feedback_reports(id,user_id) ON DELETE CASCADE,
 CHECK((status='ready')=(result IS NOT NULL))
);
CREATE INDEX talk_feedback_session ON public.talk_feedback_reports(user_id,session_id,created_at DESC);
CREATE TABLE public.talk_feedback_retries (
 session_id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 source_report_id uuid NOT NULL,target_finding_ids text[] NOT NULL CHECK(cardinality(target_finding_ids) BETWEEN 1 AND 2),
 FOREIGN KEY(session_id,user_id) REFERENCES public.talk_sessions(id,user_id) ON DELETE CASCADE,
 FOREIGN KEY(source_report_id,user_id) REFERENCES public.talk_feedback_reports(id,user_id) ON DELETE CASCADE
);
-- Durable reservations count retries and concurrent requests, including failed
-- provider calls. Clients cannot create or complete jobs or modify model output.
CREATE TABLE public.feedback_generation_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('profile','report')),fingerprint text NOT NULL,
 request_id uuid NOT NULL DEFAULT gen_random_uuid(),completed_at timestamptz,latency_ms integer,
 token uuid NOT NULL DEFAULT gen_random_uuid(),status text NOT NULL DEFAULT 'generating' CHECK(status IN('generating','ready','failed')),
 lease_expires_at timestamptz NOT NULL DEFAULT(now()+interval '120 seconds'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_attempt_lookup ON public.feedback_generation_attempts(user_id,kind,fingerprint,created_at DESC);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['coaching_preferences','coaching_profile_versions','talk_feedback_reports','talk_feedback_retries','feedback_generation_attempts'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING(user_id=auth.uid())',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
 EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
 END LOOP; END $$;
CREATE FUNCTION public.save_coaching_preferences(p_user uuid,p_revision integer,p_html text,p_text text,p_level text,p_language text)
RETURNS public.coaching_preferences LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.coaching_preferences;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 SELECT * INTO r FROM public.coaching_preferences WHERE user_id=p_user FOR UPDATE;
 IF coalesce(r.source_revision,0)<>p_revision THEN RAISE EXCEPTION 'feedback_revision_conflict'; END IF;
 IF r.user_id IS NOT NULL AND r.rich_text=p_html AND r.plain_text=p_text AND r.english_level=p_level AND r.first_language=p_language THEN RETURN r; END IF;
 INSERT INTO public.coaching_preferences(user_id,rich_text,plain_text,english_level,first_language,source_revision)
 VALUES(p_user,p_html,p_text,p_level,p_language,1)
 ON CONFLICT(user_id) DO UPDATE SET rich_text=p_html,plain_text=p_text,english_level=p_level,first_language=p_language,source_revision=coaching_preferences.source_revision+1,current_profile_version_id=NULL,updated_at=now()
 RETURNING * INTO r; RETURN r;
END $$;
CREATE FUNCTION public.claim_feedback_generation(p_user uuid,p_kind text,p_fingerprint text,p_request_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.feedback_generation_attempts; n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 SELECT * INTO r FROM public.feedback_generation_attempts WHERE user_id=p_user AND kind=p_kind AND fingerprint=p_fingerprint ORDER BY created_at DESC LIMIT 1;
 IF r.status='ready' THEN RETURN jsonb_build_object('cached',true); END IF;
 IF r.status='generating' AND r.lease_expires_at>clock_timestamp() THEN RETURN jsonb_build_object('busy',true); END IF;
 SELECT count(*) INTO n FROM public.feedback_generation_attempts WHERE user_id=p_user AND kind=p_kind AND created_at>now()-interval '24 hours';
 IF n>=(CASE WHEN p_kind='profile' THEN 5 ELSE 20 END) THEN RAISE EXCEPTION 'feedback_daily_limit'; END IF;
 INSERT INTO public.feedback_generation_attempts(user_id,kind,fingerprint,request_id) VALUES(p_user,p_kind,p_fingerprint,coalesce(p_request_id,gen_random_uuid())) RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;
-- Completion and the revision check happen under the same transaction as the
-- claim-token check. An expired worker cannot publish over a later attempt.
CREATE FUNCTION public.complete_feedback_generation(p_attempt uuid,p_token uuid,p_payload jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.feedback_generation_attempts; p public.coaching_preferences;
BEGIN
 SELECT * INTO a FROM public.feedback_generation_attempts WHERE id=p_attempt;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.user_id::text,0));
 SELECT * INTO a FROM public.feedback_generation_attempts WHERE id=p_attempt FOR UPDATE;
 IF a.token IS DISTINCT FROM p_token OR a.status<>'generating' OR a.lease_expires_at<=clock_timestamp() THEN RETURN false; END IF;
 IF p_payload ? 'error_code' THEN
  UPDATE public.feedback_generation_attempts SET status='failed',completed_at=clock_timestamp(),latency_ms=greatest(0,extract(epoch FROM clock_timestamp()-a.created_at)*1000)::integer WHERE id=a.id;
  UPDATE public.talk_feedback_reports SET status='failed',error_code=p_payload->>'error_code',result=NULL WHERE user_id=a.user_id AND fingerprint=a.fingerprint AND status<>'ready'; RETURN true;
 END IF;
 SELECT * INTO p FROM public.coaching_preferences WHERE user_id=a.user_id FOR UPDATE;
 IF p.source_revision<>(p_payload->>'source_revision')::integer THEN
  UPDATE public.feedback_generation_attempts SET status='failed',completed_at=clock_timestamp(),latency_ms=greatest(0,extract(epoch FROM clock_timestamp()-a.created_at)*1000)::integer WHERE id=a.id; RETURN false;
 END IF;
 IF a.kind='profile' THEN
  INSERT INTO public.coaching_profile_versions(id,user_id,source_revision,source_hash,source_text,english_level,first_language,profile,compiler_version,model)
  VALUES((p_payload->>'id')::uuid,a.user_id,p.source_revision,p_payload->>'source_hash',p.plain_text,p.english_level,p.first_language,p_payload->'profile',p_payload->>'compiler_version',p_payload->>'model');
  UPDATE public.coaching_preferences SET current_profile_version_id=(p_payload->>'id')::uuid WHERE user_id=a.user_id;
 ELSE
  UPDATE public.talk_feedback_reports SET status='ready',result=p_payload->'result',error_code=NULL WHERE user_id=a.user_id AND fingerprint=a.fingerprint AND status<>'ready';
 END IF;
 UPDATE public.feedback_generation_attempts SET status='ready',completed_at=clock_timestamp(),latency_ms=greatest(0,extract(epoch FROM clock_timestamp()-a.created_at)*1000)::integer WHERE id=a.id; RETURN true;
END $$;
CREATE FUNCTION public.prepare_feedback_report(p_attempt uuid,p_token uuid,p_report jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.feedback_generation_attempts;
BEGIN
 SELECT * INTO a FROM public.feedback_generation_attempts WHERE id=p_attempt;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.user_id::text,0));
 SELECT * INTO a FROM public.feedback_generation_attempts WHERE id=p_attempt FOR UPDATE;
 IF a.token IS DISTINCT FROM p_token OR a.kind<>'report' OR a.status<>'generating' OR a.lease_expires_at<=clock_timestamp() THEN RETURN false; END IF;
 INSERT INTO public.talk_feedback_reports(id,user_id,session_id,profile_version_id,parent_report_id,first_language,english_level,fingerprint,transcript_hash,transcript_snapshot,model,prompt_version,clarifications,lease_expires_at)
 VALUES((p_report->>'id')::uuid,a.user_id,(p_report->>'session_id')::uuid,(p_report->>'profile_version_id')::uuid,(p_report->>'parent_report_id')::uuid,p_report->>'first_language',p_report->>'english_level',a.fingerprint,p_report->>'transcript_hash',p_report->>'transcript_snapshot',p_report->>'model',p_report->>'prompt_version',p_report->'clarifications',a.lease_expires_at)
 ON CONFLICT(user_id,fingerprint) DO UPDATE SET status='generating',error_code=NULL,lease_expires_at=a.lease_expires_at WHERE talk_feedback_reports.status<>'ready';
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.prepare_feedback_report(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_feedback_report(uuid,uuid,jsonb) TO service_role;
CREATE FUNCTION public.link_feedback_retry(p_session uuid,p_source uuid,p_targets text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); src public.talk_feedback_reports; existing public.talk_feedback_retries;
BEGIN
 IF u IS NULL OR NOT EXISTS(SELECT 1 FROM public.talk_sessions WHERE id=p_session AND user_id=u) THEN RAISE EXCEPTION 'feedback_session_missing'; END IF;
 SELECT * INTO src FROM public.talk_feedback_reports WHERE id=p_source AND user_id=u AND status='ready';
 IF src.id IS NULL OR src.session_id=p_session OR cardinality(p_targets) NOT BETWEEN 1 AND 2 OR cardinality(p_targets)<>(SELECT count(DISTINCT x) FROM unnest(p_targets)x) THEN RAISE EXCEPTION 'feedback_bad_comparison'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_targets)t WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(src.result->'findings')f WHERE f->>'id'=t AND f->>'certainty'='supported')) THEN RAISE EXCEPTION 'feedback_bad_comparison'; END IF;
 SELECT * INTO existing FROM public.talk_feedback_retries WHERE session_id=p_session FOR UPDATE;
 IF existing.session_id IS NOT NULL AND (existing.source_report_id<>p_source OR NOT(existing.target_finding_ids @> p_targets AND existing.target_finding_ids <@ p_targets)) THEN RAISE EXCEPTION 'feedback_bad_comparison'; END IF;
 INSERT INTO public.talk_feedback_retries(session_id,user_id,source_report_id,target_finding_ids) VALUES(p_session,u,p_source,p_targets) ON CONFLICT(session_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.link_feedback_retry(uuid,uuid,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.link_feedback_retry(uuid,uuid,text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.save_coaching_preferences(uuid,integer,text,text,text,text),public.claim_feedback_generation(uuid,text,text,uuid),public.complete_feedback_generation(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_coaching_preferences(uuid,integer,text,text,text,text),public.claim_feedback_generation(uuid,text,text,uuid),public.complete_feedback_generation(uuid,uuid,jsonb) TO service_role;
COMMIT;
