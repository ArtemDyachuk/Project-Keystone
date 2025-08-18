import { getCsrfToken, clearCsrfToken, requiresCsrfToken } from './csrf';

/**
 * Custom error types for better error handling
 */
export class ServiceUnavailableError extends Error {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

export class CsrfError extends Error {
  constructor(message: string = 'CSRF token validation failed') {
    super(message);
    this.name = 'CsrfError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Enhanced fetch wrapper with CSRF protection and retry logic
 */
export async function apiFetch(
  url: string, 
  init: RequestInit = {}
): Promise<Response> {
  const method = init.method || 'GET';
  const headers = new Headers(init.headers);

  // Always include credentials
  const requestInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers,
  };

  // Add CSRF token for mutating requests
  if (requiresCsrfToken(method)) {
    try {
      const token = await getCsrfToken();
      headers.set('X-CSRF-Token', token);
    } catch (csrfError) {
      console.error('Failed to get CSRF token:', csrfError);
      throw new CsrfError('Unable to get CSRF token for secure request');
    }
  }

  // Make the request
  let response = await fetch(url, requestInit);

  // Handle CSRF token refresh and retry
  if (response.status === 403 && requiresCsrfToken(method)) {
    try {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if it's a CSRF-related error
      if (errorData.message?.toLowerCase().includes('csrf') || 
          errorData.error?.toLowerCase().includes('csrf')) {
        
        console.warn('🔄 CSRF token invalid, refreshing and retrying...');
        
        // Clear cached token and get a fresh one
        clearCsrfToken();
        const newToken = await getCsrfToken();
        headers.set('X-CSRF-Token', newToken);

        // Retry the request once with new token
        response = await fetch(url, requestInit);
        
        if (response.status === 403) {
          throw new ForbiddenError('Access denied after CSRF retry');
        }
      } else {
        throw new ForbiddenError(errorData.message || 'Access denied');
      }
    } catch (retryError) {
      if (retryError instanceof ForbiddenError) {
        throw retryError;
      }
      // If we can't parse the error or refresh CSRF, treat as forbidden
      throw new ForbiddenError('Access denied');
    }
  }

  // Handle service unavailable
  if (response.status === 503) {
    const errorData = await response.json().catch(() => ({}));
    throw new ServiceUnavailableError(
      errorData.message || 'Service temporarily unavailable'
    );
  }

  return response;
}

/**
 * Convenience wrapper for JSON API requests
 */
export async function apiJson<T = any>(
  url: string, 
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const response = await apiFetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if error is a service unavailable error
 */
export function isServiceUnavailable(error: unknown): error is ServiceUnavailableError {
  return error instanceof ServiceUnavailableError;
}

/**
 * Check if error is a CSRF error
 */
export function isCsrfError(error: unknown): error is CsrfError {
  return error instanceof CsrfError;
}

/**
 * Check if error is a forbidden error
 */
export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}
