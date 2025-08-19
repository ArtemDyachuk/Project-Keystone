import { getSessionCookie } from './cookies';
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
 * Get current user session from backend
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const sessionId = await getSessionCookie();
    
    if (!sessionId) {
      return null;
    }

    // Call backend to validate session and get user data
    // The browser will automatically send the HttpOnly cookie
    const response = await fetch(`${config.apiBaseUrl}/api/auth/session`, {
      method: 'GET',
      credentials: 'include', // Include cookies in the request
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.user) {
      return null;
    }

    return result.user;
  } catch (error) {
    console.error('Failed to get current user:', error);
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
