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
  tenantRoles?: Record<string, string | string[]>; // Support both single and multiple roles
}

export interface UpdateUserDetailsData {
  firstName?: string;
  lastName?: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole?: boolean;
}

export interface UpdateUserRoleData {
  role: string;
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

/**
 * Update user details (firstName, lastName) for a specific user
 * This makes a server-side request to the backend which verifies tenant access
 */
export async function updateUserDetails(userId: string, updateData: UpdateUserDetailsData): Promise<UserData> {
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
      method: "PUT",
      headers: {
        "Cookie": `fb_session=${sessionCookie}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      console.error("Failed to update user details:", response.status);
      throw new Error(`Failed to update user details: ${response.status}`);
    }

    const result = await response.json();
    return result.user;
  } catch (error) {
    console.error("Failed to update user details:", error);
    throw error;
  }
}

/**
 * Get available roles for role assignment
 * This makes a server-side request to the backend which checks permissions
 */
export async function getAvailableRoles(): Promise<RoleDefinition[]> {
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

    const response = await fetch(`${apiBaseUrl}/api/roles`, {
      method: "GET",
      headers: {
        "Cookie": `fb_session=${sessionCookie}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch available roles:", response.status);
      throw new Error(`Failed to fetch available roles: ${response.status}`);
    }

    const roles = await response.json();
    return roles;
  } catch (error) {
    console.error("Failed to get available roles:", error);
    throw error;
  }
}

/**
 * Update user's role in the current tenant
 * This makes a server-side request to the backend which verifies permissions
 */
export async function updateUserRole(userId: string, updateData: UpdateUserRoleData): Promise<UserData> {
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

    const response = await fetch(`${apiBaseUrl}/api/roles/user/${userId}`, {
      method: "PUT",
      headers: {
        "Cookie": `fb_session=${sessionCookie}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      console.error("Failed to update user role:", response.status);
      throw new Error(`Failed to update user role: ${response.status}`);
    }

    const result = await response.json();
    return result.user;
  } catch (error) {
    console.error("Failed to update user role:", error);
    throw error;
  }
}
