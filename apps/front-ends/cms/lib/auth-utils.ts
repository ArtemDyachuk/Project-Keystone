// Stytch B2B authentication utilities
// Note: Use official Stytch hooks instead of these functions:
// - useStytchMember() for user data
// - useStytchMemberSession() for session
// - useStytchOrganization() for org data

export interface UserData {
  sub: string;
  email?: string;
  username?: string;
  email_verified?: boolean;
  firstName?: string;
  lastName?: string;
  tenantIds?: string[];
  selectedTenantId?: string;
}

/**
 * Extract user data from Stytch B2B session
 * This is a compatibility function for existing code
 * In new components, use useStytchMember() hook instead
 */
export async function getUserDataFromJWT(): Promise<UserData | null> {
  try {
    // This function is called server-side, so we can't use React hooks
    // For now, return null to indicate no user (unauthenticated)
    // In a full implementation, you'd extract this from the request cookies/headers
    
    // TODO: Implement server-side Stytch session extraction
    // This would involve reading the Stytch session cookie and validating it
    return null;
  } catch (error) {
    console.error("Failed to extract user data from Stytch B2B session:", error);
    return null;
  }
}

/**
 * Get user's display name from user data
 * Useful utility function for displaying user names
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
