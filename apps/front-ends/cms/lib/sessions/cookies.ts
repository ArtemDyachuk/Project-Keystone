import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'session';
const CSRF_COOKIE_NAME = 'csrfToken';

export interface CookieConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

/**
 * Get default cookie configuration
 */
function getDefaultCookieConfig(): CookieConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction, // Only secure in production (HTTPS)
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    path: '/',
    // In development, set domain to localhost to allow cross-port access
    ...(isProduction ? {} : { domain: 'localhost' }),
  };
}

/**
 * Set session cookie (server-side only)
 */
export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  const config = getDefaultCookieConfig();

  cookieStore.set(SESSION_COOKIE_NAME, sessionId, config);
}

/**
 * Get session cookie (server-side only)
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  return cookie?.value || null;
}

/**
 * Delete session cookie (logout)
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Set CSRF token cookie
 */
export async function setCSRFCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const config = {
    ...getDefaultCookieConfig(),
    httpOnly: false, // CSRF token needs to be readable by JS
  };

  cookieStore.set(CSRF_COOKIE_NAME, token, config);
}

/**
 * Get CSRF token cookie
 */
export async function getCSRFCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);

  return cookie?.value || null;
}

/**
 * Delete CSRF token cookie
 */
export async function deleteCSRFCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(CSRF_COOKIE_NAME);
}

/**
 * Check if user is authenticated (has valid session cookie)
 */
export async function isAuthenticated(): Promise<boolean> {
  const sessionId = await getSessionCookie();
  return !!sessionId;
}
