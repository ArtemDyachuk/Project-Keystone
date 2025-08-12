import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName, password } = await request.json();

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    const result = await authClient.signUp({
      email,
      password, // Use the provided temporary password
      givenName: firstName,
      familyName: lastName,
    });

    return NextResponse.json({
      success: true,
      userSub: result.userSub,
      username: result.username
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Signup failed" },
      { status: 400 }
    );
  }
}
