import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const SESSION_COOKIE = "fb_session";
const SIDEBAR_COLLAPSED_COOKIE = "sidebarCollapsed";

/**
 * Store session cookie (for compatibility with existing code)
 * Note: This is now deprecated in favor of direct session cookie management
 */
export function setAuthCookies(tokens: any): NextResponse {
  console.warn("setAuthCookies is deprecated. Use session cookies directly.");
  const response = NextResponse.json({ success: true });
  return response;
}

/**
 * Get session cookie (server-side)
 */
export async function getAuthCookies(): Promise<{
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
}> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value || null;

  // For compatibility, return session cookie as all token types
  return {
    accessToken: sessionCookie,
    idToken: sessionCookie,
    refreshToken: sessionCookie,
  };
}

/**
 * Clear session cookie
 */
export function clearAuthCookies(): NextResponse {
  const response = NextResponse.json({ success: true });

  // Clear session cookie by setting it to expire immediately
  const expiredDate = new Date(0);

  response.cookies.set(SESSION_COOKIE, "", {
    ...COOKIE_CONFIG,
    expires: expiredDate,
  });

  return response;
}

/**
 * Check if user is authenticated based on session cookie
 */
export async function isAuthenticated(): Promise<boolean> {
  const { accessToken } = await getAuthCookies();
  return !!accessToken;
}

/**
 * Set session cookie directly in server actions
 */
export async function setAuthCookiesInAction(tokens: any) {
  console.warn("setAuthCookiesInAction is deprecated. Use session cookies directly.");
  // This function is kept for compatibility but no longer sets cookies
  // Session cookies are now managed by the /api/session endpoint
}

/**
 * Get sidebar collapsed state from cookies (server-side)
 */
export async function getSidebarState(): Promise<boolean> {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value;
  return sidebarCookie === "true";
}

/**
 * Set sidebar collapsed state in cookies (server action)
 */
export async function setSidebarState(isCollapsed: boolean) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)); // 1 year
  
  cookieStore.set(SIDEBAR_COLLAPSED_COOKIE, isCollapsed.toString(), {
    httpOnly: false, // Allow client-side access for immediate updates
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  });
}
