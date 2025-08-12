import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    const tokens = await authClient.signIn({
      email,
      password,
    });

    return NextResponse.json({ 
      success: true,
      tokens,
      message: "Login successful"
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Login failed" },
      { status: 400 }
    );
  }
}
