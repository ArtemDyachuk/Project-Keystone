import { NextRequest, NextResponse } from "next/server";
import { CognitoAuthClient, getCognitoConfig, refreshZitadelTokens, getZitadelConfig } from "@keystone/auth";
import { setAuthCookiesInAction } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  try {
    const { refreshToken, email } = await request.json();

    const provider = process.env.AUTH_PROVIDER || "cognito";
    if (!refreshToken || (provider !== "zitadel" && !email)) {
      return NextResponse.json(
        { error: provider === "zitadel" ? "Refresh token is required" : "Refresh token and email are required" },
        { status: 400 }
      );
    }

    
    let newTokens: { accessToken: string; idToken: string; refreshToken: string; expiresIn: number };
    if (provider === "zitadel") {
      await getZitadelConfig(); // validates config present
      const rt = await refreshZitadelTokens({ refreshToken });
      newTokens = {
        accessToken: rt.access_token,
        idToken: rt.id_token,
        refreshToken: rt.refresh_token,
        expiresIn: rt.expires_in,
      };
    } else {
      // Get Cognito configuration
      const config = await getCognitoConfig();
      // Create Cognito client
      const authClient = new CognitoAuthClient(config);
      // Refresh the tokens
      newTokens = await authClient.refreshTokens(refreshToken, email);
    }

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
