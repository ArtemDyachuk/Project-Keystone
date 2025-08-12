import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient, extractUserFromIdToken } from "@keystone/auth";
import { setAuthCookies } from "../../../../lib/auth-cookies";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    const tokens = await authClient.signIn({
      email,
      password,
    });

    // Extract user information from ID token
    const user = extractUserFromIdToken(tokens.idToken);

    // Store tokens in secure HTTP-only cookies
    const response = setAuthCookies(tokens);
    
    // Return success response with user info (but not tokens for security)
    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        email: user.email,
        given_name: user.given_name,
        family_name: user.family_name,
        tenantId: user["custom:tenantId"],
        role: user["custom:role"],
      },
    }, {
      status: 200,
      headers: response.headers,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Login failed" },
      { status: 400 }
    );
  }
}
