# 🌊 ThaiFlood SOS - เว็บแอปพลิเคชันระบบแจ้งขอความช่วยเหลือฉุกเฉินน้ำท่วม

เว็บแอปพลิเคชันช่วยเหลือผู้ประสบอุทกภัยฉุกเฉิน (Mobile-First Web App) ที่ออกแบบมาเพื่อการใช้งานในสถานการณ์วิกฤต โหลดรวดเร็ว ใช้งานง่ายบนมือถือ รองรับสัญญาณอินเทอร์เน็ตต่ำ และมีระบบสำรอง (Offline Fallback / SMS / LINE / Google Maps) พร้อมรองรับฐานข้อมูลจริง Cloud PostgreSQL (Supabase) แบบ Real-time!

---

## 🌟 ฟังก์ชันหลัก (Key Features)

### 1. 🚨 หน้าแจ้งขอความช่วยเหลือฉุกเฉิน (SOS Emergency Form)
- **ดึงพิกัด GPS อัตโนมัติในคลิกเดียว (One-Tap GPS)**: ดึงค่าละติจูด/ลองจิจูดแบบแม่นยำสูง พร้อมปุ่มเปิดเช็กบน Google Maps ทันที
- **คัดกรองความเร่งด่วนตามหลักการแพทย์และกู้ภัย (Triage 3 ระดับ)**:
  - 🔴 **วิกฤตสีแดง (Critical)**: มีผู้ป่วยติดเตียง, เด็กทารก, อยู่บนหลังคา/น้ำมิดชั้น 1, อดอาหารเกิน 24 ชม.
  - 🟡 **เร่งด่วนสีเหลือง (Urgent)**: น้ำเข้าบ้าน, น้ำขึ้นต่อเนื่อง, ไฟฟ้าดับ, ต้องการเรืออพยพ
  - 🟢 **ช่วยเหลือทั่วไปสีเขียว (Normal)**: ขอถุงยังชีพ, ยาสามัญ, อาหารสัตว์เลี้ยง
- **จำแนกสมาชิกในบ้าน**: ผู้ใหญ่, ผู้สูงอายุ, ผู้ป่วยติดเตียง/พิการ, เด็กเล็ก, สัตว์เลี้ยง
- **ระบุระดับน้ำ**: ข้อเท้า-เข่า, เอว-อก, ท่วมมิดชั้น 1 (อยู่ชั้น 2), บนหลังคา/ดาดฟ้า, ถนนตัดขาด
- **จุดสังเกตเด่น (Landmark)**: ระบุจุดสังเกตเมื่อป้ายบ้านจมน้ำ (เช่น สีหลังคา, สีรั้ว, ต้นไม้ใหญ่)
- **แนบภาพถ่ายสถานที่จริง**: ถ่ายรูปจากกล้องมือถือหรือเลือกรูปภาพ

### 2. 🗄️ ฐานข้อมูลพร้อมใช้ (Real-time Cloud Database & Local Fallback)
- **Supabase PostgreSQL & Realtime**:
  - เมื่อมีผู้แจ้งเหตุใหม่ หรือหน่วยกู้ภัยกดรับเคส / ช่วยเหลือสำเร็จ ข้อมูลจะอัปเดตแบบสด (Websocket) ไปยังหน้าจอของทุกหน่วยกู้ภัยทันทีโดยไม่ต้องรีเฟรชหน้าจอ
  - มีไฟล์ `supabase/schema.sql` พร้อมรันใน Supabase SQL Editor ในคลิกเดียว
- **Dual Mode (ระบบสำรองออฟไลน์)**:
  - หากยังไม่ได้ตั้งค่าคีย์ หรือเครือข่ายหลุด ระบบจะสลับไปใช้ Browser Local Storage ทันที ทำให้ระบบไม่หยุดทำงานในยามฉุกเฉิน
  - มีหน้าต่างตั้งค่าฐานข้อมูลในตัวเว็บ (คลิกที่ปุ่ม Database ที่แถบด้านบน) เพื่อทดสอบการเชื่อมต่อได้ทันที

### 3. ⚡ ระบบแชร์ฉุกเฉิน & ออฟไลน์ (Offline & Multi-Channel Fallback)
- **สร้างข้อความ SMS พร้อมพิกัดอัตโนมัติ**: กดส่ง SMS ถึงศูนย์กู้ภัยหรือเบอร์ 1784 ได้ทันทีแม้สัญญาณเน็ต 4G/5G ขัดข้อง
- **แชร์เข้า LINE ในคลิกเดียว**: ฟอร์แมตข้อความสรุปเคสพร้อมลิงก์ Google Maps ให้ส่งเข้ากลุ่ม LINE ครอบครัวหรือกู้ภัย
- **คัดลอกข้อความสรุปทั้งหมด**: พร้อมนำไปโพสต์ใน Facebook หรือแชทกลุ่ม

### 4. 📋 กระดานรายการเหตุสดสำหรับกู้ภัย (Rescue Live Feed & Dispatch)
- กรองตามระดับวิกฤต (แดง/เหลือง/เขียว), สถานะ (รอดำเนินการ, กำลังไปช่วย, สำเร็จแล้ว), และจังหวัด
- ค้นหาด้วยชื่อ, เบอร์โทร, อำเภอ, จังหวัด หรือจุดสังเกต
- ปุ่มกดโทรหาผู้ประสบภัยทันที (`tel:`) และปุ่มเปิดระบบนำทางเรือ/รถยกสูง

### 5. 🗺️ แผนที่พิกัดผู้ประสบอุทกภัย (Interactive Rescue Map)
- แสดงหมุดสีตามระดับความเร่งด่วน (หมุดสีแดงกระพริบฉุกเฉิน)
- ป๊อปอัปสรุปข้อมูลผู้ติดค้าง พร้อมปุ่มโทรและปุ่มนำทาง
- ทำงานบนแผนที่ OpenStreetMap (Leaflet) ไม่มีค่าใช้จ่าย API

### 6. 📞 รวมเบอร์สายด่วนฉุกเฉิน & คู่มือเอาตัวรอด (Hotlines & Survival Guide)
- รวมเบอร์โทรฟรี 24 ชม. (1784 ปภ., 1669 การแพทย์ฉุกเฉิน, 199 ดับเพลิง/กู้ภัย, ฯลฯ)
- ข้อควรระวังเรื่องไฟฟ้าดูด, สัตว์มีพิษหนีน้ำ, เทคนิคประหยัดแบตเตอรี่มือถือ, และสัญญาณขอความช่วยเหลือสากล (SOS)

---

## 🛠️ ตั้งค่าระบบสำหรับทดลองใช้งานแบบจำกัด

1. เข้าไปที่ [supabase.com](https://supabase.com) แล้วกด **Sign In / Sign Up** (ฟรี)
2. กด **New Project** ตั้งชื่อโปรเจกต์ เช่น `flood-relief-sos` และตั้งรหัสผ่านฐานข้อมูล
3. เมื่อโปรเจกต์สร้างเสร็จ ไปที่เมนู **SQL Editor** ทางซ้าย
4. เปิดไฟล์ [`supabase/schema.sql`](supabase/schema.sql) ในโปรเจกต์นี้ คัดลอกคำสั่งทั้งหมดไปวางแล้วกด **Run**
5. ไปที่ **Project Settings > API** คัดลอก Project URL และ `service_role` key ไปเก็บเป็น server-only values
6. รัน migration [`supabase/migrations/20261009_temporary_pilot_security.sql`](supabase/migrations/20261009_temporary_pilot_security.sql) ใน SQL Editor เพื่อจำกัดตารางเคสและเปิด rate limit
7. ใน Vercel > **Project Settings > Environment Variables** เพิ่มตัวแปรตาม [`.env.example`](.env.example). ใช้ `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LINE_CHANNEL_ID`, `ADMIN_LINE_USER_ID`, `RATE_LIMIT_SECRET`
8. ตั้ง `LINE_CHANNEL_ACCESS_TOKEN` และ `LINE_TARGET_ID` เพิ่มเมื่อพร้อมรับแจ้งเตือนทาง LINE ระบบส่งไปยังปลายทางที่กำหนดเท่านั้น
9. ห้ามตั้ง `VITE_` นำหน้า service role key หรือ LINE access token เพราะ Vite จะเปิดเผยค่าใน browser bundle

---

## 🚀 วิธีเปิดใช้งานและทดสอบในเครื่อง (Local Dev)

```bash
# 1. ติดตั้งไลบรารี
npm install

# 2. เริ่มเซิร์ฟเวอร์ทดสอบ
npm run dev

# 3. ทดสอบ Build สำหรับ Production
npm run build
```

---

## 🌐 วิธีนำขึ้นระบบออนไลน์ (Production Deployment)

### ทางเลือกที่ 1: Deploy บน Vercel (แนะนำ - ฟรี & เร็วที่สุด)
1. นำโค้ดขึ้น GitHub (ดูหัวข้อ Git ด้านล่าง)
2. เข้าไปที่ [vercel.com](https://vercel.com) แล้วล็อกอินด้วย GitHub
3. กด **Add New Project** > เลือก Repository `flood-relief-sos`
4. เพิ่ม server-only Environment Variables ตามหัวข้อ Supabase ด้านบน
5. ตรวจสอบว่ารัน schema และ migration ในฐานข้อมูลแล้ว จึงค่อย Deploy

ระบบนี้ยังเป็นต้นแบบ: รายการเคสและแผนที่เปิดให้ LINE ID แอดมินที่กำหนดไว้เท่านั้น และยังไม่มีการมอบหมายงานหรือยืนยันรับเคสจากหน่วยกู้ภัย การส่ง LINE แจ้งเตือนไม่ยืนยันว่าทีมได้รับหรือรับเคสแล้ว

### ทางเลือกที่ 2: Deploy บน Netlify (ฟรี)
1. เข้าไปที่ [netlify.com](https://netlify.com) แล้วเชื่อมต่อกับ GitHub Repository
2. ตั้งค่า Build Command: `npm run build` และ Publish Directory: `dist`
3. Static hosting บน Netlify ยังไม่ให้ API routes ชุดนี้ทำงาน ต้องย้าย API ไป Netlify Functions ก่อน

### ทางเลือกที่ 3: Deploy บน GitHub Pages (ฟรี)
- โปรเจกต์นี้มีไฟล์ [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) ให้แล้ว
- เพียงเปิดไปที่ Repository บน GitHub > Settings > Pages > Source เลือก **GitHub Actions**
- GitHub Pages ใช้เสิร์ฟหน้าเว็บ static เท่านั้น จึงไม่รองรับ API routes/การเก็บ secret ของระบบนี้

### ทางเลือกที่ 4: รันผ่าน Docker
```bash
docker compose up -d
```
เข้าใช้งานได้ที่: `http://localhost:3000`

---

## 📦 การนำโค้ดขึ้น Git (Push to GitHub)

รันคำสั่งต่อไปนี้ใน Terminal เพื่อส่งโค้ดขึ้น GitHub ของคุณ:

```bash
# 1. ตรวจสอบสถานะ Git
git status

# 2. ผูกกับ Remote Repository บน GitHub (แทนที่ <YOUR_GITHUB_URL> ด้วย URL ของคุณ)
git remote add origin https://github.com/<YOUR-USERNAME>/flood-relief-sos.git

# 3. ตั้งชื่อ branch เป็น main
git branch -M main

# 4. Push โค้ดทั้งหมดขึ้น GitHub
git push -u origin main
```
