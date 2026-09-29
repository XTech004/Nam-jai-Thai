import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SosForm } from './components/SosForm';
import { RescueFeed } from './components/RescueFeed';
import { RescueMap } from './components/RescueMap';
import { EmergencyHotlines } from './components/EmergencyHotlines';
import { EmergencyGuide } from './components/EmergencyGuide';
import { SuccessModal } from './components/SuccessModal';
import { CaseDetailModal } from './components/CaseDetailModal';
import { DatabaseConfigModal } from './components/DatabaseConfigModal';
import type { SOSRequest, RequestStatus } from './types/sos';
import { 
  fetchSOSRequests, 
  createSOSRequest, 
  updateSOSRequestStatus, 
  resetSOSRequestsToMock,
  subscribeToSOSChanges
} from './services/db';
import { 
  AlertTriangle, 
  MapPin, 
  ListFilter, 
  PhoneCall, 
  BookOpen, 
  LifeBuoy
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'feed' | 'map' | 'hotlines' | 'guide'>('form');
  const [requests, setRequests] = useState<SOSRequest[]>([]);
  const [submittedRequest, setSubmittedRequest] = useState<SOSRequest | null>(null);
  const [selectedCase, setSelectedCase] = useState<SOSRequest | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Load and subscribe to requests (Supabase Realtime or LocalStorage)
  const refreshData = useCallback(async () => {
    const data = await fetchSOSRequests();
    setRequests(data);
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToSOSChanges((updated) => {
      setRequests(updated);
    });
    return () => {
      unsubscribe();
    };
  }, [refreshData]);

  // Handle new SOS submission
  const handleSubmitSuccess = async (newRequest: SOSRequest) => {
    const updated = await createSOSRequest(newRequest);
    setRequests(updated);
    setSubmittedRequest(newRequest);
  };

  // Handle Rescuer Status Update
  const handleUpdateStatus = async (
    id: string, 
    status: RequestStatus, 
    note?: string, 
    rescuer?: string
  ) => {
    const updated = await updateSOSRequestStatus(id, status, note, rescuer);
    setRequests(updated);
    if (selectedCase && selectedCase.id === id) {
      setSelectedCase(prev => prev ? {
        ...prev,
        status,
        updatedAt: new Date().toISOString(),
        responderNotes: note !== undefined ? note : prev.responderNotes,
        rescuedBy: rescuer !== undefined ? rescuer : prev.rescuedBy
      } : null);
    }
  };

  // Reset mock data for demo
  const handleResetMock = async () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นข้อมูลตัวอย่างตั้งต้นหรือไม่?')) {
      const resetData = await resetSOSRequestsToMock();
      setRequests(resetData);
      setSelectedCase(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20 sm:pb-8">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        requests={requests}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {activeTab === 'form' && (
          <SosForm onSubmitSuccess={handleSubmitSuccess} />
        )}

        {activeTab === 'feed' && (
          <RescueFeed
            requests={requests}
            onSelectCase={(req) => setSelectedCase(req)}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {activeTab === 'map' && (
          <RescueMap
            requests={requests}
            onSelectCase={(req) => setSelectedCase(req)}
          />
        )}

        {activeTab === 'hotlines' && (
          <EmergencyHotlines />
        )}

        {activeTab === 'guide' && (
          <EmergencyGuide />
        )}
      </main>

      {/* Database Configuration Modal */}
      <DatabaseConfigModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onConfigChanged={refreshData}
      />

      {/* Post-Submission Success Modal */}
      {submittedRequest && (
        <SuccessModal
          request={submittedRequest}
          onClose={() => setSubmittedRequest(null)}
          onViewInFeed={() => {
            setSubmittedRequest(null);
            setActiveTab('feed');
          }}
          onViewOnMap={() => {
            setSubmittedRequest(null);
            setActiveTab('map');
          }}
        />
      )}

      {/* Rescuer Detailed Case View Modal */}
      {selectedCase && (
        <CaseDetailModal
          request={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Mobile Sticky Bottom Tab Bar (Quick Access) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex items-center justify-around z-40 sm:hidden shadow-lg">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'form' ? 'text-red-600' : 'text-slate-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'form' ? 'bg-red-100' : ''}`}>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <span>แจ้ง SOS</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'feed' ? 'text-red-600' : 'text-slate-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'feed' ? 'bg-red-100' : ''}`}>
            <ListFilter className="w-5 h-5" />
          </div>
          <span>รายการเหตุ</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'map' ? 'text-red-600' : 'text-slate-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'map' ? 'bg-red-100' : ''}`}>
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <span>แผนที่</span>
        </button>

        <button
          onClick={() => setActiveTab('hotlines')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'hotlines' ? 'text-red-600' : 'text-slate-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'hotlines' ? 'bg-red-100' : ''}`}>
            <PhoneCall className="w-5 h-5 text-emerald-600" />
          </div>
          <span>สายด่วน</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
            activeTab === 'guide' ? 'text-red-600' : 'text-slate-500'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'guide' ? 'bg-red-100' : ''}`}>
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <span>เอาตัวรอด</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-red-600" />
            <span className="font-bold text-slate-800">ThaiFlood SOS</span>
            <span>— แพลตฟอร์มอาสาเพื่อช่วยเหลือผู้ประสบอุทกภัย</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>สายด่วน ปภ. 1784</span>
            <span>การแพทย์ฉุกเฉิน 1669</span>
            <span>กู้ภัย 199</span>
            {typeof window !== 'undefined' && window.location.search.includes('admin=1') && (
              <button
                onClick={() => setIsDbModalOpen(true)}
                className="text-slate-400 hover:text-slate-700 underline text-[11px]"
              >
                ⚙️ ตั้งค่าระบบ (Admin)
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
