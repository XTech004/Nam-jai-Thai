import React, { useState } from 'react';
import { 
  CheckCircle, 
  Copy, 
  Share2, 
  MessageSquare, 
  PhoneCall, 
  ExternalLink, 
  X, 
  MapPin, 
  Check 
} from 'lucide-react';
import type { SOSRequest } from '../types/sos';
import { buildSosShareText, getSmsLink, getLineShareUrl, copyToClipboard } from '../utils/shareHelpers';
import { getGoogleMapsUrl } from '../utils/formatters';

interface SuccessModalProps {
  request: SOSRequest;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  request,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const shareText = buildSosShareText(request);
  const mapsUrl = getGoogleMapsUrl(request.coordinates.lat, request.coordinates.lng);
  const lineUrl = getLineShareUrl(shareText);
  // Emergency SMS hotline default or recipient
  const smsUrl = getSmsLink('1784', shareText);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-md">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold">บันทึกคำขอในระบบแล้ว</h2>
          <p className="text-xs text-emerald-100 mt-1">
            รหัสเคสของคุณ: <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-white">{request.id}</span>
          </p>
        </div>

        {/* Action Buttons for Disaster Victims */}
        <div className="p-5 space-y-4">
          <div className={`${request.notificationSent ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-red-50 border-red-300 text-red-950'} border p-3 rounded-xl text-xs flex items-start gap-2`}>
            <span className="text-base">⚡</span>
            <div>
              <span className="font-bold">{request.notificationSent ? 'ระบบส่งการแจ้งเตือนไปยัง LINE ที่กำหนดแล้ว' : 'ยังส่งแจ้งเตือนถึงทีมไม่ได้'}</span>
              {' '}{request.notificationMessage || 'การบันทึกเคสไม่ใช่การยืนยันว่าหน่วยกู้ภัยรับเรื่องหรือกำลังเดินทาง'} โทร 1784 หรือ 1669 หากต้องการความช่วยเหลือฉุกเฉินทันที
            </div>
          </div>

          {/* Quick Sharing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Share to LINE */}
            <a
              href={lineUrl}
              target="_blank"
              rel="noreferrer"
              className="py-3 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all text-center"
            >
              <Share2 className="w-4 h-4" />
              <span>แชร์พิกัดเข้า LINE</span>
            </a>

            {/* Send SMS Fallback */}
            <a
              href={smsUrl}
              className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all text-center"
            >
              <MessageSquare className="w-4 h-4" />
              <span>ส่ง SMS เข้า ปภ. 1784</span>
            </a>

            {/* Copy full formatted text */}
            <button
              onClick={handleCopy}
              className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                copied
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>คัดลอกข้อความแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอกข้อความทั้งหมด</span>
                </>
              )}
            </button>

            {/* Call 1784 directly */}
            <a
              href="tel:1784"
              className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all text-center"
            >
              <PhoneCall className="w-4 h-4" />
              <span>โทรสายด่วน 1784</span>
            </a>
          </div>

          {/* Formatted Text Preview Box */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>ตัวอย่างข้อความฉุกเฉินที่ระบบสร้างให้:</span>
              <a 
                href={mapsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>พิกัด GPS บนแผนที่</span>
              </a>
            </div>
            <pre className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans leading-relaxed">
              {shareText}
            </pre>
          </div>

          <p className="border-t border-slate-100 pt-3 text-center text-xs leading-5 text-slate-600">
            เก็บรหัสเคสนี้ไว้สำหรับอ้างอิง ระบบยังไม่มีหน้าติดตามสถานะสำหรับประชาชน และยังไม่มีหน่วยงานยืนยันรับเคสผ่านเว็บ
          </p>
        </div>

      </div>
    </div>
  );
};
