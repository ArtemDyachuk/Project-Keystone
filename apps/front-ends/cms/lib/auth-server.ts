import { getAuthCookies } from "./auth-cookies";
import { extractUserFromIdToken, isTokenExpired } from "@keystone/auth";

export interface ServerUserInfo {
  email: string;
  given_name: string;
  family_name: string;
  tenantId?: string;
  role?: string;
}

/**
 * Get user data on server side from cookies
 */
export async function getServerUserData(): Promise<ServerUserInfo | null> {
  try {
    const { accessToken, idToken } = await getAuthCookies();
    
    // Check if we have required tokens
    if (!accessToken || !idToken) {
      return null;
    }
    
    // Check if access token is expired
    if (isTokenExpired(accessToken)) {
      return null;
    }
    
    // Extract user info from ID token
    const user = extractUserFromIdToken(idToken);
    
    return {
      email: user.email!,
      given_name: user.given_name!,
      family_name: user.family_name!,
      tenantId: user["custom:tenantId"],
      role: user["custom:role"],
    };
  } catch (error) {
    console.error("Failed to get server user data:", error);
    return null;
  }
}
