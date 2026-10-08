import type { SOSRequest, RequestStatus } from '../types/sos';
import { getLineIdToken } from './liffService';

const LOCAL_STORAGE_KEY = 'thai_flood_sos_requests_v1';
const SOS_SYNC_EVENT = 'thai_flood_sos_sync_event';

export function getLocalStoredRequests(): SOSRequest[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(requests: SOSRequest[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent(SOS_SYNC_EVENT, { detail: requests }));
  } catch (error) {
    console.warn('Could not update local case cache:', error);
  }
}

async function apiRequest(path: string, init: RequestInit = {}, admin = false) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (admin) {
    const token = await getLineIdToken();
    if (!token) throw new Error('กรุณาเข้าสู่ระบบด้วย LINE เพื่อยืนยันสิทธิ์เจ้าหน้าที่');
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'ระบบบันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
  return payload;
}

export async function verifyAdminSession(): Promise<boolean> {
  try {
    const token = await getLineIdToken();
    if (!token) return false;
    const response = await fetch('/api/admin-session', { headers: { Authorization: `Bearer ${token}` } });
    return response.ok && (await response.json()).isAdmin === true;
  } catch {
    return false;
  }
}

export async function fetchSOSRequests(): Promise<SOSRequest[]> {
  const token = await getLineIdToken();
  if (!token) return getLocalStoredRequests();
  try {
    const payload = await apiRequest('/api/sos', {}, true);
    const requests = Array.isArray(payload.requests) ? payload.requests : [];
    saveToLocalStorage(requests);
    return requests;
  } catch (error) {
    console.warn('Could not load protected SOS cases:', error);
    return [];
  }
}

export async function createSOSRequest(newRequest: SOSRequest): Promise<SOSRequest[]> {
  const payload = await apiRequest('/api/sos', { method: 'POST', body: JSON.stringify(newRequest) });
  const savedRequest = payload.request as SOSRequest;
  if (!savedRequest?.id) throw new Error('ระบบไม่ได้ยืนยันการบันทึกเคส');
  const requests = [savedRequest, ...getLocalStoredRequests().filter((item) => item.id !== savedRequest.id)];
  saveToLocalStorage(requests);
  return requests;
}

async function mutateAdmin(action: string, body?: Record<string, unknown>): Promise<SOSRequest[]> {
  const payload = await apiRequest('/api/sos', {
    method: action === 'delete' || action === 'clear' || action === 'delete-completed' ? 'DELETE' : 'PATCH',
    body: JSON.stringify({ action, ...body }),
  }, true);
  const requests = Array.isArray(payload.requests) ? payload.requests : await fetchSOSRequests();
  saveToLocalStorage(requests);
  return requests;
}

export function updateSOSRequest(updatedRequest: SOSRequest): Promise<SOSRequest[]> {
  return mutateAdmin('update', { request: updatedRequest });
}

export function updateSOSRequestStatus(requestId: string, newStatus: RequestStatus, responderNotes?: string, rescuedBy?: string): Promise<SOSRequest[]> {
  return mutateAdmin('update-status', { requestId, status: newStatus, responderNotes, rescuedBy });
}

export function deleteSOSRequest(requestId: string): Promise<SOSRequest[]> {
  return mutateAdmin('delete', { requestId });
}

export async function resetSOSRequestsToMock(): Promise<SOSRequest[]> {
  throw new Error('ปิดการใส่ข้อมูลตัวอย่างในระบบชั่วคราว เพื่อป้องกันข้อมูลจำลองปะปนกับเคสจริง');
}

export function subscribeToSOSChanges(onUpdate: (requests: SOSRequest[]) => void): () => void {
  const handleLocalSync = (event: Event) => onUpdate((event as CustomEvent<SOSRequest[]>).detail || []);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_STORAGE_KEY) onUpdate(getLocalStoredRequests());
  };
  window.addEventListener(SOS_SYNC_EVENT, handleLocalSync);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(SOS_SYNC_EVENT, handleLocalSync);
    window.removeEventListener('storage', handleStorage);
  };
}

export async function testSupabaseConnection(_url?: string, _key?: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('/api/health');
    const payload = await response.json();
    return { success: response.ok, message: payload.message || 'ทดสอบการเชื่อมต่อระบบแล้ว' };
  } catch {
    return { success: false, message: 'ไม่สามารถเชื่อมต่อ API ของระบบได้' };
  }
}
