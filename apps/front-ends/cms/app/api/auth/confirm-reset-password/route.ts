import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig, CognitoAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, confirmationCode, newPassword } = await request.json();

    const config = await getCognitoConfig();
    const authClient = new CognitoAuthClient(config);

    await authClient.confirmForgotPassword({
      email,
      confirmationCode,
      newPassword,
    });

    return NextResponse.json({ 
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Confirm reset password error:", error);
    
    // Handle specific Cognito errors with user-friendly messages
    let errorMessage = "Failed to reset password";
    
    if (error instanceof Error) {
      if (error.message.includes("CodeMismatchException")) {
        errorMessage = "Invalid verification code. Please check the code from your email.";
      } else if (error.message.includes("ExpiredCodeException")) {
        errorMessage = "Verification code has expired. Please request a new one.";
      } else if (error.message.includes("UserNotFoundException")) {
        errorMessage = "User not found. Please check your email address.";
      } else if (error.message.includes("InvalidPasswordException")) {
        errorMessage = "Password does not meet requirements.";
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}
