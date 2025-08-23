import { cookies } from "next/headers";
import { config } from "../config";

export interface CurrentUser {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  tenantId: string | null;
  selectedCorporationId: string | null;
  roles: string[];
}

/**
 * Server-only: fetch current user by forwarding the HttpOnly session cookie.
 */
export async function getCurrentUserServer(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return null;
    }

    const response = await fetch(`${config.apiBaseUrl}/api/user/me`, {
      method: "GET",
      headers: {
        // Forward the HttpOnly cookie manually since this runs on the server
        Cookie: `session=${sessionId}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.user) {
      return null;
    }
    return result.user as CurrentUser;
  } catch (error) {
    console.error("Failed to get current user (server):", error);
    return null;
  }
}
