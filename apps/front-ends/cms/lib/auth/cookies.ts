import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AuthTokens } from "@keystone/auth";

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_COOKIE = "accessToken";
const ID_TOKEN_COOKIE = "idToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";
const SIDEBAR_COLLAPSED_COOKIE = "sidebarCollapsed";

/**
 * Store authentication tokens in secure HTTP-only cookies
 */
export function setAuthCookies(tokens: AuthTokens): NextResponse {
  const response = NextResponse.json({ success: true });

  // Calculate expiration times
  const accessTokenExpiry = new Date(Date.now() + (tokens.expiresIn * 1000));
  const refreshTokenExpiry = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days

  // Set access token cookie (expires when token expires)
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...COOKIE_CONFIG,
    expires: accessTokenExpiry,
  });

  // Set ID token cookie (expires when token expires)
  response.cookies.set(ID_TOKEN_COOKIE, tokens.idToken, {
    ...COOKIE_CONFIG,
    expires: accessTokenExpiry,
  });

  // Set refresh token cookie (long-lived)
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...COOKIE_CONFIG,
    expires: refreshTokenExpiry,
  });

  return response;
}

/**
 * Get authentication tokens from cookies (server-side)
 */
export async function getAuthCookies(): Promise<{
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
}> {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null,
    idToken: cookieStore.get(ID_TOKEN_COOKIE)?.value || null,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || null,
  };
}

/**
 * Clear all authentication cookies
 */
export function clearAuthCookies(): NextResponse {
  const response = NextResponse.json({ success: true });

  // Clear all auth cookies by setting them to expire immediately
  const expiredDate = new Date(0);

  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    ...COOKIE_CONFIG,
    expires: expiredDate,
  });

  response.cookies.set(ID_TOKEN_COOKIE, "", {
    ...COOKIE_CONFIG,
    expires: expiredDate,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    ...COOKIE_CONFIG,
    expires: expiredDate,
  });

  return response;
}

/**
 * Check if user is authenticated based on cookies
 */
export async function isAuthenticated(): Promise<boolean> {
  const { accessToken, refreshToken } = await getAuthCookies();
  return !!(accessToken && refreshToken);
}

/**
 * Set auth cookies directly in server actions
 */
export async function setAuthCookiesInAction(tokens: AuthTokens) {
  const cookieStore = await cookies();

  // Calculate expiration times
  const accessTokenExpiry = new Date(Date.now() + (tokens.expiresIn * 1000));
  const refreshTokenExpiry = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days

  // Set cookies directly
  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...COOKIE_CONFIG,
    expires: accessTokenExpiry,
  });

  cookieStore.set(ID_TOKEN_COOKIE, tokens.idToken, {
    ...COOKIE_CONFIG,
    expires: accessTokenExpiry,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...COOKIE_CONFIG,
    expires: refreshTokenExpiry,
  });
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
