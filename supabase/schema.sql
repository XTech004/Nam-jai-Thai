-- ==============================================================================
-- ThaiFlood SOS: PostgreSQL Schema for Supabase
-- ระบบฐานข้อมูลฉุกเฉินและกู้ภัยอุทกภัยแบบ Real-time
-- ==============================================================================

-- 1. Create table for SOS requests
CREATE TABLE IF NOT EXISTS public.sos_requests (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    urgency TEXT NOT NULL CHECK (urgency IN ('CRITICAL', 'URGENT', 'NORMAL')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESPONDING', 'COMPLETED', 'CANCELLED')),
    
    -- Victim contact details
    full_name TEXT NOT NULL,
    primary_phone TEXT NOT NULL,
    secondary_phone TEXT,
    line_id TEXT,
    
    -- Location details
    province TEXT NOT NULL,
    district TEXT NOT NULL,
    sub_district TEXT,
    address TEXT NOT NULL,
    landmark TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    
    -- Flood situation & residents
    water_level TEXT NOT NULL,
    people JSONB NOT NULL DEFAULT '{"adults": 1, "elderly": 0, "bedridden": 0, "children": 0, "pets": 0}'::jsonb,
    needs TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    image_url TEXT,
    
    -- Rescuer tracking
    responder_notes TEXT DEFAULT '',
    rescued_by TEXT DEFAULT ''
);

-- 2. Indexes for fast geospatial and urgency filtering
CREATE INDEX IF NOT EXISTS idx_sos_requests_status ON public.sos_requests(status);
CREATE INDEX IF NOT EXISTS idx_sos_requests_urgency ON public.sos_requests(urgency);
CREATE INDEX IF NOT EXISTS idx_sos_requests_created_at ON public.sos_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_requests_coords ON public.sos_requests(latitude, longitude);

-- 3. Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sos_requests_modtime ON public.sos_requests;
CREATE TRIGGER trg_sos_requests_modtime
    BEFORE UPDATE ON public.sos_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 4. Secure case data: browser/anon roles have no direct table access.
-- All reads and writes must go through the authenticated server API.
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

-- No sample SOS cases are inserted into a real database.
