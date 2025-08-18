import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@keystone/auth";
import { setAuthCookies } from "../../../../../lib/auth-cookies";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, url.origin));
    }
    if (!code) {
      return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
    }

    const pkceVerifierCookie = request.cookies.get("pkce_verifier");
    if (!pkceVerifierCookie) {
      return NextResponse.redirect(new URL("/login?error=missing_verifier", url.origin));
    }
    const codeVerifier = pkceVerifierCookie.value;

    const redirectUri = process.env.ZITADEL_REDIRECT_URI || `${url.origin}/api/auth/callback/zitadel`;
    const tokens = await exchangeCodeForTokens({ code, codeVerifier, redirectUri });

    // Convert to our token shape and set cookies
    const response = setAuthCookies({
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    // Clear verifier cookie
    response.cookies.set("pkce_verifier", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // Redirect to dashboard
    response.headers.set("Location", "/dashboard");
    response.status = 302;
    return response;
  } catch (e) {
    const url = new URL(request.url);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(e instanceof Error ? e.message : "callback_error")}`, url.origin));
  }
}


