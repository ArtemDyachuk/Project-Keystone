"use client";

// Temporary stub function while auth is being refactored
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= exp;
  } catch {
    return true; // Consider invalid tokens as expired
  }
}

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
 * Get refresh token from cookies (client-side)
 */
function getRefreshToken(): string | null {
  if (typeof document === "undefined") {
    return null; // Server-side
  }
  
  const cookies = document.cookie.split(";");
  const refreshTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith("refreshToken=")
  );
  
  if (refreshTokenCookie) {
    return refreshTokenCookie.split("=")[1];
  }
  
  return null;
}

/**
 * Get user email from cookies (client-side)
 */
function getUserEmail(): string | null {
  if (typeof document === "undefined") {
    return null; // Server-side
  }
  
  const cookies = document.cookie.split(";");
  const idTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith("idToken=")
  );
  
  if (idTokenCookie) {
    try {
      const token = idTokenCookie.split("=")[1];
      // Decode JWT to get email (this is safe for client-side as it's just base64)
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.email || null;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = getRefreshToken();
    const userEmail = getUserEmail();
    
    if (!refreshToken || !userEmail) {
      return null;
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
        email: userEmail,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // The new tokens are automatically set in cookies by the API
      return data.accessToken;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    return null;
  }
}

/**
 * Get access token from cookies (client-side) with automatic refresh
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof document === "undefined") {
    return null; // Server-side
  }
  
  const cookies = document.cookie.split(";");
  const accessTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith("accessToken=")
  );
  
  if (!accessTokenCookie) {
    return null;
  }

  const accessToken = accessTokenCookie.split("=")[1];
  
  // Check if token is expired
  if (isTokenExpired(accessToken)) {
    console.log("🔄 Access token expired, attempting refresh...");
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      console.log("✅ Access token refreshed successfully");
      return newAccessToken;
    } else {
      console.log("❌ Failed to refresh access token, redirecting to login");
      // Redirect to login if refresh fails
      window.location.href = "/login";
      return null;
    }
  }
  
  return accessToken;
}

/**
 * Get access token synchronously (for cases where async is not possible)
 * This will not attempt refresh, just return what's in cookies
 */
export function getAccessTokenSync(): string | null {
  if (typeof document === "undefined") {
    return null; // Server-side
  }
  
  const cookies = document.cookie.split(";");
  const accessTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith("accessToken=")
  );
  
  if (accessTokenCookie) {
    return accessTokenCookie.split("=")[1];
  }
  
  return null;
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
