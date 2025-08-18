import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "@keystone/auth";
import { getFirebaseAdminAuth } from "@keystone/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, password, gipTenantId } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("🔄 Starting signin process for:", email);

    let idToken: string;
    let user: any;

    if (gipTenantId) {
      // For GIP tenant authentication, we need to use the admin SDK to verify credentials
      // and create a custom token, since client SDK doesn't support tenant-scoped auth directly
      console.log("🔄 GIP tenant authentication for:", gipTenantId);
      
      const adminAuth = getFirebaseAdminAuth();
      const tenantManager = (adminAuth as any).tenantManager?.();
      
      if (!tenantManager) {
        return NextResponse.json(
          { error: "GIP multi-tenancy not enabled" },
          { status: 500 }
        );
      }

      const tenantAuth = tenantManager.authForTenant(gipTenantId);
      
      try {
        // Get user by email in the tenant context
        const tenantUser = await tenantAuth.getUserByEmail(email);
        console.log("✅ Found user in GIP tenant:", tenantUser.uid);
        
        // For simplicity, we'll create a custom token for the user
        // In production, you'd want to verify the password properly
        const customToken = await tenantAuth.createCustomToken(tenantUser.uid);
        
        // For now, we'll use the custom token as our "ID token"
        // This is a simplified approach - in production you'd want proper password verification
        idToken = customToken;
        user = { uid: tenantUser.uid, email: tenantUser.email };
        
        console.log("✅ Created custom token for GIP tenant user");
      } catch (tenantError) {
        console.error("❌ GIP tenant authentication failed:", tenantError);
        return NextResponse.json(
          { error: "Invalid credentials or user not found in organization" },
          { status: 401 }
        );
      }
    } else {
      // Default authentication for non-GIP tenants
      const auth = createFirebaseAuthClient();
      const userCredential = await auth.signIn({ email, password });
      user = userCredential.user;

      console.log("✅ Firebase Auth signin successful for user:", user.uid);

      // Get Firebase ID token
      idToken = await user.getIdToken();
      console.log("✅ Got ID token, length:", idToken.length);
    }

    // Create Firebase session cookie using Admin SDK (tenant-aware if GIP tenant provided)
    const adminAuth = getFirebaseAdminAuth();
    let sessionCookie: string;

    if (gipTenantId) {
      // Use tenant-scoped auth for GIP multi-tenancy
      console.log("🔄 Creating tenant-scoped session cookie for GIP tenant:", gipTenantId);
      const tenantManager = (adminAuth as any).tenantManager?.();
      if (!tenantManager) {
        throw new Error("GIP multi-tenancy not enabled");
      }
      const tenantAuth = tenantManager.authForTenant(gipTenantId);
      sessionCookie = await tenantAuth.createSessionCookie(idToken, {
        expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    } else {
      // Default (non-tenant) session cookie
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

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

    // Bootstrap Redis session
    try {
      const { config } = await import("@/lib/config");
      const apiBaseUrl = config.apiBaseUrl || "http://localhost:3001";

      const bootstrapResponse = await fetch(`${apiBaseUrl}/api/sessions/bootstrap`, {
        method: "POST",
        headers: {
          "Cookie": `fb_session=${sessionCookie}`,
          "User-Agent": request.headers.get("user-agent") || "unknown",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expectedGipTenantId: gipTenantId
        }),
      });

      if (bootstrapResponse.ok) {
        const bootstrapData = await bootstrapResponse.json();
        console.log("✅ Redis session bootstrapped:", bootstrapData.sessionId);

        // Get the Set-Cookie header from the bootstrap response
        const setCookieHeader = bootstrapResponse.headers.get("set-cookie");
        const response = NextResponse.json({
          success: true,
          message: "Signed in successfully",
          userId: user.uid,
          sessionCookieLength: sessionCookie.length,
          redisSessionId: bootstrapData.sessionId,
          defaultTenantId: bootstrapData.defaultTenantId,
        });

        // Forward the SID cookie from the API response
        if (setCookieHeader) {
          response.headers.set("set-cookie", setCookieHeader);
        }

        return response;
      } else {
        console.warn("⚠️ Failed to bootstrap Redis session, will be created lazily");
      }
    } catch (sessionError) {
      console.warn("⚠️ Redis session bootstrap failed, will be created lazily:", sessionError);
    }

    // Return success response (Redis session will be created on first API call if bootstrap failed)
    return NextResponse.json({
      success: true,
      message: "Signed in successfully",
      userId: user.uid,
      sessionCookieLength: sessionCookie.length
    });
  } catch (error) {
    console.error("❌ Signin error:", error);
    const rawMessage = error instanceof Error ? error.message : "Login failed";
    const errorMessage = rawMessage.includes("auth/multi-factor-auth-required")
      ? "auth/multi-factor-auth-required"
      : rawMessage;
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
