// import { getSessionCookie } from './cookies';
import { config } from '../config';

export interface CurrentUser {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  tenantId: string | null;
  roles: string[];
}

/**
 * Get current user session from backend (with session recovery)
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const url = `${config.apiBaseUrl}/api/user/me`;
    console.log('🔍 Fetching user data from:', url);

    // Call user controller endpoint - browser will automatically send HttpOnly cookie
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include', // Include cookies in the request
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    if (!response.ok) {
      console.log('❌ Response not ok, status:', response.status);
      return null;
    }

    const result = await response.json();
    console.log('📦 Response data:', result);

    if (!result.success || !result.user) {
      // Check if user needs to re-authenticate
      if (result.needsReauth) {
        console.log('🔄 Session expired, user needs to login again');
      }
      console.log('❌ No user data in response');
      return null;
    }

    console.log('✅ User data found:', result.user);
    return result.user;
  } catch (error) {
    console.error('❌ Failed to get current user:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
