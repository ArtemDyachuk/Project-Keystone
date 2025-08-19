import { config } from '../config';
import { setCSRFCookie, getCSRFCookie } from './cookies';

/**
 * Get CSRF token from backend and store in cookie
 */
export async function getCSRFToken(): Promise<string | null> {
  try {
    // Check if we already have a valid CSRF token
    const existingToken = await getCSRFCookie();
    if (existingToken) {
      return existingToken;
    }

    // Get new CSRF token from backend
    const response = await fetch(`${config.apiBaseUrl}/api/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include', // Include session cookie
    });

    if (!response.ok) {
      console.error('Failed to get CSRF token:', response.status);
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.csrfToken) {
      return null;
    }

    // Store CSRF token in cookie
    await setCSRFCookie(result.csrfToken);
    
    return result.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
}

/**
 * Add CSRF token to request headers
 */
export async function addCSRFHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const csrfToken = await getCSRFToken();
  
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  return headers;
}
