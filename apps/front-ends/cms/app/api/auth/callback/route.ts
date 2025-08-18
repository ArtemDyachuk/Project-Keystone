import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const stytchRedirectType = searchParams.get("stytch_redirect_type");
    const stytchTokenType = searchParams.get("stytch_token_type");
    const state = searchParams.get("state"); // For returnTo

    console.log("Stytch callback received:", {
      token: token ? `${token.substring(0, 20)}...` : null,
      stytchRedirectType,
      stytchTokenType,
      state,
    });

    if (!token) {
      console.error("No token received from Stytch");
      return NextResponse.redirect(new URL("/login?error=no_token", request.url));
    }

    // The Stytch B2B SDK handles the token validation and session creation automatically
    // We just need to redirect to the intended destination
    // The SDK will:
    // 1. Validate the token with Stytch
    // 2. Create/update the session
    // 3. Set the appropriate cookies
    
    let redirectUrl: string;
    
                   // Handle different redirect types for Organization flow
               switch (stytchRedirectType) {
                 case "login":
                   // Existing user login - redirect to intended destination or dashboard
                   redirectUrl = state || "/dashboard";
                   break;
                 case "signup":
                   // New user signup - redirect to password setup page
                   redirectUrl = `/reset-password?token=${encodeURIComponent(token)}`;
                   break;
                 case "reset_password":
                   // Password reset - redirect to password reset form with token
                   redirectUrl = `/reset-password?token=${encodeURIComponent(token)}`;
                   break;
                 case "discovery":
                   // OAuth discovery flow completed
                   redirectUrl = state || "/dashboard";
                   break;
                 case "magic_link":
                   // Magic link authentication - redirect to dashboard
                   redirectUrl = state || "/dashboard";
                   break;
                 default:
                   // Fallback to dashboard
                   redirectUrl = state || "/dashboard";
               }

    // Create the full redirect URL
    const fullRedirectUrl = new URL(redirectUrl, request.url);
    
    console.log("Redirecting to:", fullRedirectUrl.toString());
    
    return NextResponse.redirect(fullRedirectUrl);
  } catch (error) {
    console.error("Stytch callback handling failed:", error);
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}

