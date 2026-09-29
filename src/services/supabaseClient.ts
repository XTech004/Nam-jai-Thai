import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_OVERRIDE_URL_KEY = 'thai_flood_supabase_url_override';
const STORAGE_OVERRIDE_KEY_KEY = 'thai_flood_supabase_anon_key_override';

export function getSupabaseCredentials(): { url: string; anonKey: string; isFromStorage: boolean } {
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_OVERRIDE_URL_KEY) : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_OVERRIDE_KEY_KEY) : null;

  if (storedUrl && storedKey) {
    return { url: storedUrl.trim(), anonKey: storedKey.trim(), isFromStorage: true };
  }

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  return { url: envUrl, anonKey: envKey, isFromStorage: false };
}

let activeClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey || url === 'https://your-project-id.supabase.co' || anonKey === 'your-anon-public-key-here') {
    return null;
  }

  if (activeClient && lastUrl === url && lastKey === anonKey) {
    return activeClient;
  }

  try {
    activeClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUrl = url;
    lastKey = anonKey;
    return activeClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_OVERRIDE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_OVERRIDE_KEY_KEY, anonKey.trim());
    activeClient = null; // force re-init
  }
}

export function clearCustomSupabaseCredentials(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_OVERRIDE_URL_KEY);
    localStorage.removeItem(STORAGE_OVERRIDE_KEY_KEY);
    activeClient = null; // force re-init
  }
}

export function isSupabaseActive(): boolean {
  return getSupabaseClient() !== null;
}
