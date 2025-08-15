import { NextRequest, NextResponse } from "next/server";
import { getAuthCookies, setAuthCookiesInAction } from "@/lib/auth-cookies";
import { CognitoAuthClient, getCognitoConfig } from "@keystone/auth";
import { getUserDataFromJWT } from "@/lib/auth-utils";

/**
 * Force token refresh to pick up updated user attributes (like tenantIds)
 * This is useful after tenant creation/updates in production
 */
export async function POST(request: NextRequest) {
  try {
    // Get current tokens and user data
    const { refreshToken } = await getAuthCookies();
    const userData = await getUserDataFromJWT();

    if (!refreshToken || !userData?.email) {
      return NextResponse.json(
        { error: "No refresh token or user email found" },
        { status: 401 }
      );
    }

    // Get Cognito configuration
    const config = await getCognitoConfig();
    
    // Create Cognito client
    const authClient = new CognitoAuthClient(config);

    // Force refresh the tokens to get updated user attributes
    const newTokens = await authClient.refreshTokens(refreshToken, userData.email);

    // Set new tokens in cookies
    await setAuthCookiesInAction(newTokens);

    // Get updated user data from the new tokens
    const updatedUserData = await getUserDataFromJWT();

    return NextResponse.json({
      success: true,
      message: "Tokens refreshed successfully",
      tenantIds: updatedUserData?.tenantIds || [],
      selectedTenantId: updatedUserData?.selectedTenantId,
    });

  } catch (error) {
    console.error("Error force refreshing tokens:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to refresh tokens",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
