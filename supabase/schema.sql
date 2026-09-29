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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Allow public access for disaster response)
DROP POLICY IF EXISTS "Public can view SOS requests" ON public.sos_requests;
CREATE POLICY "Public can view SOS requests"
    ON public.sos_requests
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can submit SOS requests" ON public.sos_requests;
CREATE POLICY "Public can submit SOS requests"
    ON public.sos_requests
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Rescuers and public can update SOS status" ON public.sos_requests;
CREATE POLICY "Rescuers and public can update SOS status"
    ON public.sos_requests
    FOR UPDATE
    USING (true);

-- 6. Enable Realtime Replication for instant push notifications
-- Note: Supabase project usually has supabase_realtime publication pre-configured
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sos_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_requests;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if publication doesn't exist yet
END $$;

-- 7. Seed Initial Realistic Mock Data (Optional: Mae Sai & Chiang Rai flood cases)
INSERT INTO public.sos_requests (
    id, created_at, updated_at, urgency, status,
    full_name, primary_phone, secondary_phone, line_id,
    province, district, sub_district, address, landmark,
    latitude, longitude, water_level, people, needs, notes, responder_notes, rescued_by
) VALUES
(
    'SOS-2026-001',
    NOW() - INTERVAL '25 minutes',
    NOW() - INTERVAL '25 minutes',
    'CRITICAL',
    'PENDING',
    'คุณสมศักดิ์ วงศ์สว่าง',
    '081-234-5678',
    '089-987-6543',
    'somsak_w',
    'เชียงราย',
    'แม่สาย',
    'เวียงพางคำ',
    '142/3 หมู่ 4 ซอยเกาะทราย 5',
    'บ้านปูน 2 ชั้น รั้วสีฟ้า อยู่ติดกับร้านขายของชำป้าพร มีผ้าแดงผูกตรงระเบียงชั้น 2',
    20.4328,
    99.8821,
    'SECOND_FLOOR',
    '{"adults": 2, "elderly": 1, "bedridden": 1, "children": 2, "pets": 1}'::jsonb,
    ARRAY['เรือท้องแบน/เรือกู้ภัยอพยพด่วน', 'การอพยพผู้ป่วยติดเตียง (ต้องใช้ออกซิเจน)', 'น้ำดื่มสะอาดและอาหารสำเร็จรูป', 'นมผงและผ้าอ้อมเด็ก'],
    'น้ำไหลเชี่ยวมาก ระดับน้ำชั้นล่างมิดศีรษะแล้ว ตอนนี้ผู้ป่วยติดเตียงอยู่บนเตียงชั้น 2 แบตเตอรี่มือถือเหลือ 15%',
    '',
    ''
),
(
    'SOS-2026-002',
    NOW() - INTERVAL '65 minutes',
    NOW() - INTERVAL '15 minutes',
    'CRITICAL',
    'RESPONDING',
    'คุณรัตนาภรณ์ จิตต์เจริญ',
    '095-432-1100',
    NULL,
    'rattana_bkk',
    'เชียงราย',
    'เมืองเชียงราย',
    'ริมกก',
    '88/12 หมู่บ้านริมน้ำกก ซอย 3',
    'หลังคาสีเขียว อยู่ตรงข้ามวัดฝั่งหมิ่น มีคนใส่เสื้อส้มโบกธงอยู่บนดาดฟ้า',
    19.9215,
    99.8450,
    'ROOF_TOP',
    '{"adults": 3, "elderly": 2, "bedridden": 0, "children": 1, "pets": 2}'::jsonb,
    ARRAY['เรือท้องแบน/เรือกู้ภัยอพยพด่วน', 'เฮลิคอปเตอร์ยกตัว/เจ็ตสกี', 'น้ำดื่มสะอาดและอาหารสำเร็จรูป', 'ไฟฉาย/พาวเวอร์แบงก์'],
    'น้ำท่วมมิดหลังคาชั้นเดียว ต้องปีนขึ้นไปอยู่บนดาดฟ้าเพื่อนบ้าน มีคนแก่เป็นโรคหัวใจเริ่มหายใจเหนื่อยหอบ',
    'ทีมตอบโต้ภัยพิบัติสยามแม่สาย นำเรือเจ็ตสกี 2 ลำกำลังลุยฝ่าน้ำเชี่ยวเข้าไป คาดว่าถึงใน 15 นาที',
    'ทีมกู้ภัยสยามแม่สาย (เจ็ตสกี 2 ลำ)'
),
(
    'SOS-2026-003',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '40 minutes',
    'URGENT',
    'RESPONDING',
    'นายกิตติเดช ปัญญาดี',
    '062-889-1234',
    NULL,
    NULL,
    'เชียงราย',
    'แม่สาย',
    'แม่สาย',
    '23/1 ซอยเหมืองแดง 7',
    'ร้านซ่อมมอเตอร์ไซค์ช่างกิต ประตูเหล็กม้วนสีน้ำเงิน มีป้ายยาง Michelin หน้าร้าน',
    20.4285,
    99.8790,
    'WAIST_CHEST',
    '{"adults": 4, "elderly": 0, "bedridden": 0, "children": 0, "pets": 4}'::jsonb,
    ARRAY['น้ำดื่มสะอาดและอาหารสำเร็จรูป', 'อาหารสุนัข/แมว', 'ไฟฉาย/พาวเวอร์แบงก์', 'ยาสามัญ/ชุดปฐมพยาบาล'],
    'น้ำทรงตัวระดับอก ติดอยู่ชั้นลอย ยังไม่อพยพเพราะมีสุนัข 4 ตัว แต่ขาดแคลนน้ำดื่มและอาหารแห้ง ไฟฟ้าตัดตั้งแต่เมื่อคืน',
    'นำอาหารแห้งและน้ำดื่ม 3 แพ็คส่งมอบให้ทางหน้าต่างชั้นลอยเรียบร้อยแล้ว ผู้ขอความช่วยเหลือยังคงพักอยู่ชั้นบน',
    'อาสามูลนิธิกระจกเงา'
),
(
    'SOS-2026-004',
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '50 minutes',
    'CRITICAL',
    'COMPLETED',
    'นางสมศรี มีทรัพย์',
    '083-111-2233',
    '053-731-234',
    NULL,
    'เชียงราย',
    'แม่สาย',
    'เวียงพางคำ',
    '50/2 ซอยสายลมจอย ตลาดแม่สาย',
    'ตึกแถว 3 ชั้น ข้างศาลเจ้าแม่สาย หน้าร้านแขวนผ้าขาวม้า',
    20.4435,
    99.8805,
    'SECOND_FLOOR',
    '{"adults": 1, "elderly": 2, "bedridden": 1, "children": 0, "pets": 0}'::jsonb,
    ARRAY['เรือท้องแบน/เรือกู้ภัยอพยพด่วน', 'การอพยพผู้ป่วยติดเตียง (ต้องใช้ออกซิเจน)'],
    'มีคุณยายติดเตียงอายุ 89 ปี แบตเตอรี่เครื่องผลิตออกซิเจนหมด',
    'ทีมทหาร มทบ.37 ร่วมกับ ปภ. เข้าช่วยเหลืออพยพคุณยายและญาติขึ้นเรือยางอย่างปลอดภัย นำส่ง รพ.แม่สาย เรียบร้อยแล้ว',
    'กองทัพภาคที่ 3 (มทบ.37) & รพ.ค่ายเม็งรายมหาราช'
),
(
    'SOS-2026-005',
    NOW() - INTERVAL '80 minutes',
    NOW() - INTERVAL '80 minutes',
    'NORMAL',
    'PENDING',
    'นายสุรศักดิ์ ใจกล้า',
    '089-445-6789',
    NULL,
    'surasak_jk',
    'เชียงราย',
    'เมืองเชียงราย',
    'รอบเวียง',
    '19/4 ถนนพ่อขุน ซอย 2',
    'บ้านเดี่ยวไม้สัก รั้วต้นข่อยตัดตรง มีรถกระบะจอดอยู่บนเนินดินหน้าบ้าน',
    19.9050,
    99.8320,
    'ANKLE_KNEE',
    '{"adults": 2, "elderly": 0, "bedridden": 0, "children": 1, "pets": 1}'::jsonb,
    ARRAY['กระสอบทราย/แบริเออร์กั้นน้ำ', 'ยาสามัญ/ชุดปฐมพยาบาล'],
    'น้ำเริ่มเอ่อจากท่อระบายน้ำท่วมสนามหญ้าหน้าบ้านระดับเข่า ยังไม่เข้าตัวบ้าน ขอสนับสนุนกระสอบทราย 20 ถุงกั้นประตูด้านหน้า',
    '',
    ''
)
ON CONFLICT (id) DO NOTHING;
