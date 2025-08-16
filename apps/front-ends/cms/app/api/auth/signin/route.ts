import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "@keystone/auth";
import { getFirebaseAdminAuth } from "@keystone/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("🔄 Starting signin process for:", email);

    // Sign in with Firebase Auth
    const auth = createFirebaseAuthClient();
    const userCredential = await auth.signIn({ email, password });
    const user = userCredential.user;

    console.log("✅ Firebase Auth signin successful for user:", user.uid);

    // Get Firebase ID token
    const idToken = await user.getIdToken();
    console.log("✅ Got ID token, length:", idToken.length);

    // Create Firebase session cookie using Admin SDK
    const adminAuth = getFirebaseAdminAuth();
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log("✅ Session cookie created, length:", sessionCookie.length);

    // Set session cookie in browser
    const cookieStore = await cookies();
    cookieStore.set("fb_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    console.log("✅ Session cookie set in browser");

    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: "Signed in successfully",
      userId: user.uid,
      sessionCookieLength: sessionCookie.length
    });
  } catch (error) {
    console.error("❌ Signin error:", error);
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
