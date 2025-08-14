import { getAuthCookies } from "./auth-cookies";
import { decodeJwtToken } from "@keystone/auth";

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
      ? customTenantIds.split(",").map(id => id.trim()).filter(Boolean)
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
