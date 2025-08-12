"use client";

/**
 * Client-side authentication utilities
 */

export interface UserInfo {
  email: string;
  given_name: string;
  family_name: string;
  tenantId?: string;
  role?: string;
}

// signInUser function removed - now using server actions

/**
 * Sign out user by clearing cookies
 */
export async function signOutUser(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/signout", {
      method: "POST",
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Redirect to a specific path
 */
export function redirectTo(path: string): void {
  window.location.href = path;
}
