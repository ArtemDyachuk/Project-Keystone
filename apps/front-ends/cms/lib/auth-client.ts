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

/**
 * Sign in user and handle response
 */
export async function signInUser(email: string, password: string): Promise<{
  success: boolean;
  user?: UserInfo;
  error?: string;
}> {
  try {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        error: data.error || "Login failed",
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

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
