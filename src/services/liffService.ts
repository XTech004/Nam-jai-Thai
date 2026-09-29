import liff from '@line/liff';
import { registerOrLoginLineUser, getCurrentUser } from './userService';

export const LIFF_ID = '2011792268-jqhwidkY';

let isInitialized = false;

export interface LiffInitResult {
  success: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile?: {
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  };
  error?: any;
}

/**
 * Initialize LINE Front-end Framework (LIFF)
 */
export async function initLiff(): Promise<LiffInitResult> {
  if (isInitialized) {
    const isLoggedIn = liff.isLoggedIn();
    let profile: any = undefined;
    if (isLoggedIn) {
      try {
        profile = await liff.getProfile();
      } catch (err) {
        console.warn('Failed to get LIFF profile:', err);
      }
    }
    return {
      success: true,
      isLoggedIn,
      isInClient: liff.isInClient(),
      profile
    };
  }

  try {
    await liff.init({ liffId: LIFF_ID });
    isInitialized = true;

    const isInClient = liff.isInClient();
    const isLoggedIn = liff.isLoggedIn();
    let profile: any = undefined;

    if (isLoggedIn) {
      try {
        profile = await liff.getProfile();
        // If current session does not have user, auto-sync from LINE profile
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.lineUserId !== profile.userId) {
          await registerOrLoginLineUser({
            userId: profile.userId,
            displayName: profile.displayName || 'LINE User',
            pictureUrl: profile.pictureUrl
          });
        }
      } catch (err) {
        console.warn('Failed to retrieve LINE user profile after login:', err);
      }
    }

    return {
      success: true,
      isLoggedIn,
      isInClient,
      profile
    };
  } catch (err: any) {
    console.warn('LIFF initialization notice:', err?.message || err);
    return {
      success: false,
      isLoggedIn: false,
      isInClient: false,
      error: err
    };
  }
}

/**
 * Trigger LINE Login Redirect
 */
export async function loginWithLine(redirectUri?: string): Promise<void> {
  try {
    if (!isInitialized) {
      await liff.init({ liffId: LIFF_ID });
      isInitialized = true;
    }

    if (!liff.isLoggedIn()) {
      liff.login(redirectUri ? { redirectUri } : undefined);
    } else {
      const profile = await liff.getProfile();
      await registerOrLoginLineUser({
        userId: profile.userId,
        displayName: profile.displayName || 'LINE User',
        pictureUrl: profile.pictureUrl
      });
    }
  } catch (err: any) {
    console.error('Error logging in with LINE:', err);
    throw err;
  }
}

/**
 * Logout from LINE LIFF
 */
export function logoutLine(): void {
  try {
    if (isInitialized && liff.isLoggedIn()) {
      liff.logout();
    }
  } catch (err) {
    console.warn('Error during LINE logout:', err);
  }
}

export function isLiffInClient(): boolean {
  if (!isInitialized) return false;
  return liff.isInClient();
}
