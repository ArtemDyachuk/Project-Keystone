import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Since auth is temporarily disabled, return an error
    throw new Error("Cognito not configured - auth temporarily disabled");

    // Original code commented out:
    // const { email } = await request.json();
    // const config = await getCognitoConfig();
    // const authClient = new CognitoAuthClient(config);
    // await authClient.forgotPassword({ email });
    // const resetToken = generateResetToken(email);
    // ... rest of the logic
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send reset email" },
      { status: 400 }
    );
  }
}
