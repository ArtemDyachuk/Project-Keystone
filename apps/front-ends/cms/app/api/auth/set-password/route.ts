import { NextRequest, NextResponse } from "next/server";
import { createFirebaseAuthClient } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: "New password is required" },
        { status: 400 }
      );
    }

    const authClient = createFirebaseAuthClient();

    // Update password using Firebase
    await authClient.updatePassword(newPassword);

    return NextResponse.json({ 
      success: true,
      message: "Password updated successfully."
    });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update password" },
      { status: 400 }
    );
  }
}
