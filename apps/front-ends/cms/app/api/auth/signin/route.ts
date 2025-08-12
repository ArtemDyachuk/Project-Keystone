import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";
import { setAuthCookies } from "../../../../lib/auth-cookies";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

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
