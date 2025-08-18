import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth-cookies";

export async function GET(request: NextRequest) {
  return await handleSignout(request);
}

export async function POST(request: NextRequest) {
  return await handleSignout(request);
}

async function handleSignout(request: NextRequest) {
  try {
    // Get the current session token from cookies
    const cookies = request.cookies;
    
    // Try different possible Stytch session cookie names
    const sessionToken = cookies.get("stytch_session")?.value || 
                        cookies.get("stytch_session_token")?.value ||
                        cookies.get("stytch_b2b_session")?.value;
    
    // If we have a Stytch session token, revoke it
    if (sessionToken) {
      try {
        // Revoke the session on Stytch's side
        const stytchResponse = await fetch("https://api.stytch.com/v1/b2b/sessions/revoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.STYTCH_SECRET}`,
          },
          body: JSON.stringify({
            session_token: sessionToken,
          }),
        });

        if (!stytchResponse.ok) {
          console.warn("Failed to revoke Stytch session:", await stytchResponse.text());
        } else {
          console.log("✅ Stytch session revoked successfully");
        }
      } catch (error) {
        console.warn("Error revoking Stytch session:", error);
        // Continue with logout even if Stytch revocation fails
      }
    } else {
      console.log("No Stytch session token found in cookies");
    }

    // Create redirect response
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    
    // Clear all authentication cookies using the existing function
    const clearResponse = clearAuthCookies();
    
    // Copy the cleared cookies to our redirect response
    clearResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    // Clear all possible Stytch-related cookies
    const stytchCookieNames = [
      "stytch_session",
      "stytch_session_token", 
      "stytch_b2b_session",
      "stytch_session_jwt",
      "stytch_b2b_session_jwt",
      "stytch_user_token",
      "stytch_organization_token"
    ];

    stytchCookieNames.forEach(cookieName => {
      redirectResponse.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(0),
      });
    });

    return redirectResponse;
  } catch (error) {
    console.error("Error during signout:", error);
    // If something goes wrong, still try to redirect and clear cookies
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    
    // Clear cookies even on error
    const clearResponse = clearAuthCookies();
    clearResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return redirectResponse;
  }
}
