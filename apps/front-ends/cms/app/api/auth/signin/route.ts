import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "@keystone/auth";
import { setAuthCookies } from "@/lib/auth/cookies";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Sign in with Firebase Auth
    const auth = createFirebaseAuthClient();
    const userCredential = await auth.signIn({ email, password });
    const user = userCredential.user;

    // Get Firebase ID token
    const idToken = await user.getIdToken();
    const idTokenResult = await user.getIdTokenResult();

    // Convert to our AuthTokens format
    const tokens = {
      accessToken: idToken, // Firebase uses ID token as access token
      idToken: idToken,
      refreshToken: user.refreshToken,
      expiresIn: Math.floor((new Date(idTokenResult.expirationTime).getTime() - Date.now()) / 1000),
    };

    // Set auth cookies and return response
    return setAuthCookies(tokens);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
