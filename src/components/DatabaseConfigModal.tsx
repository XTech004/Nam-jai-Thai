import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  Trash2,
  Server,
  MessageCircle,
  Bell,
  Send,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveCustomSupabaseCredentials, 
  clearCustomSupabaseCredentials,
  isSupabaseActive 
} from '../services/supabaseClient';
import { testSupabaseConnection } from '../services/db';
import { 
  getLineConfig, 
  saveLineConfig, 
  sendSosLineAlert 
} from '../services/lineNotificationService';
import type { SOSRequest } from '../types/sos';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'line'>('supabase');

  // Supabase State
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isFromStorage, setIsFromStorage] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // LINE Alert State
  const [lineToken, setLineToken] = useState('');
  const [lineTargetId, setLineTargetId] = useState('');
  const [lineWebhook, setLineWebhook] = useState('');
  const [isTestingLine, setIsTestingLine] = useState(false);
  const [lineTestResult, setLineTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setIsFromStorage(creds.isFromStorage);
      setTestResult(null);

      const lineCfg = getLineConfig();
      setLineToken(lineCfg.channelAccessToken || '');
      setLineTargetId(lineCfg.targetId || '');
      setLineWebhook(lineCfg.webhookUrl || '');
      setLineTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'กรุณากรอกทั้ง Supabase URL และ Anon Key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testSupabaseConnection(url, anonKey);
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      saveCustomSupabaseCredentials(url, anonKey);
      setIsFromStorage(true);
      onConfigChanged();
    }
  };

  const handleResetToLocal = () => {
    clearCustomSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setIsFromStorage(false);
    setTestResult({ success: true, message: 'รีเซ็ตกลับเป็นโหมด Local Storage เรียบร้อยแล้ว' });
    onConfigChanged();
  };

  const handleSaveLineConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveLineConfig({
      channelAccessToken: lineToken.trim(),
      targetId: lineTargetId.trim(),
      webhookUrl: lineWebhook.trim(),
      enabled: Boolean(lineToken.trim() || lineWebhook.trim()),
    });
    setLineTestResult({
      success: true,
      message: 'บันทึกการตั้งค่า LINE สำเร็จแล้ว!',
    });
  };

  const handleTestSendLine = async () => {
    // Save current values first
    saveLineConfig({
      channelAccessToken: lineToken.trim(),
      targetId: lineTargetId.trim(),
      webhookUrl: lineWebhook.trim(),
      enabled: true,
    });

    setIsTestingLine(true);
    setLineTestResult(null);

    const mockCase: SOSRequest = {
      id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      urgency: 'CRITICAL',
      status: 'PENDING',
      fullName: 'นายทดสอบ ช่วยเหลือดี (เคสทดสอบระบบ)',
      primaryPhone: '0812345678',
      lineId: 'test_rescuer_user',
      province: 'เชียงราย',
      district: 'แม่สาย',
      subDistrict: 'เวียงพางคำ',
      address: '99/1 หมู่ 3 ซอยริมสาย 4',
      landmark: 'ติดร้านค้าหลังคาสีฟ้า ใกล้สะพานมิตรภาพ',
      coordinates: {
        lat: 20.4333,
        lng: 99.8833,
        accuracy: 10,
      },
      waterLevel: 'ROOF_TOP',
      people: {
        adults: 2,
        elderly: 1,
        bedridden: 1,
        children: 1,
        pets: 2,
      },
      needs: ['เรือท้องแบน', 'อาหารและน้ำดื่ม', 'ยารักษาโรค/ผู้ป่วยติดเตียง'],
      notes: 'ระดับน้ำสูงถึงขอบหลังคา กำลังรอความช่วยเหลือด่วนมาก',
    };

    const res = await sendSosLineAlert(mockCase);
    setLineTestResult(res);
    setIsTestingLine(false);
  };

  const copySqlToClipboard = () => {
    const sqlScript = `-- รันใน Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.sos_requests (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    urgency TEXT NOT NULL CHECK (urgency IN ('CRITICAL', 'URGENT', 'NORMAL')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESPONDING', 'COMPLETED', 'CANCELLED')),
    full_name TEXT NOT NULL,
    primary_phone TEXT NOT NULL,
    secondary_phone TEXT,
    line_id TEXT,
    province TEXT NOT NULL,
    district TEXT NOT NULL,
    sub_district TEXT,
    address TEXT NOT NULL,
    landmark TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    water_level TEXT NOT NULL,
    people JSONB NOT NULL DEFAULT '{}'::jsonb,
    needs JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    image_url TEXT,
    responder_notes TEXT,
    rescued_by TEXT
);

ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public SOS Read" ON public.sos_requests;
DROP POLICY IF EXISTS "Public SOS Insert" ON public.sos_requests;
DROP POLICY IF EXISTS "Public SOS Update" ON public.sos_requests;
CREATE POLICY "Public SOS Read" ON public.sos_requests FOR SELECT USING (true);
CREATE POLICY "Public SOS Insert" ON public.sos_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public SOS Update" ON public.sos_requests FOR UPDATE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_requests;`;

    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const isActive = isSupabaseActive();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'supabase'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>ฐานข้อมูล Supabase</span>
          </button>
          <button
            onClick={() => setActiveTab('line')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'line'
                ? 'bg-[#06C755] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>LINE แจ้งเตือนกู้ภัย & แชท</span>
          </button>
        </div>

        {activeTab === 'supabase' ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  ตั้งค่าฐานข้อมูล (Database)
                  {isActive ? (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      เชื่อมต่อ Cloud DB แล้ว
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                      โหมด Local Storage
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  เชื่อมต่อ Supabase PostgreSQL เพื่อส่งข้อมูล Real-time ให้ทุกทีมกู้ภัยเห็นพร้อมกัน
                </p>
              </div>
            </div>

            {/* Current Status Banner */}
            <div className={`p-3.5 rounded-2xl border mb-5 text-sm ${
              isActive 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-start gap-2.5">
                <Server className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <div className="text-xs leading-relaxed">
                  <strong className="block font-semibold mb-0.5">
                    สถานะปัจจุบัน: {isActive ? 'ระบบทำงานบน Cloud Realtime Database' : 'ระบบทำงานบน Browser Local Storage'}
                  </strong>
                  {isActive ? (
                    <span>เคส SOS และสถานะจะอัปเดตแบบสด (Websocket) ไปยังหน้าจอของทุกหน่วยกู้ภัยทันทีที่มีการเปลี่ยนแปลง</span>
                  ) : (
                    <span>ข้อมูลบันทึกในเบราว์เซอร์เครื่องนี้ คุณสามารถทดลองใช้งาน แจ้งเหตุ และกู้ภัยได้ตามปกติ</span>
                  )}
                </div>
              </div>
            </div>

            {/* Connection Form */}
            <form onSubmit={handleTestAndSaveSupabase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supabase Anon Public API Key
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังทดสอบการเชื่อมต่อ...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      ทดสอบและบันทึกการเชื่อมต่อ
                    </>
                  )}
                </button>

                {isFromStorage && (
                  <button
                    type="button"
                    onClick={handleResetToLocal}
                    className="py-2.5 px-3 border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="ล้างการตั้งค่าและกลับไปใช้ Local Storage"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    รีเซ็ต
                  </button>
                )}
              </div>
            </form>

            {/* SQL Guide */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  คำสั่งสร้างตารางใน Supabase
                </span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  เปิด supabase.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <button
                type="button"
                onClick={copySqlToClipboard}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-slate-200 text-xs font-medium rounded-xl flex items-center justify-center gap-2 transition-colors font-mono cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    คัดลอกคำสั่ง SQL เรียบร้อยแล้ว!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    คัดลอกคำสั่งสร้างตาราง SQL (Table Schema)
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* LINE Alerts & Messaging API Tab                          */
          /* ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#06C755] flex items-center justify-center border border-emerald-200">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  LINE แจ้งเตือนกู้ภัย & แชทสด
                </h3>
                <p className="text-xs text-slate-500">
                  ส่งการ์ดแจ้งเหตุฉุกเฉิน (Flex Message) เด้งเข้ากลุ่ม LINE กู้ภัยทันทีที่มีคนส่ง SOS
                </p>
              </div>
            </div>

            {/* LINE Notice Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#06C755]">
                <ShieldCheck className="w-4 h-4" />
                <span>รองรับมาตรฐาน LINE Messaging API & Flex Message 100%</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                เนื่องจากบริการ LINE Notify เดิมได้ยุติให้บริการแล้ว ระบบน้ำใจไทยใช้ <b>LINE Messaging API</b> ซึ่งสามารถส่งการ์ดข้อมูลสีแดงวิกฤต พร้อมพิกัด GPS, เรดาร์ฝน WeatherNext 3, และปุ่มเปิดแชทกับผู้แจ้งได้โดยตรง!
              </p>
            </div>

            {/* LINE Settings Form */}
            <form onSubmit={handleSaveLineConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  LINE Channel Access Token (Long-lived)
                </label>
                <input
                  type="password"
                  placeholder="รับจากแท็บ Messaging API ใน LINE Developers Console"
                  value={lineToken}
                  onChange={(e) => setLineToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  LINE Target ID (Group ID หรือ User ID ที่ต้องการให้เตือน)
                </label>
                <input
                  type="text"
                  placeholder="เช่น c123456789... (Group ID) หรือ U123... (เว้นว่างไว้เพื่อ Broadcast)"
                  value={lineTargetId}
                  onChange={(e) => setLineTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:outline-none font-mono"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  * หากเว้นว่างไว้ ระบบจะใช้โหมด Broadcast ส่งแจ้งเตือนไปยังผู้ติดตามบอททุกคน
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Webhook URL สำหรับส่งต่อ (ทางเลือกเสริม)
                </label>
                <input
                  type="url"
                  placeholder="https://your-custom-webhook.com/line-dispatch"
                  value={lineWebhook}
                  onChange={(e) => setLineWebhook(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#06C755] focus:outline-none font-mono"
                />
              </div>

              {lineTestResult && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  lineTestResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{lineTestResult.message}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  บันทึกการตั้งค่า
                </button>

                <button
                  type="button"
                  onClick={handleTestSendLine}
                  disabled={isTestingLine}
                  className="py-2.5 px-4 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isTestingLine ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      ทดสอบส่งเข้า LINE
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Setup Guide */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 block">
                📌 วิธีรับ Channel Access Token ใน LINE Developers:
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-slate-600 text-[11px] leading-relaxed">
                <li>ไปที่หน้า LINE Developers Console ที่สร้าง LIFF ไว้</li>
                <li>กดปุ่ม <b>"Create a Messaging API channel"</b></li>
                <li>ไปที่แท็บ <b>Messaging API</b> เลื่อนลงมาล่างสุดตรง <i>Channel access token</i> กดปุ่ม <b>Issue</b></li>
                <li>คัดลอก Token มาวางในช่องด้านบน แล้วกดบันทึกและทดสอบส่งได้ทันที!</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
