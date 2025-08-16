import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFirebaseAdminAuth } from "@keystone/auth";

export async function POST(req: NextRequest) {
  try {
    // Get the current session cookie
    const cookieStore = await cookies();
    const currentSessionCookie = cookieStore.get("fb_session")?.value;

    if (!currentSessionCookie) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Verify the current session cookie to get user info
    const adminAuth = getFirebaseAdminAuth();
    const decodedUser = await adminAuth.verifySessionCookie(currentSessionCookie, true);
    
    // Get fresh user data with updated custom claims
    const freshUser = await adminAuth.getUser(decodedUser.uid);
    
    // Note: Firebase session cookies don't automatically update when custom claims change
    // The user needs to re-authenticate to get a new session cookie with fresh claims
    // We return the fresh data so the frontend can show what the user should see

    return NextResponse.json({
      ok: true,
      requiresReauth: true,
      message: "Fresh user data retrieved. You need to sign out and sign in again to see updated permissions.",
      user: {
        uid: freshUser.uid,
        email: freshUser.email,
        customClaims: freshUser.customClaims
      }
    });

  } catch (error) {
    console.error("❌ Failed to refresh session:", error);
    return NextResponse.json({
      error: "Failed to refresh session"
    }, { status: 500 });
  }
}
