import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // Since auth is temporarily disabled, return an error
    throw new Error("Cognito not configured - auth temporarily disabled");

    // Original code commented out:
    // const { email, firstName, lastName, password } = await request.json();
    // const config = await getCognitoConfig();
    // const authClient = new CognitoAuthClient(config);
    // const result = await authClient.signUp({
    //   email,
    //   password,
    //   givenName: firstName,
    //   familyName: lastName,
    // });
    // return NextResponse.json({
    //   success: true,
    //   userSub: result.userSub,
    //   username: result.username
    // });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Signup failed" },
      { status: 400 }
    );
  }
}
