import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SosForm } from './components/SosForm';
import { RescueFeed } from './components/RescueFeed';
import { RescueMap } from './components/RescueMap';
import { EmergencyHotlines } from './components/EmergencyHotlines';
import { EmergencyGuide } from './components/EmergencyGuide';
import { SuccessModal } from './components/SuccessModal';
import { CaseDetailModal } from './components/CaseDetailModal';
import { CitizenLoginPage } from './components/CitizenLoginPage';
import type { SOSRequest, RequestStatus, UserProfile } from './types/sos';
import { getCurrentUser, logoutUser, USER_AUTH_EVENT } from './services/userService';
import { initLiff, logoutLine } from './services/liffService';
import { 
  fetchSOSRequests, 
  createSOSRequest, 
  updateSOSRequestStatus, 
  updateSOSRequest,
  deleteSOSRequest,
  subscribeToSOSChanges,
  verifyAdminSession,
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

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [isServerAdmin, setIsServerAdmin] = useState(false);

  // Listen to user auth changes
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const custom = e as CustomEvent<UserProfile | null>;
      setCurrentUser(custom.detail);
      verifyAdminSession().then(setIsServerAdmin);
    };
    window.addEventListener(USER_AUTH_EVENT, handleAuthChange);
    return () => window.removeEventListener(USER_AUTH_EVENT, handleAuthChange);
  }, []);

  // Initialize LINE LIFF SDK on mount
  useEffect(() => {
    initLiff().then(res => {
      verifyAdminSession().then(setIsServerAdmin);
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
    setIsServerAdmin(false);
  };

  // Client roles, query strings and PINs are not trusted; only the server's LINE ID-token check grants access.
  const isRescuer = isServerAdmin;

  // Handle Delete Single Case (Admin)
  const handleDeleteCase = async (id: string) => {
    const updated = await deleteSOSRequest(id);
    setRequests(updated);
    if (selectedCase && selectedCase.id === id) {
      setSelectedCase(null);
    }
  };

  // Handle Admin Logout
  const handleLogoutAdmin = () => {
    handleLogoutUser();
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

  useEffect(() => {
    if (!isServerAdmin) return;
    refreshData();
    const timer = window.setInterval(refreshData, 15_000);
    return () => window.clearInterval(timer);
  }, [isServerAdmin, refreshData]);

  // Handle new SOS submission
  const handleSubmitSuccess = async (newRequest: SOSRequest) => {
    const updated = await createSOSRequest(newRequest);
    setRequests(updated);
    const saved = updated[0] || newRequest;
    setSubmittedRequest(saved);
    return saved;
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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans pb-24 sm:pb-0">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        requests={requests}
        isAdmin={isRescuer}
        showAdminOption={isServerAdmin}
        currentUser={currentUser}
        onOpenUserAuth={() => setActiveTab('login')}
        onLogoutUser={handleLogoutUser}
        onOpenAdminLogin={() => setActiveTab('login')}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Content Area — re-keyed so switching tabs animates in */}
      <main key={activeTab} className="mx-auto w-full max-w-7xl flex-1 animate-rise">
        {activeTab === 'form' && (
          <SosForm 
            onSubmitSuccess={handleSubmitSuccess}
            currentUser={currentUser}
            onOpenUserAuth={() => setActiveTab('login')}
          />
        )}

        {activeTab === 'feed' && (
          isServerAdmin ? <RescueFeed
            requests={requests}
            onSelectCase={(req) => setSelectedCase(req)}
            onUpdateStatus={handleUpdateStatus}
            onUpdateCase={handleUpdateCase}
            currentUser={currentUser}
            onOpenLineLogin={() => setActiveTab('login')}
            onGoToForm={() => setActiveTab('form')}
            isAdmin={isRescuer}
            onDeleteCase={handleDeleteCase}
          /> : <RestrictedStaffView onLogin={() => setActiveTab('login')} />
        )}

        {activeTab === 'map' && (
          isServerAdmin ? <RescueMap
            requests={requests}
            onSelectCase={(req) => setSelectedCase(req)}
            isAdmin={isRescuer}
          /> : <RestrictedStaffView onLogin={() => setActiveTab('login')} />
        )}

        {activeTab === 'login' && (
          <CitizenLoginPage
            currentUser={currentUser}
            onLoginSuccess={user => {
              setCurrentUser(user);
              setActiveTab('feed');
            }}
            onContinueAsGuest={() => setActiveTab('form')}
          />
        )}

        {activeTab === 'hotlines' && (
          <EmergencyHotlines />
        )}

        {activeTab === 'guide' && (
          <EmergencyGuide />
        )}
      </main>

      {/* Browser-side database credential configuration has been removed. */}

      {/* Post-Submission Success Modal */}
      {submittedRequest && (
        <SuccessModal
          request={submittedRequest}
          onClose={() => setSubmittedRequest(null)}
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
          onOpenLineLogin={() => setActiveTab('login')}
          onRequestAdminLogin={() => setActiveTab('login')}
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
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

function RestrictedStaffView({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">🔒</div>
      <h1 className="mt-4 text-xl font-black text-slate-900">พื้นที่สำหรับเจ้าหน้าที่ที่ได้รับอนุญาต</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">รายการเคสและพิกัดผู้แจ้งเป็นข้อมูลส่วนบุคคล ดูได้เฉพาะบัญชี LINE ที่ผู้ดูแลระบบอนุมัติไว้</p>
      <button onClick={onLogin} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">เข้าสู่ระบบด้วย LINE</button>
      <p className="mt-4 text-xs text-slate-500">ระบบจัดส่งและมอบหมายงานกู้ภัยยังไม่เปิดใช้งาน</p>
    </section>
  );
}
