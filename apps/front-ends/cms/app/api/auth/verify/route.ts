import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Since auth is temporarily disabled, return an error
    throw new Error("Cognito not configured - auth temporarily disabled");

    // Original code commented out:
    // const { username, confirmationCode } = await request.json();
    // const config = await getCognitoConfig();
    // const authClient = new CognitoAuthClient(config);
    // await authClient.confirmSignUp({
    //   username,
    //   confirmationCode,
    // });
    // return NextResponse.json({ 
    //   success: true,
    //   message: "Email verified successfully"
    // });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Verification failed" },
      { status: 400 }
    );
  }
}
