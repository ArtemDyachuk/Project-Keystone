import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { oobCode, newPassword } = await request.json();

    if (!oobCode || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Reset code and new password are required" },
        { status: 400 }
      );
    }

    const authClient = createFirebaseAuthClient();

    // Confirm password reset using Firebase
    await authClient.confirmPasswordReset({ oobCode, newPassword });

    return NextResponse.json({ 
      success: true,
      message: "Password reset successfully. You can now sign in with your new password."
    });
  } catch (error) {
    console.error("Confirm reset password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to reset password" },
      { status: 400 }
    );
  }
}
