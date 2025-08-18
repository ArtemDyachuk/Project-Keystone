/**
 * CSRF token management for API requests
 */

let csrfToken: string | null = null;

/**
 * Get CSRF token from cache or fetch from server
 */
export async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) {
    return csrfToken;
  }

  try {
    // Call backend API directly so the server-side CSRF endpoint is hit
    const { config } = await import("@/lib/config");
    const response = await fetch(`${config.apiBaseUrl}/api/auth/csrf`, {
      credentials: 'include',
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    csrfToken = data.csrfToken;
    return csrfToken as string;
  } catch (error) {
    console.error('❌ Failed to get CSRF token:', error);
    throw new Error('Unable to get CSRF token for secure requests');
  }
}

/**
 * Clear cached CSRF token (force refresh on next request)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}

/**
 * Check if method requires CSRF protection
 */
export function requiresCsrfToken(method: string): boolean {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  return mutatingMethods.includes(method.toUpperCase());
}
