import { NextRequest, NextResponse } from "next/server";
import { getUserDataFromJWT } from "@/lib/auth-utils";
import { getAuthCookies } from "@/lib/auth-cookies";
import { decodeJwtToken } from "@keystone/auth";

/**
 * Debug endpoint to inspect user token contents
 * Helps diagnose production issues with stale tenant data
 */
export async function GET(request: NextRequest) {
  try {
    // Get user data from JWT
    const userData = await getUserDataFromJWT();
    const { accessToken, idToken } = await getAuthCookies();

    let decodedAccessToken = null;
    let decodedIdToken = null;

    try {
      if (accessToken) {
        decodedAccessToken = decodeJwtToken(accessToken);
      }
    } catch (e) {
      console.warn("Failed to decode access token:", e);
    }

    try {
      if (idToken) {
        decodedIdToken = decodeJwtToken(idToken);
      }
    } catch (e) {
      console.warn("Failed to decode ID token:", e);
    }

    return NextResponse.json({
      userData: {
        sub: userData?.sub,
        email: userData?.email,
        username: userData?.username,
        tenantIds: userData?.tenantIds,
        selectedTenantId: userData?.selectedTenantId,
      },
      tokenInfo: {
        accessTokenExpiry: decodedAccessToken?.exp ? new Date(decodedAccessToken.exp * 1000).toISOString() : null,
        idTokenExpiry: decodedIdToken?.exp ? new Date(decodedIdToken.exp * 1000).toISOString() : null,
        accessTokenTenantIds: decodedAccessToken?.["custom:tenantIds"],
        idTokenTenantIds: decodedIdToken?.["custom:tenantIds"],
        accessTokenSelectedTenant: decodedAccessToken?.["custom:selectedTenantId"],
        idTokenSelectedTenant: decodedIdToken?.["custom:selectedTenantId"],
      },
    });

  } catch (error) {
    console.error("Error in debug endpoint:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to get user token info",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
