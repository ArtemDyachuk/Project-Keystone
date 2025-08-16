import { getAuthCookies } from "./cookies";

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
 * Extract user data from Firebase session cookie (server-side)
 * This decodes the Firebase session cookie to get actual user information
 */
export async function getUserDataFromSession(): Promise<UserData | null> {
  try {
    const { accessToken } = await getAuthCookies();

    if (!accessToken) {
      return null;
    }

    // Import Firebase Admin to decode the session cookie
    const { getFirebaseAdminAuth } = await import("@keystone/auth");
    const adminAuth = getFirebaseAdminAuth();
    
    // Verify and decode the session cookie
    const decodedUser = await adminAuth.verifySessionCookie(accessToken, true);
    
    // Extract custom claims for tenant information
    const customClaims = decodedUser.customClaims as Record<string, any> || {};
    const tenantIds = customClaims.tenantIds || [];
    const selectedTenantId = customClaims.selectedTenantId;
    const tenantRoles = customClaims.tenantRoles || {};
    
    return {
      sub: decodedUser.uid,
      email: decodedUser.email || undefined,
      username: decodedUser.email || undefined,
      email_verified: decodedUser.emailVerified || false,
      firstName: customClaims.firstName || undefined,
      lastName: customClaims.lastName || undefined,
      tenantIds,
      selectedTenantId,
      tenantRoles,
    };
  } catch (error) {
    console.error("Failed to extract user data from session:", error);
    return null;
  }
}

/**
 * Extract user data from session cookie (server-side)
 * Note: This now works with Firebase session cookies instead of JWT tokens
 * @deprecated Use getUserDataFromSession instead
 */
export async function getUserDataFromJWT(): Promise<UserData | null> {
  return getUserDataFromSession();
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
