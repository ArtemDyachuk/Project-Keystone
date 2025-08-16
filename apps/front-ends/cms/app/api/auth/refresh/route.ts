import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "@keystone/auth";
import { setAuthCookies } from "@/lib/auth/cookies";

export async function POST(request: NextRequest) {
  try {
    // Try to get refresh token from request body first, then fall back to cookies
    let refreshToken: string | undefined;
    
    try {
      const body = await request.json();
      refreshToken = body.refreshToken;
    } catch {
      // No JSON body, that's fine
    }

    // If no refresh token in body, get it from HTTP-only cookies
    if (!refreshToken) {
      refreshToken = request.cookies.get("refreshToken")?.value;
    }

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

    // Set the new tokens as HTTP-only cookies
    const response = setAuthCookies(newTokens);
    response.headers.set("Content-Type", "application/json");

    // Return success response with cookies set
    const responseBody = JSON.stringify({ 
      success: true,
      message: "Tokens refreshed successfully and cookies updated",
      tokens: newTokens
    });

    // Create a new response with the body and cookies
    const finalResponse = new NextResponse(responseBody, {
      status: 200,
      headers: response.headers,
    });

    return finalResponse;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to refresh tokens" },
      { status: 400 }
    );
  }
}
