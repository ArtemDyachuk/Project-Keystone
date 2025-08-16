import { cookies } from "next/headers";

const SESSION_COOKIE = "fb_session";
const SIDEBAR_COLLAPSED_COOKIE = "sidebarCollapsed";

/**
 * Get session cookie (server-side)
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value || null;

  // For compatibility, return session cookie as all token types
  return sessionCookie;
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
