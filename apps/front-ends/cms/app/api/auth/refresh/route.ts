import { NextRequest, NextResponse } from "next/server";
import { CognitoAuthClient, getCognitoConfig } from "@keystone/auth";
import { setAuthCookiesInAction } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  try {
    const { refreshToken, email } = await request.json();

    if (!refreshToken || !email) {
      return NextResponse.json(
        { error: "Refresh token and email are required" },
        { status: 400 }
      );
    }

    // Get Cognito configuration
    const config = await getCognitoConfig();
    
    // Create Cognito client
    const authClient = new CognitoAuthClient(config);

    // Refresh the tokens
    const newTokens = await authClient.refreshTokens(refreshToken, email);

    // Set new tokens in cookies
    await setAuthCookiesInAction(newTokens);

    // Return both tokens for middleware usage
    return NextResponse.json({
      success: true,
      accessToken: newTokens.accessToken,
      idToken: newTokens.idToken,
      expiresIn: newTokens.expiresIn,
    });

  } catch (error) {
    console.error("Error refreshing tokens:", error);
    
    // If refresh fails, return 401 to trigger login redirect
    return NextResponse.json(
      { 
        error: "Failed to refresh tokens. Please log in again.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 401 }
    );
  }
}
