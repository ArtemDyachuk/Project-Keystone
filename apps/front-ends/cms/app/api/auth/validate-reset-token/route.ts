import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { oobCode } = await request.json();

    if (!oobCode) {
      return NextResponse.json(
        { success: false, error: "Reset code is required" },
        { status: 400 }
      );
    }

    // For Firebase, the oobCode (out-of-band code) is validated
    // when the user actually tries to reset their password.
    // This route can be used to pre-validate the code format.
    
    // Basic validation: oobCode should be a non-empty string
    if (typeof oobCode !== "string" || oobCode.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid reset code format" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Reset code format is valid. You can now proceed with password reset.",
      oobCode: oobCode
    });
  } catch (error) {
    console.error("Validate reset token error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to validate reset code" },
      { status: 400 }
    );
  }
}
