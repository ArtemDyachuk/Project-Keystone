import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient, getZitadelConfig, generatePkcePair, buildAuthorizeUrl } from "@keystone/auth";
import { setAuthCookies } from "../../../../lib/auth-cookies";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const provider = process.env.AUTH_PROVIDER || "cognito";

    if (provider === "zitadel") {
      const { issuer, clientId } = await getZitadelConfig();

      // Build PKCE and persist verifier in httpOnly cookie
      const { codeVerifier, codeChallenge } = generatePkcePair();
      const origin = new URL(request.url).origin;
      const redirectUri = process.env.ZITADEL_REDIRECT_URI || `${origin}/api/auth/callback/zitadel`;
      const authorizeUrl = await buildAuthorizeUrl({
        issuer,
        clientId,
        redirectUri,
        codeChallenge,
        // Hosted UI recommended; allow prompt from env if needed
        prompt: process.env.ZITADEL_PROMPT,
      });

      const response = NextResponse.json({ authorizeUrl });
      // Short-lived cookie (10 minutes)
      response.cookies.set("pkce_verifier", codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });
      return response;
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    const tokens = await authClient.signIn({
      email,
      password,
    });

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
