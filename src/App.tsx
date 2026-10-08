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
import { RescuerVerificationModal } from './components/RescuerVerificationModal';
import type { SOSRequest, RequestStatus, UserProfile } from './types/sos';
import { getCurrentUser, logoutUser, USER_AUTH_EVENT } from './services/userService';
import { initLiff, logoutLine } from './services/liffService';
import { 
  fetchSOSRequests, 
  createSOSRequest, 
  updateSOSRequestStatus, 
  updateSOSRequest,
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
  LifeBuoy,
  type LucideIcon
} from 'lucide-react';
import type { TabKey } from './components/Navbar';

const MOBILE_TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'form', label: 'แจ้ง SOS', icon: AlertTriangle },
  { key: 'feed', label: 'รายการเคส', icon: ListFilter },
  { key: 'map', label: 'แผนที่', icon: MapPin },
  { key: 'hotlines', label: 'สายด่วน', icon: PhoneCall },
  { key: 'guide', label: 'เอาตัวรอด', icon: BookOpen }
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('form');
  const [requests, setRequests] = useState<SOSRequest[]>([]);
  const [submittedRequest, setSubmittedRequest] = useState<SOSRequest | null>(null);
  const [selectedCase, setSelectedCase] = useState<SOSRequest | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isUserAuthOpen, setIsUserAuthOpen] = useState(false);
  const [isRescuerModalOpen, setIsRescuerModalOpen] = useState(false);

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
  // Rescuer permission: Admin OR account verified with RESCUER / ADMIN role
  const isRescuer = isEffectiveAdmin || currentUser?.role === 'RESCUER' || currentUser?.role === 'ADMIN';

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

  // Handle Citizen Case Update
  const handleUpdateCase = async (updatedReq: SOSRequest) => {
    const updated = await updateSOSRequest(updatedReq);
    setRequests(updated);
    if (selectedCase && selectedCase.id === updatedReq.id) {
      setSelectedCase(updatedReq);
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
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans pb-24 sm:pb-0">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        requests={requests}
        isAdmin={isRescuer}
        showAdminOption={hasAdminUrl}
        currentUser={currentUser}
        onOpenUserAuth={() => setIsUserAuthOpen(true)}
        onLogoutUser={handleLogoutUser}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenRescuerVerify={() => setIsRescuerModalOpen(true)}
      />

      {/* Main Content Area — re-keyed so switching tabs animates in */}
      <main key={activeTab} className="mx-auto w-full max-w-7xl flex-1 animate-rise">
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
            onUpdateCase={handleUpdateCase}
            currentUser={currentUser}
            onOpenLineLogin={() => setIsUserAuthOpen(true)}
            onGoToForm={() => setActiveTab('form')}
            isAdmin={isRescuer}
            onResetMock={handleResetMock}
            onDeleteCase={handleDeleteCase}
            onDeleteAllCompleted={handleDeleteAllCompleted}
            onClearAll={handleClearAll}
          />
        )}

        {activeTab === 'map' && (
          <RescueMap
            requests={requests}
            onSelectCase={(req) => setSelectedCase(req)}
            isAdmin={isRescuer}
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

      {/* Rescuer Organization Verification Modal */}
      <RescuerVerificationModal
        isOpen={isRescuerModalOpen}
        onClose={() => setIsRescuerModalOpen(false)}
        currentUser={currentUser}
        onVerified={(user) => {
          setCurrentUser(user);
        }}
        onOpenLineLogin={() => setIsUserAuthOpen(true)}
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

      {/* Rescuer & Citizen Detailed Case View Modal */}
      {selectedCase && (
        <CaseDetailModal
          request={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdateCase={handleUpdateCase}
          currentUser={currentUser}
          isAdmin={isRescuer}
          onDeleteCase={handleDeleteCase}
          onOpenLineLogin={() => setIsUserAuthOpen(true)}
          onRequestAdminLogin={() => {
            if (!currentUser) {
              setIsUserAuthOpen(true);
            } else {
              setIsRescuerModalOpen(true);
            }
          }}
        />
      )}

      {/* Mobile Tab Bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl backdrop-saturate-150 sm:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
          {MOBILE_TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors duration-150 ${
                  isActive ? 'text-red-600' : 'text-slate-400 active:text-slate-700'
                }`}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
                  {key === 'feed' && requests.length > 0 && (
                    <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-[9px] font-bold leading-4 text-white tabular-nums">
                      {requests.length}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] leading-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {label}
                </span>
                <span
                  className={`h-0.5 w-4 rounded-full transition-colors duration-150 ${
                    isActive ? 'bg-red-600' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <LifeBuoy className="size-4 text-red-600" />
            <span className="font-bold text-slate-900">น้ำใจไทย (Nam-jai Thai)</span>
            <span className="hidden sm:inline text-slate-500">— แพลตฟอร์มแจ้งเหตุและประสานงานกู้ภัยอุทกภัย 24 ชม.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a href="tel:1784" className="font-bold text-red-600 transition-colors hover:text-red-700">
              ปภ. 1784
            </a>
            <a href="tel:1669" className="font-bold text-emerald-600 transition-colors hover:text-emerald-700">
              การแพทย์ 1669
            </a>
            <a href="tel:199" className="font-bold text-sky-600 transition-colors hover:text-sky-700">
              กู้ภัย 199
            </a>
            {hasAdminUrl && (
              <button
                onClick={() => setIsDbModalOpen(true)}
                className="text-slate-400 underline-offset-4 transition-colors hover:text-slate-700 hover:underline"
              >
                ตั้งค่าระบบ (Admin)
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
