import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // Since auth is temporarily disabled, return an error
    throw new Error("Cognito not configured - auth temporarily disabled");

    // Original code commented out:
    // const { token } = await request.json();
    // if (!token) {
    //   return NextResponse.json(
    //     { success: false, error: "Token is required" },
    //     { status: 400 }
    //   );
    // }
    // const decoded = verifyResetToken(token);
    // return NextResponse.json({ 
    //   success: true,
    //   email: decoded.email,
    //   message: "Token is valid"
    // });
  } catch (error) {
    console.error("Token validation error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Invalid token" 
      },
      { status: 400 }
    );
  }
}
