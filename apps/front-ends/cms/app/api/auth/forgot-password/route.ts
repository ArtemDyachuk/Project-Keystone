import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient, generateResetToken } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    // Step 1: Trigger Cognito forgot password (sends 6-digit code via email)
    await authClient.forgotPassword({ email });

    // Step 2: Generate our custom JWT reset token
    const resetToken = generateResetToken(email);
    
    // Step 3: Create the reset link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // In a real app, you'd send a custom email with the reset link
    // For now, we'll return both the link and mention the 6-digit code
    console.log("🔗 Password Reset Link:", resetLink);
    console.log("📧 User will also receive a 6-digit code via AWS Cognito email");

    return NextResponse.json({ 
      success: true,
      message: "Password reset initiated successfully",
      resetLink, // In development, we'll show this to the user
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send reset email" },
      { status: 400 }
    );
  }
}
