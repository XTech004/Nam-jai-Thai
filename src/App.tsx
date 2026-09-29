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
import { AdminLoginModal } from './components/AdminLoginModal';
import { UserAuthModal } from './components/UserAuthModal';
import type { SOSRequest, RequestStatus, UserProfile } from './types/sos';
import { getCurrentUser, logoutUser, USER_AUTH_EVENT } from './services/userService';
import { initLiff, logoutLine } from './services/liffService';
import { 
  fetchSOSRequests, 
  createSOSRequest, 
  updateSOSRequestStatus, 
  deleteSOSRequest,
  deleteCompletedSOSRequests,
  clearAllSOSRequests,
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

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isUserAuthOpen, setIsUserAuthOpen] = useState(false);

  // Check if admin=1 is present in URL
  const [hasAdminUrl, setHasAdminUrl] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('admin') === '1' || window.location.search.includes('admin=1');
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('thai_flood_is_admin') === 'true';
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // If visiting with ?admin=1 and not yet logged in, automatically open PIN login modal
  useEffect(() => {
    if (hasAdminUrl && !isAdmin) {
      setIsAdminLoginOpen(true);
    }
  }, [hasAdminUrl, isAdmin]);

  // Listen to popstate URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const hasParam = new URLSearchParams(window.location.search).get('admin') === '1' || window.location.search.includes('admin=1');
      setHasAdminUrl(hasParam);
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Listen to user auth changes
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const custom = e as CustomEvent<UserProfile | null>;
      setCurrentUser(custom.detail);
    };
    window.addEventListener(USER_AUTH_EVENT, handleAuthChange);
    return () => window.removeEventListener(USER_AUTH_EVENT, handleAuthChange);
  }, []);

  // Initialize LINE LIFF SDK on mount
  useEffect(() => {
    initLiff().then(res => {
      if (res.isLoggedIn && res.profile) {
        const u = getCurrentUser();
        if (u) setCurrentUser(u);
      }
    }).catch(err => {
      console.warn('LINE LIFF init notice:', err);
    });
  }, []);

  // Handle User Logout
  const handleLogoutUser = () => {
    logoutLine();
    logoutUser();
    setCurrentUser(null);
  };

  // Admin access is strictly active only when ?admin=1 is in URL AND PIN is verified
  const isEffectiveAdmin = hasAdminUrl && isAdmin;

  // Handle Delete Single Case (Admin)
  const handleDeleteCase = async (id: string) => {
    const updated = await deleteSOSRequest(id);
    setRequests(updated);
    if (selectedCase && selectedCase.id === id) {
      setSelectedCase(null);
    }
  };

  // Handle Delete All Completed Cases (Admin)
  const handleDeleteAllCompleted = async () => {
    const updated = await deleteCompletedSOSRequests();
    setRequests(updated);
    if (selectedCase && selectedCase.status === 'COMPLETED') {
      setSelectedCase(null);
    }
  };

  // Handle Clear All Cases to make system blank (Admin)
  const handleClearAll = async () => {
    const updated = await clearAllSOSRequests();
    setRequests(updated);
    setSelectedCase(null);
  };

  // Handle Admin Logout
  const handleLogoutAdmin = () => {
    localStorage.removeItem('thai_flood_is_admin');
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('admin');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      setHasAdminUrl(false);
    }
  };

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans pb-24 sm:pb-10">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        requests={requests}
        isAdmin={isEffectiveAdmin}
        showAdminOption={hasAdminUrl}
        currentUser={currentUser}
        onOpenUserAuth={() => setIsUserAuthOpen(true)}
        onLogoutUser={handleLogoutUser}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {activeTab === 'form' && (
          <SosForm 
            onSubmitSuccess={handleSubmitSuccess}
            currentUser={currentUser}
            onOpenUserAuth={() => setIsUserAuthOpen(true)}
          />
        )}

        {activeTab === 'feed' && (
          <RescueFeed
            requests={requests}
            onSelectCase={(req) => setSelectedCase(req)}
            onUpdateStatus={handleUpdateStatus}
            isAdmin={isEffectiveAdmin}
            onDeleteCase={handleDeleteCase}
            onDeleteAllCompleted={handleDeleteAllCompleted}
            onClearAll={handleClearAll}
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

      {/* User Login & OTP Verification Modal */}
      <UserAuthModal
        isOpen={isUserAuthOpen}
        onClose={() => setIsUserAuthOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={() => setIsAdmin(true)}
      />

      {/* Database Configuration Modal (Admin only) */}
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
          isAdmin={isEffectiveAdmin}
          onDeleteCase={handleDeleteCase}
        />
      )}

      {/* Sleek Mobile Bottom Tab Bar (iOS style frosted glass) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 py-2 px-3 flex items-center justify-around z-40 sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('form')}
          className={`flex flex-col items-center py-0.5 px-3 rounded-2xl transition-all ${
            activeTab === 'form' 
              ? 'text-red-600 font-bold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'form' ? 'bg-red-50 text-red-600' : ''}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">แจ้ง SOS</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center py-0.5 px-3 rounded-2xl transition-all relative ${
            activeTab === 'feed' 
              ? 'text-red-600 font-bold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'feed' ? 'bg-red-50 text-red-600' : ''}`}>
            <ListFilter className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">รายการเหตุ</span>
          {requests.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-600"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center py-0.5 px-3 rounded-2xl transition-all ${
            activeTab === 'map' 
              ? 'text-blue-600 font-bold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'map' ? 'bg-blue-50 text-blue-600' : ''}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">แผนที่</span>
        </button>

        <button
          onClick={() => setActiveTab('hotlines')}
          className={`flex flex-col items-center py-0.5 px-3 rounded-2xl transition-all ${
            activeTab === 'hotlines' 
              ? 'text-emerald-600 font-bold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'hotlines' ? 'bg-emerald-50 text-emerald-600' : ''}`}>
            <PhoneCall className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">สายด่วน</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex flex-col items-center py-0.5 px-3 rounded-2xl transition-all ${
            activeTab === 'guide' 
              ? 'text-amber-600 font-bold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'guide' ? 'bg-amber-50 text-amber-600' : ''}`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">เอาตัวรอด</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
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
            {hasAdminUrl && (
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
