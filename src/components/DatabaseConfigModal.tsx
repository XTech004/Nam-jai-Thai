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
  Server
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  saveCustomSupabaseCredentials, 
  clearCustomSupabaseCredentials,
  isSupabaseActive 
} from '../services/supabaseClient';
import { testSupabaseConnection } from '../services/db';

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
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isFromStorage, setIsFromStorage] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const creds = getSupabaseCredentials();
      setUrl(creds.url);
      setAnonKey(creds.anonKey);
      setIsFromStorage(creds.isFromStorage);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
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
    people JSONB NOT NULL DEFAULT '{"adults": 1, "elderly": 0, "bedridden": 0, "children": 0, "pets": 0}'::jsonb,
    needs TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    image_url TEXT,
    responder_notes TEXT DEFAULT '',
    rescued_by TEXT DEFAULT ''
);

ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.sos_requests FOR SELECT USING (true);
CREATE POLICY "Public insert" ON public.sos_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON public.sos_requests FOR UPDATE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_requests;`;

    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isActive = isSupabaseActive();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
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
        <div className={`p-3.5 rounded-xl border mb-5 text-sm ${
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
        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
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
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
            />
          </div>

          {/* Test connection alert message */}
          {testResult && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {isFromStorage && (
                <button
                  type="button"
                  onClick={handleResetToLocal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ยกเลิกการเชื่อมต่อ
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ปิด
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    กำลังทดสอบ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ทดสอบและบันทึก
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick Setup Instructions */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              วิธีตั้งค่า Supabase Cloud DB ฟรี (ใช้เวลา 2 นาที):
            </h4>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
            >
              เปิด supabase.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 mb-3">
            <li>สร้างโปรเจกต์ใหม่ฟรีที่ <strong>supabase.com</strong></li>
            <li>ไปที่เมนู <strong>SQL Editor</strong> ด้านซ้าย แล้วคัดลอกคำสั่ง SQL ด้านล่างไปวางแล้วกด <strong>Run</strong></li>
            <li>ไปที่เมนู <strong>Project Settings &gt; API</strong> นำ Project URL และ anon public key มาใส่ในแบบฟอร์มนี้ หรือใส่ในไฟล์ <code>.env</code></li>
          </ol>

          <button
            type="button"
            onClick={copySqlToClipboard}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-slate-200 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors font-mono"
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
    </div>
  );
};
