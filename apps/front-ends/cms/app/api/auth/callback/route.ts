import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get the token from the callback URL
    const token = searchParams.get("token");
    const tokenType = searchParams.get("token_type");
    
    if (!token) {
      // No token provided, redirect to login
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // For Stytch, we typically get a token that we need to exchange
    // The exact implementation depends on your Stytch setup
    // This is a basic example - you may need to adjust based on your specific Stytch configuration
    
    // Set the token in cookies or handle it according to your auth strategy
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    
    // Set the token in an HTTP-only cookie for security
    response.cookies.set("stytch_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return response;
  } catch (error) {
    console.error("Auth callback error:", error);
    // On error, redirect to login
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle POST requests if needed (e.g., for OAuth callbacks)
    const { token, token_type } = body;
    
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    
    // Set the token in cookies and redirect
    const response = NextResponse.json({ success: true });
    
    response.cookies.set("stytch_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return response;
  } catch (error) {
    console.error("Auth callback POST error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
