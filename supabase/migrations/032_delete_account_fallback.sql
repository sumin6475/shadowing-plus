-- GoTrue's admin delete endpoint can reject an account even when the same
-- auth.users DELETE and every dependent cascade succeed. Keep the Edge
-- Function as the only public entry point, but give its service-role client a
-- narrow SQL fallback that can delete only the requested auth user.
CREATE OR REPLACE FUNCTION public.delete_auth_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_auth_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_auth_user(uuid) TO service_role;
