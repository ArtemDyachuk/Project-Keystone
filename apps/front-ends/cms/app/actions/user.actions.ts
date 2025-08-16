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

/**
 * Get a specific user by ID from the current tenant
 * This makes a server-side request to the backend which verifies tenant access
 */
export async function getUserById(userId: string): Promise<UserData> {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fb_session")?.value;

    if (!sessionCookie) {
      throw new Error("No session cookie found");
    }

    // Make request to backend API with session cookie
    let apiBaseUrl = config.apiBaseUrl;
    if (!apiBaseUrl || apiBaseUrl === "undefined") {
      apiBaseUrl = "http://localhost:3001";
    }

    const response = await fetch(`${apiBaseUrl}/api/user/${userId}`, {
      method: "GET",
      headers: {
        "Cookie": `fb_session=${sessionCookie}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch user from backend:", response.status);
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Failed to get user by ID:", error);
    throw error;
  }
}

/**
 * Get all users for the current tenant
 * This makes a server-side request to the backend which filters users by the selected tenant
 */
export async function getTenantUsers(): Promise<UserData[]> {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fb_session")?.value;

    if (!sessionCookie) {
      throw new Error("No session cookie found");
    }

    // Make request to backend API with session cookie
    let apiBaseUrl = config.apiBaseUrl;
    if (!apiBaseUrl || apiBaseUrl === "undefined") {
      apiBaseUrl = "http://localhost:3001";
    }

    const response = await fetch(`${apiBaseUrl}/api/user/tenant-users`, {
      method: "GET",
      headers: {
        "Cookie": `fb_session=${sessionCookie}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch tenant users from backend:", response.status);
      throw new Error(`Failed to fetch tenant users: ${response.status}`);
    }

    const tenantUsers = await response.json();
    return tenantUsers;
  } catch (error) {
    console.error("Failed to get tenant users:", error);
    throw error;
  }
}
