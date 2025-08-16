import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "../../../../../../../packages/auth/dist/firebase";

export async function POST(request: NextRequest) {
  try {
    const { email, confirmationCode } = await request.json();

    if (!email || !confirmationCode) {
      return NextResponse.json(
        { success: false, error: "Email and confirmation code are required" },
        { status: 400 }
      );
    }

    const authClient = createFirebaseAuthClient();

    // For Firebase, email verification is typically handled automatically
    // when users click the link in their email. This route can be used
    // to check verification status or handle custom verification flows.
    
    // Check if user's email is verified
    const isVerified = authClient.isEmailVerified();
    
    if (isVerified) {
      return NextResponse.json({ 
        success: true,
        message: "Email is already verified."
      });
    } else {
      return NextResponse.json({ 
        success: false,
        error: "Email not verified. Please check your email and click the verification link."
      });
    }
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to verify email" },
      { status: 400 }
    );
  }
}
