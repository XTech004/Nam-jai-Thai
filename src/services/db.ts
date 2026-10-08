import type { SOSRequest, RequestStatus } from '../types/sos';
import { INITIAL_MOCK_REQUESTS } from '../data/mockData';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';
import { sendSosLineAlert } from './lineNotificationService';

const LOCAL_STORAGE_KEY = 'thai_flood_sos_requests_v1';
const SOS_SYNC_EVENT = 'thai_flood_sos_sync_event';

// Convert DB snake_case row to TS camelCase SOSRequest
export function toSOSRequest(row: any): SOSRequest {
  let googleMapsUrl: string | undefined = row.google_maps_url || undefined;
  let notes: string | undefined = row.notes || undefined;
  let createdByLineUserId: string | undefined = row.created_by_line_user_id || undefined;
  let createdByUserId: string | undefined = row.created_by_user_id || undefined;

  // Seamlessly unpack Google Maps URL if encoded in notes
  if (notes && notes.includes('[MAPS_URL:')) {
    const match = notes.match(/\[MAPS_URL:(.*?)\]/);
    if (match) {
      if (!googleMapsUrl) {
        googleMapsUrl = match[1].trim();
      }
      notes = notes.replace(/\[MAPS_URL:.*?\]/, '').trim() || undefined;
    }
  }

  // Seamlessly unpack LINE User ID if encoded in notes
  if (notes && notes.includes('[LINE_UID:')) {
    const match = notes.match(/\[LINE_UID:(.*?)\]/);
    if (match) {
      if (!createdByLineUserId) {
        createdByLineUserId = match[1].trim();
      }
      notes = notes.replace(/\[LINE_UID:.*?\]/, '').trim() || undefined;
    }
  }

  // Seamlessly unpack Creator User ID if encoded in notes
  if (notes && notes.includes('[CREATOR_UID:')) {
    const match = notes.match(/\[CREATOR_UID:(.*?)\]/);
    if (match) {
      if (!createdByUserId) {
        createdByUserId = match[1].trim();
      }
      notes = notes.replace(/\[CREATOR_UID:.*?\]/, '').trim() || undefined;
    }
  }

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
    googleMapsUrl,
    waterLevel: row.water_level,
    people: typeof row.people === 'object' && row.people !== null
      ? row.people
      : { adults: 1, elderly: 0, bedridden: 0, children: 0, pets: 0 },
    needs: Array.isArray(row.needs) ? row.needs : [],
    notes,
    imageUrl: row.image_url || undefined,
    responderNotes: row.responder_notes || '',
    rescuedBy: row.rescued_by || '',
    createdByLineUserId,
    createdByUserId,
  };
}

// Convert TS camelCase SOSRequest to DB snake_case row
export function toDBRow(req: SOSRequest): any {
  let notes = req.notes || '';
  if (req.googleMapsUrl && !notes.includes('[MAPS_URL:')) {
    notes = notes ? `${notes}\n[MAPS_URL:${req.googleMapsUrl}]` : `[MAPS_URL:${req.googleMapsUrl}]`;
  }
  if (req.createdByLineUserId && !notes.includes('[LINE_UID:')) {
    notes = notes ? `${notes}\n[LINE_UID:${req.createdByLineUserId}]` : `[LINE_UID:${req.createdByLineUserId}]`;
  }
  if (req.createdByUserId && !notes.includes('[CREATOR_UID:')) {
    notes = notes ? `${notes}\n[CREATOR_UID:${req.createdByUserId}]` : `[CREATOR_UID:${req.createdByUserId}]`;
  }

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
    notes: notes || null,
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
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to read localStorage:', e);
    return [];
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

      if (data) {
        const remoteMapped = data.map(toSOSRequest);
        const remoteIds = new Set(remoteMapped.map(r => r.id));

        // Auto-recover any local requests that were created offline/before sync
        const localCurrent = getLocalStoredRequests();
        const unsyncedLocals = localCurrent.filter(l => !remoteIds.has(l.id) && l.id && l.id.startsWith('SOS-'));

        if (unsyncedLocals.length > 0) {
          // Sync unsynced requests up to Supabase in the background
          for (const unsynced of unsyncedLocals) {
            try {
              const row = toDBRow(unsynced);
              await supabase.from('sos_requests').insert(row);
              console.log('Auto-recovered unsynced case to cloud database:', unsynced.id);
            } catch (syncErr) {
              console.warn('Background sync failed for case:', unsynced.id, syncErr);
            }
          }
        }

        const merged = [...unsyncedLocals, ...remoteMapped];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return getLocalStoredRequests();
    } catch (err) {
      console.warn('Network error reaching Supabase, using local cache:', err);
      return getLocalStoredRequests();
    }
  }

  return getLocalStoredRequests();
}

export async function createSOSRequest(newRequest: SOSRequest): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();

  // Optimistically update local cache immediately
  const localCurrent = getLocalStoredRequests();
  const updatedLocal = [newRequest, ...localCurrent.filter(r => r.id !== newRequest.id)];
  saveToLocalStorage(updatedLocal);

  if (supabase) {
    try {
      const dbRow = toDBRow(newRequest);
      const { error } = await supabase.from('sos_requests').insert(dbRow);
      if (error) {
        console.error('Error inserting into Supabase:', error.message);
      } else {
        console.log('Successfully saved to Supabase cloud database:', newRequest.id);
      }
    } catch (err) {
      console.error('Exception inserting into Supabase:', err);
    }
  }

  // Dispatch LINE Alert asynchronously to avoid blocking emergency report submission
  sendSosLineAlert(newRequest).catch((err) => {
    console.warn('Failed to send LINE SOS Alert notification:', err);
  });

  return updatedLocal;
}

export async function updateSOSRequest(updatedRequest: SOSRequest): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();
  const updatedAt = new Date().toISOString();
  const fullUpdated: SOSRequest = {
    ...updatedRequest,
    updatedAt,
  };

  const current = getLocalStoredRequests();
  const updatedLocal = current.map((req) => req.id === fullUpdated.id ? fullUpdated : req);
  saveToLocalStorage(updatedLocal);

  if (supabase) {
    try {
      const dbRow = toDBRow(fullUpdated);
      const { error } = await supabase
        .from('sos_requests')
        .update(dbRow)
        .eq('id', fullUpdated.id);

      if (error) {
        console.error('Error updating SOSRequest in Supabase:', error.message);
      }
    } catch (err) {
      console.error('Exception updating SOSRequest in Supabase:', err);
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

export async function clearAllSOSRequests(): Promise<SOSRequest[]> {
  const supabase = getSupabaseClient();
  saveToLocalStorage([]);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('sos_requests')
        .delete()
        .neq('id', 'NONE');

      if (error) {
        console.error('Error clearing all requests from Supabase:', error.message);
      }
    } catch (err) {
      console.error('Exception clearing all requests from Supabase:', err);
    }
  }

  return [];
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
  // Permanently disabled: do not automatically seed mock data
  return;
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
