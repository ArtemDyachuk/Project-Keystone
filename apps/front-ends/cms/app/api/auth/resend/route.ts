import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const authClient = createFirebaseAuthClient();

    // Resend verification email using Firebase
    await authClient.resendVerificationEmail();

    return NextResponse.json({ 
      success: true,
      message: "Verification email resent successfully. Please check your email."
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to resend verification email" },
      { status: 400 }
    );
  }
}
