import type { SOSRequest, RequestStatus } from '../types/sos';
import { INITIAL_MOCK_REQUESTS } from '../data/mockData';

const STORAGE_KEY = 'thai_flood_sos_requests_v1';

export function getStoredRequests(): SOSRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load SOS requests from localStorage', e);
    return [];
  }
}

export function saveSOSRequest(newRequest: SOSRequest): SOSRequest[] {
  try {
    const current = getStoredRequests();
    const updated = [newRequest, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save SOS request', e);
    return [newRequest];
  }
}

export function updateSOSStatus(
  requestId: string,
  newStatus: RequestStatus,
  responderNotes?: string,
  rescuedBy?: string
): SOSRequest[] {
  try {
    const current = getStoredRequests();
    const updated = current.map((req) => {
      if (req.id === requestId) {
        return {
          ...req,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          responderNotes: responderNotes !== undefined ? responderNotes : req.responderNotes,
          rescuedBy: rescuedBy !== undefined ? rescuedBy : req.rescuedBy
        };
      }
      return req;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to update SOS status', e);
    return [];
  }
}

export function resetToDefaultMockData(): SOSRequest[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_REQUESTS));
    return INITIAL_MOCK_REQUESTS;
  } catch (e) {
    console.error('Failed to reset mock data', e);
    return INITIAL_MOCK_REQUESTS;
  }
}
