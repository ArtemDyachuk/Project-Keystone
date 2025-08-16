import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "../../../../../../../packages/auth/dist/firebase";

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const authClient = createFirebaseAuthClient();

    // Refresh tokens using Firebase
    const newTokens = await authClient.refreshTokens();

    if (!newTokens) {
      return NextResponse.json(
        { success: false, error: "No authenticated user found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Tokens refreshed successfully",
      tokens: newTokens
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to refresh tokens" },
      { status: 400 }
    );
  }
}
