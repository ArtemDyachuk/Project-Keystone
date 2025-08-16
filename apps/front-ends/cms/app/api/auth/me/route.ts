import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@keystone/auth";

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie from the request
    const sessionCookie = request.cookies.get("fb_session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Verify and decode the Firebase session cookie
    const adminAuth = getFirebaseAdminAuth();
    const decodedUser = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Extract custom claims for tenant information
    const customClaims = decodedUser.customClaims as Record<string, any> || {};
    
    // Return the decoded user data
    return NextResponse.json({
      user: {
        uid: decodedUser.uid,
        email: decodedUser.email,
        emailVerified: decodedUser.emailVerified,
        displayName: decodedUser.displayName,
        photoURL: decodedUser.photoURL,
        disabled: decodedUser.disabled,
        metadata: {
          creationTime: decodedUser.metadata.creationTime,
          lastSignInTime: decodedUser.metadata.lastSignInTime,
          lastRefreshTime: decodedUser.metadata.lastRefreshTime,
        },
        customClaims,
        // Tenant-specific data from custom claims
        tenantIds: customClaims.tenantIds || [],
        selectedTenantId: customClaims.selectedTenantId,
        tenantRoles: customClaims.tenantRoles || {},
        firstName: customClaims.firstName,
        lastName: customClaims.lastName,
      }
    });
  } catch (error) {
    console.error("Failed to decode session:", error);
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
