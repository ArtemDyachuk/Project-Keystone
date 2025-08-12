import { NextRequest, NextResponse } from "next/server";
import { getAuthCookies } from "../../../../lib/auth-cookies";
import { isTokenExpired, extractUserFromIdToken } from "@keystone/auth";

export async function GET(request: NextRequest) {
  try {
    const { accessToken, idToken, refreshToken } = await getAuthCookies();
    
    // Check if user has tokens
    if (!accessToken || !idToken || !refreshToken) {
      return NextResponse.json({
        success: false,
        message: "No authentication tokens found",
      });
    }
    
    // Check if access token is expired
    if (isTokenExpired(accessToken)) {
      return NextResponse.json({
        success: false,
        message: "Access token expired",
        needsRefresh: true,
      });
    }
    
    // Extract user info from ID token
    const user = extractUserFromIdToken(idToken);
    
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        given_name: user.given_name,
        family_name: user.family_name,
        tenantId: user["custom:tenantId"],
        role: user["custom:role"],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Authentication check failed",
      },
      { status: 500 }
    );
  }
}
