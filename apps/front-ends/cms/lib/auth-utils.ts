import { getAuthCookies } from "./auth-cookies";

// Temporary stub implementation while auth is being refactored
function decodeJwtToken(token: string): any {
  try {
    // Simple JWT decode without verification (for development only)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.warn('Failed to decode JWT token:', error);
    return null;
  }
}

export interface UserData {
  sub: string;
  email?: string;
  username?: string;
  email_verified?: boolean;
  firstName?: string;  // Cleaner than given_name
  lastName?: string;   // Cleaner than family_name
  tenantIds?: string[];  // Array of tenant IDs
  selectedTenantId?: string;  // Single selected tenant ID
}

/**
 * Extract user data from JWT token (server-side)
 */
export async function getUserDataFromJWT(): Promise<UserData | null> {
  try {
    const { idToken, accessToken } = await getAuthCookies();

    if (!idToken && !accessToken) {
      return null;
    }

    // Use ID token if available, otherwise fall back to access token
    const token = idToken || accessToken;
    const decoded = decodeJwtToken(token!);

    if (!decoded) {
      return null;
    }

    // Parse custom attributes properly
    const customTenantIds = decoded["custom:tenantIds"];
    const customSelectedTenantId = decoded["custom:selectedTenantId"];

    // Convert comma-separated string to array
    const tenantIds = customTenantIds
      ? customTenantIds.split(",").map((id: string) => id.trim()).filter(Boolean)
      : undefined;

    return {
      sub: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      email_verified: decoded.email_verified,
      firstName: decoded.given_name,      // Map given_name to firstName
      lastName: decoded.family_name,      // Map family_name to lastName
      tenantIds: tenantIds,
      selectedTenantId: customSelectedTenantId,
    };
  } catch (error) {
    console.error("Failed to extract user data from JWT:", error);
    return null;
  }
}

/**
 * Get user's display name from JWT data
 */
export function getUserDisplayName(userData: UserData): string {
  if (userData.firstName && userData.lastName) {
    return `${userData.firstName} ${userData.lastName}`;
  }

  if (userData.firstName) {
    return userData.firstName;
  }

  if (userData.email) {
    return userData.email.split("@")[0];
  }

  return "User";
}
