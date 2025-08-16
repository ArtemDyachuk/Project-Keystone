"use server";

import { config } from "@/lib/config";
import { cookies } from "next/headers";

export interface UserData {
  sub: string;
  email?: string;
  username?: string;
  email_verified?: boolean;
  firstName?: string;
  lastName?: string;
  tenantIds?: string[];
  selectedTenantId?: string;
  tenantRoles?: Record<string, string>;
}

/**
 * Get current user data from backend API
 * This makes a server-side request to the backend which extracts data from the session cookie
 */
export async function getCurrentUser(): Promise<UserData | null> {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fb_session")?.value;

    if (!sessionCookie) {
      return null;
    }

    // Make request to backend API with session cookie
    let apiBaseUrl = config.apiBaseUrl;
    if (!apiBaseUrl || apiBaseUrl === "undefined") {
      apiBaseUrl = "http://localhost:3001";
    }

    const response = await fetch(`${apiBaseUrl}/api/user/me`, {
      method: "GET",
      headers: {
        "Cookie": `fb_session=${sessionCookie}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch user data from backend:", response.status);
      return null;
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Refresh user session and get fresh claims
 */
export async function refreshUserSession(): Promise<{ success: boolean; requiresReauth: boolean; user?: UserData }> {
  try {
    const response = await fetch("/api/auth/refresh-session", {
      method: "POST",
    });

    if (!response.ok) {
      return { success: false, requiresReauth: true };
    }

    const result = await response.json();
    return {
      success: true,
      requiresReauth: result.requiresReauth || false,
      user: result.user
    };
  } catch (error) {
    console.error("Failed to refresh user session:", error);
    return { success: false, requiresReauth: true };
  }
}
