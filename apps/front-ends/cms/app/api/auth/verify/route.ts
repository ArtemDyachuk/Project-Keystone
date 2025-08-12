import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, confirmationCode } = await request.json();

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    await authClient.confirmSignUp({
      username,
      confirmationCode,
    });

    return NextResponse.json({ 
      success: true,
      message: "Email verified successfully"
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Verification failed" },
      { status: 400 }
    );
  }
}
