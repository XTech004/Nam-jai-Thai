import type { SOSRequest, RequestStatus } from '../types/sos';
import { INITIAL_MOCK_REQUESTS } from '../data/mockData';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'thai_flood_sos_requests_v1';
const SOS_SYNC_EVENT = 'thai_flood_sos_sync_event';

// Convert DB snake_case row to TS camelCase SOSRequest
export function toSOSRequest(row: any): SOSRequest {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    urgency: row.urgency,
    status: row.status,
    fullName: row.full_name,
    primaryPhone: row.primary_phone,
    secondaryPhone: row.secondary_phone || undefined,
    lineId: row.line_id || undefined,
    province: row.province,
    district: row.district,
    subDistrict: row.sub_district || undefined,
    address: row.address,
    landmark: row.landmark,
    coordinates: {
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      accuracy: 10,
    },
    waterLevel: row.water_level,
    people: typeof row.people === 'object' && row.people !== null
      ? row.people
      : { adults: 1, elderly: 0, bedridden: 0, children: 0, pets: 0 },
    needs: Array.isArray(row.needs) ? row.needs : [],
    notes: row.notes || undefined,
    imageUrl: row.image_url || undefined,
    responderNotes: row.responder_notes || '',
    rescuedBy: row.rescued_by || '',
  };
}

// Convert TS camelCase SOSRequest to DB snake_case row
export function toDBRow(req: SOSRequest): any {
  return {
    id: req.id,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
    urgency: req.urgency,
    status: req.status,
    full_name: req.fullName,
    primary_phone: req.primaryPhone,
    secondary_phone: req.secondaryPhone || null,
    line_id: req.lineId || null,
    province: req.province,
    district: req.district,
    sub_district: req.subDistrict || null,
    address: req.address,
    landmark: req.landmark,
    latitude: req.coordinates.lat,
    longitude: req.coordinates.lng,
    water_level: req.waterLevel,
    people: req.people,
    needs: req.needs,
    notes: req.notes || null,
    image_url: req.imageUrl || null,
    responder_notes: req.responderNotes || null,
    rescued_by: req.rescuedBy || null,
  };
}

// ==========================================
// LocalStorage Fallback Helpers
// ==========================================

export function getLocalStoredRequests(): SOSRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_REQUESTS));
      return INITIAL_MOCK_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MOCK_REQUESTS;
  } catch (e) {
    console.error('Failed to read localStorage:', e);
    return INITIAL_MOCK_REQUESTS;
  }
}

function saveToLocalStorage(requests: SOSRequest[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requests));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SOS_SYNC_EVENT, { detail: requests }));
    }
  } catch (e) {
    console.error('Failed to write localStorage:', e);
  }
}

// ==========================================
// Main Unified Database API
// ==========================================

export async function fetchSOSRequests(): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sos_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch error, falling back to local storage:', error.message);
        return getLocalStoredRequests();
      }

      if (data && data.length > 0) {
        const mapped = data.map(toSOSRequest);
        // Cache locally for offline capability
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mapped));
        return mapped;
      } else {
        // Table is empty in Supabase, seed initial mock cases
        await seedSupabaseInitialData();
        return fetchSOSRequests();
      }
    } catch (err) {
      console.warn('Network error reaching Supabase, using local cache:', err);
      return getLocalStoredRequests();
    }
  }

  return getLocalStoredRequests();
}

export async function createSOSRequest(newRequest: SOSRequest): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();

  // Optimistically update local cache
  const localCurrent = getLocalStoredRequests();
  const updatedLocal = [newRequest, ...localCurrent.filter(r => r.id !== newRequest.id)];
  saveToLocalStorage(updatedLocal);

  if (supabase) {
    try {
      const dbRow = toDBRow(newRequest);
      const { error } = await supabase.from('sos_requests').insert(dbRow);
      if (error) {
        console.error('Error inserting into Supabase:', error.message);
      }
    } catch (err) {
      console.error('Exception inserting into Supabase:', err);
    }
  }

  return updatedLocal;
}

export async function updateSOSRequestStatus(
  requestId: string,
  newStatus: RequestStatus,
  responderNotes?: string,
  rescuedBy?: string
): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();
  const updatedAt = new Date().toISOString();

  // Update local storage
  const current = getLocalStoredRequests();
  const updatedLocal = current.map((req) => {
    if (req.id === requestId) {
      return {
        ...req,
        status: newStatus,
        updatedAt,
        responderNotes: responderNotes !== undefined ? responderNotes : req.responderNotes,
        rescuedBy: rescuedBy !== undefined ? rescuedBy : req.rescuedBy,
      };
    }
    return req;
  });
  saveToLocalStorage(updatedLocal);

  if (supabase) {
    try {
      const updates: Record<string, any> = {
        status: newStatus,
        updated_at: updatedAt,
      };
      if (responderNotes !== undefined) updates.responder_notes = responderNotes;
      if (rescuedBy !== undefined) updates.rescued_by = rescuedBy;

      const { error } = await supabase
        .from('sos_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) {
        console.error('Error updating status in Supabase:', error.message);
      }
    } catch (err) {
      console.error('Exception updating status in Supabase:', err);
    }
  }

  return updatedLocal;
}

export async function deleteSOSRequest(requestId: string): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();
  const current = getLocalStoredRequests();
  const updatedLocal = current.filter(req => req.id !== requestId);
  saveToLocalStorage(updatedLocal);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('sos_requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        console.error('Error deleting from Supabase:', error.message);
      }
    } catch (err) {
      console.error('Exception deleting from Supabase:', err);
    }
  }

  return updatedLocal;
}

export async function deleteCompletedSOSRequests(): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();
  const current = getLocalStoredRequests();
  const updatedLocal = current.filter(req => req.status !== 'COMPLETED');
  saveToLocalStorage(updatedLocal);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('sos_requests')
        .delete()
        .eq('status', 'COMPLETED');

      if (error) {
        console.error('Error deleting completed from Supabase:', error.message);
      }
    } catch (err) {
      console.error('Exception deleting completed from Supabase:', err);
    }
  }

  return updatedLocal;
}

export async function resetSOSRequestsToMock(): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();
  saveToLocalStorage(INITIAL_MOCK_REQUESTS);

  if (supabase) {
    try {
      // Re-seed Supabase
      await supabase.from('sos_requests').delete().neq('id', 'NONE');
      for (const item of INITIAL_MOCK_REQUESTS) {
        await supabase.from('sos_requests').insert(toDBRow(item));
      }
    } catch (err) {
      console.error('Failed to reset Supabase data:', err);
    }
  }

  return INITIAL_MOCK_REQUESTS;
}

async function seedSupabaseInitialData(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const rows = INITIAL_MOCK_REQUESTS.map(toDBRow);
    await supabase.from('sos_requests').upsert(rows);
  } catch (e) {
    console.error('Error seeding initial data to Supabase:', e);
  }
}

// ==========================================
// Real-time Subscription Listener
// ==========================================

export function subscribeToSOSChanges(onUpdate: (requests: SOSRequest[]) => void): () => void {
  const supabase = getSupabaseClient();

  // Listen to window custom sync events (works for local tabs and optimistic updates)
  const handleLocalSync = (e: Event) => {
    const custom = e as CustomEvent<SOSRequest[]>;
    if (custom.detail) {
      onUpdate(custom.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        onUpdate(parsed);
      } catch (err) {
        console.error(err);
      }
    }
  };

  window.addEventListener(SOS_SYNC_EVENT, handleLocalSync);
  window.addEventListener('storage', handleStorageEvent);

  let supabaseChannel: any = null;

  if (supabase) {
    try {
      supabaseChannel = supabase
        .channel('sos_live_channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sos_requests' },
          async () => {
            // Re-fetch fresh data from DB on any remote change
            const fresh = await fetchSOSRequests();
            onUpdate(fresh);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Could not establish Supabase Realtime channel:', err);
    }
  }

  // Cleanup function
  return () => {
    window.removeEventListener(SOS_SYNC_EVENT, handleLocalSync);
    window.removeEventListener('storage', handleStorageEvent);
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = createClient(url.trim(), key.trim());
    const { data, error } = await testClient.from('sos_requests').select('id').limit(1);

    if (error) {
      if (error.message.includes('relation "public.sos_requests" does not exist')) {
        return {
          success: false,
          message: 'เชื่อมต่อ Supabase ได้แล้ว แต่ยังไม่ได้สร้าง Table `sos_requests` กรุณากดรัน SQL ใน Supabase SQL Editor ก่อน',
        };
      }
      return { success: false, message: `ข้อผิดพลาด: ${error.message}` };
    }

    return {
      success: true,
      message: `เชื่อมต่อสำเร็จ! พบข้อมูล ${data?.length ?? 0} รายการในฐานข้อมูล`,
    };
  } catch (err: any) {
    return { success: false, message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err?.message || err}` };
  }
}
