import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return await handleSignout(request);
}

export async function POST(request: NextRequest) {
  return await handleSignout(request);
}

async function handleSignout(request: NextRequest) {
  try {
    // Create redirect response
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));

    // Clear both session cookies in the redirect response
    const expiredDate = new Date(0);

    // Clear Firebase session cookie
    redirectResponse.cookies.set("fb_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiredDate,
    });

    // Clear Redis session cookie
    redirectResponse.cookies.set("sid", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      expires: expiredDate,
    });

    // Also clear CSRF token cookie on the frontend
    redirectResponse.cookies.set("csrf_token", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      expires: expiredDate,
    });

    // Also call the backend logout endpoint to clear Redis session and CSRF server-side
    try {
      const { config } = await import("@/lib/config");
      const apiBaseUrl = config.apiBaseUrl || "http://localhost:3001";

      await fetch(`${apiBaseUrl}/api/tenants/logout`, {
        method: "POST",
        headers: {
          "Cookie": request.headers.get("cookie") || "",
        },
      }).catch(err => {
        console.warn("Failed to clear backend session:", err);
        // Don't fail logout if backend is unavailable
      });
    } catch (err) {
      console.warn("Failed to call backend logout:", err);
    }

    return redirectResponse;
  } catch (error) {
    // If something goes wrong, still try to redirect
    return NextResponse.redirect(new URL("/", request.url));
  }
}
