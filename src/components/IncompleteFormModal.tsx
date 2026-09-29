import React from 'react';
import { 
  AlertTriangle, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle,
  MapPin,
  Phone,
  User,
  Users,
  Building
} from 'lucide-react';

export interface MissingFieldItem {
  id: string;
  fieldKey: string;
  elementId: string;
  label: string;
  message: string;
  severity: 'critical' | 'warning';
}

interface IncompleteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingFields: MissingFieldItem[];
  onFixField: (elementId: string) => void;
}

export const IncompleteFormModal: React.FC<IncompleteFormModalProps> = ({
  isOpen,
  onClose,
  missingFields,
  onFixField,
}) => {
  if (!isOpen || missingFields.length === 0) return null;

  const handleFixFirst = () => {
    if (missingFields.length > 0) {
      onFixField(missingFields[0].elementId);
    }
  };

  const getFieldIcon = (key: string) => {
    switch (key) {
      case 'fullName':
        return <User className="size-4 text-rose-600" />;
      case 'primaryPhone':
        return <Phone className="size-4 text-rose-600" />;
      case 'province':
      case 'district':
        return <Building className="size-4 text-rose-600" />;
      case 'address':
      case 'landmark':
      case 'coords':
        return <MapPin className="size-4 text-rose-600" />;
      case 'people':
        return <Users className="size-4 text-rose-600" />;
      default:
        return <AlertTriangle className="size-4 text-rose-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-rose-200 relative my-auto transform transition-all animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-3 mb-4">
          <div className="size-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-xs animate-sos-pulse">
            <AlertTriangle className="size-7" />
          </div>
          <div className="pr-6">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold mb-1">
              <span>พบข้อมูลไม่ครบ {missingFields.length} รายการ</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
              กรุณากรอกข้อมูลสำคัญให้ครบถ้วน
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              เพื่อให้เจ้าหน้าที่กู้ภัยสามารถติดต่อและส่งเรือ/รถเข้าถึงจุดเกิดเหตุได้อย่างปลอดภัย
            </p>
          </div>
        </div>

        {/* Missing Fields List */}
        <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
          {missingFields.map((item, index) => (
            <div
              key={item.id || index}
              className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                item.severity === 'critical'
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="mt-0.5 shrink-0 rounded-xl bg-white p-1.5 shadow-2xs border border-rose-100">
                  {getFieldIcon(item.fieldKey)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">
                      {item.label}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        item.severity === 'critical'
                          ? 'bg-rose-200 text-rose-800'
                          : 'bg-amber-200 text-amber-800'
                      }`}
                    >
                      {item.severity === 'critical' ? 'จำเป็น' : 'แนะนำ'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {item.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onFixField(item.elementId)}
                className="shrink-0 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-[11px] rounded-xl flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>กรอกจุดนี้</span>
                <ArrowRight className="size-3 text-rose-600" />
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleFixFirst}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <span>✏️ ไปกรอกข้อมูลส่วนที่ขาดทันที</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
