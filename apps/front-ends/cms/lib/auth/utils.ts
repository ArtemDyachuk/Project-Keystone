import { getAuthCookies } from "./cookies";
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
  tenantRoles?: Record<string, string>; // Firebase custom claims
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

    // Parse custom attributes properly - Firebase custom claims are directly accessible
    const decodedWithClaims = decoded as any; // Cast to include custom claims
    const tenantIds = decodedWithClaims.tenantIds || [];
    const selectedTenantId = decodedWithClaims.selectedTenantId;
    const tenantRoles = decodedWithClaims.tenantRoles || {};

    return {
      sub: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      email_verified: decoded.email_verified,
      firstName: decoded.given_name,      // Map given_name to firstName
      lastName: decoded.family_name,      // Map family_name to lastName
      tenantIds: tenantIds,
      selectedTenantId: selectedTenantId,
      tenantRoles: tenantRoles,
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

/**
 * Check if user has access to a specific tenant
 */
export function hasTenantAccess(userData: UserData, tenantId: string): boolean {
  return userData.tenantIds?.includes(tenantId) || false;
}

/**
 * Get user's role in a specific tenant
 */
export function getUserTenantRole(userData: UserData, tenantId: string): string | null {
  return userData.tenantRoles?.[tenantId] || null;
}

/**
 * Check if user is admin of a specific tenant
 */
export function isTenantAdmin(userData: UserData, tenantId: string): boolean {
  const role = getUserTenantRole(userData, tenantId);
  return role === "admin";
}

/**
 * Get user's selected tenant
 */
export function getSelectedTenant(userData: UserData): string | null {
  return userData.selectedTenantId || userData.tenantIds?.[0] || null;
}
