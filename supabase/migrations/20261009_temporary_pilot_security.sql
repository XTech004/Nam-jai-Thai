-- Temporary pilot security: all case access must go through the server API.
-- Run this in Supabase SQL Editor before enabling the Vercel API environment.
ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE policy_row RECORD;
BEGIN
  FOR policy_row IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sos_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sos_requests', policy_row.policyname);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.sos_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.sos_requests TO service_role;

CREATE TABLE IF NOT EXISTS public.sos_submission_limits (
  fingerprint text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count >= 1)
);
ALTER TABLE public.sos_submission_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sos_submission_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.sos_submission_limits TO service_role;

CREATE OR REPLACE FUNCTION public.try_allow_sos_submission(p_fingerprint text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE allowed boolean := false;
BEGIN
  INSERT INTO public.sos_submission_limits (fingerprint, window_started_at, request_count)
  VALUES (p_fingerprint, now(), 1)
  ON CONFLICT (fingerprint) DO UPDATE
    SET window_started_at = CASE
          WHEN public.sos_submission_limits.window_started_at < now() - interval '5 minutes' THEN now()
          ELSE public.sos_submission_limits.window_started_at
        END,
        request_count = CASE
          WHEN public.sos_submission_limits.window_started_at < now() - interval '5 minutes' THEN 1
          ELSE public.sos_submission_limits.request_count + 1
        END
  RETURNING request_count <= 5 INTO allowed;
  RETURN COALESCE(allowed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.try_allow_sos_submission(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_allow_sos_submission(text) TO service_role;
