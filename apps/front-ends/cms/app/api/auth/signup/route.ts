import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, firstName, lastName } = await request.json();

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    const result = await authClient.signUp({
      email,
      password: "TempPassword123!", // Will be changed after confirmation
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
