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
    await authClient.forgotPassword({ email });
    
    // Firebase sends the reset email automatically, but we can also provide a custom link
    console.log("📧 Password reset email sent via Firebase to:", email);

    return NextResponse.json({ 
      success: true,
      message: "Password reset email sent successfully. Please check your email for the reset link.",
      note: "Firebase automatically sends a reset link to your email address."
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to send reset email" },
      { status: 400 }
    );
  }
}
